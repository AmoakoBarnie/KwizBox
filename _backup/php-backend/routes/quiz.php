<?php
/**
 * Quiz Routes — pack, submit, check, leaderboard, progress.
 */

require_once __DIR__ . '/../includes/Scoring.php';
require_once __DIR__ . '/../includes/QuestionTypes.php';

class QuizRoutes
{
    /**
     * POST /quiz/check — check a single answer (no scoring).
     */
    public function check(array $body): void
    {
        $questionId = (int)($body['question_id'] ?? 0);
        $selectedIndex = (int)($body['selected_index'] ?? -1);

        $q = Database::fetchOne(
            'SELECT id, answer_index, explanation FROM questions WHERE id = ?',
            [$questionId]
        );

        if (!$q) {
            Response::error('Question not found', 404);
        }

        $isCorrect = $selectedIndex === (int)$q['answer_index'];

        Response::json([
            'question_id'    => (int)$q['id'],
            'selected_index' => $selectedIndex,
            'correct_index'  => (int)$q['answer_index'],
            'is_correct'     => $isCorrect,
            'explanation'    => $q['explanation'] ?: null,
        ]);
    }

    /**
     * POST /quiz/pack — build a question pool.
     */
    public function pack(array $body): void
    {
        $classLevel = trim((string)($body['class_level'] ?? ''));
        $subject = trim((string)($body['subject'] ?? 'Mixed'));
        $difficulty = trim((string)($body['difficulty'] ?? ''));
        $topic = trim((string)($body['topic'] ?? ''));
        $subTopic = trim((string)($body['sub_topic'] ?? ''));
        $count = max(1, min(50, (int)($body['count'] ?? 10)));
        $daily = !empty($body['daily']);
        $excludeIds = array_map('intval', (array)($body['exclude_ids'] ?? []));

        if ($classLevel === '') {
            Response::error('class_level is required', 400);
        }

        // Build pool query
        $where = ['class_level = ?', 'is_active = 1'];
        $params = [$classLevel];

        if ($subject !== '' && $subject !== 'Mixed') {
            $where[] = 'subject = ?';
            $params[] = $subject;
        }
        if ($difficulty !== '') {
            $where[] = 'difficulty = ?';
            $params[] = $difficulty;
        }
        if ($topic !== '') {
            $where[] = 'topic = ?';
            $params[] = $topic;
        }
        if ($subTopic !== '') {
            $where[] = 'sub_topic = ?';
            $params[] = $subTopic;
        }

        $sql = 'SELECT id FROM questions WHERE ' . implode(' AND ', $where);
        $poolIds = array_map('intval', array_column(Database::fetchAll($sql, $params), 'id'));

        // Exclude already-answered IDs
        if (!empty($excludeIds)) {
            $poolIds = array_values(array_diff($poolIds, $excludeIds));
        }

        // Filter out legacy duplicates (id >= 130570 and id < 100000)
        $poolIds = array_values(array_filter($poolIds, fn($id) => $id >= 100000 || $id < 130570));

        if (empty($poolIds)) {
            Response::error('No questions found for this selection', 404);
        }

        $user = AuthHelper::currentUser();
        $userId = $user ? (int)$user['sub'] : null;

        // Select IDs
        $chosenIds = $this->selectPackIds($poolIds, $count, $daily, $userId);

        // Fetch the questions
        $placeholders = implode(',', array_fill(0, count($chosenIds), '?'));
        $questions = Database::fetchAll(
            "SELECT * FROM questions WHERE id IN ($placeholders)",
            $chosenIds
        );

        // Preserve chosen order
        $byId = [];
        foreach ($questions as $q) {
            $byId[(int)$q['id']] = $q;
        }

        $out = [];
        foreach ($chosenIds as $id) {
            if (!isset($byId[$id])) continue;
            $out[] = $this->toQuestionOut($byId[$id]);
        }

        $questionIds = array_map('intval', $chosenIds);

        // For authenticated users: open a session and set headers
        if ($userId !== null) {
            $sessionId = Database::execute(
                "INSERT INTO quiz_sessions (user_id, class_level, subject, difficulty, topic, status, started_at) VALUES (?, ?, ?, ?, ?, 'active', NOW())",
                [$userId, $classLevel, $subject, $difficulty ?: null, $topic ?: null]
            );

            header('X-Session-Id: ' . $sessionId);
            header('X-Question-Ids: ' . implode(', ', $questionIds));
        }

        Response::json($out);
    }

    /**
     * POST /quiz/submit — grade a finished session.
     */
    public function submit(array $body): void
    {
        $questionIds = array_map('intval', (array)($body['question_ids'] ?? []));
        $answers = (array)($body['answers'] ?? []);
        $classLevel = trim((string)($body['class_level'] ?? ''));
        $subject = trim((string)($body['subject'] ?? 'Mixed'));
        $difficulty = trim((string)($body['difficulty'] ?? ''));
        $topic = trim((string)($body['topic'] ?? ''));
        $durationSeconds = isset($body['duration_seconds']) ? (int)$body['duration_seconds'] : null;
        $daily = !empty($body['daily']);

        // Validate: question_ids must match answer question_ids
        $ansQids = [];
        foreach ($answers as $ans) {
            $ansQids[] = (int)($ans['question_id'] ?? 0);
        }
        sort($ansQids);
        sort($questionIds);

        if ($ansQids !== $questionIds) {
            Response::error('question_ids must match answer question_ids', 400);
        }

        // Fetch questions
        $questions = [];
        if (!empty($questionIds)) {
            $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
            $rows = Database::fetchAll("SELECT * FROM questions WHERE id IN ($placeholders)", $questionIds);
            foreach ($rows as $q) {
                $questions[(int)$q['id']] = $q;
            }
        }

        $total = count($answers);
        $correct = 0;
        $score = 0;
        $feedback = [];
        $perDiff = [];
        $perQuestionPoints = [];

        $runningStreak = 0;

        foreach ($answers as $ans) {
            $qid = (int)($ans['question_id'] ?? 0);
            $selectedIndex = (int)($ans['selected_index'] ?? -1);
            $secondsTaken = isset($ans['seconds_taken']) ? (float)$ans['seconds_taken'] : null;

            if (!isset($questions[$qid])) {
                continue;
            }

            $q = $questions[$qid];
            $isCorrect = $selectedIndex === (int)$q['answer_index'];
            $pts = 0;

            if ($isCorrect) {
                $correct++;
                $runningStreak++;
                $pts = questionPoints($q['difficulty'], $secondsTaken, $runningStreak);
                $score += $pts;
                $perDiff[$q['difficulty']] = ($perDiff[$q['difficulty']] ?? 0) + $pts;
            } else {
                $runningStreak = 0;
            }

            $perQuestionPoints[] = ['question_id' => $qid, 'points' => $pts];

            // Update question usage stats
            Database::execute(
                'UPDATE questions SET times_answered = times_answered + 1' . ($isCorrect ? ', times_correct = times_correct + 1' : '') . ' WHERE id = ?',
                [$qid]
            );

            $feedback[] = [
                'question_id'    => $qid,
                'selected_index' => $selectedIndex,
                'correct_index'  => (int)$q['answer_index'],
                'is_correct'     => $isCorrect,
                'explanation'    => $q['explanation'] ?: null,
                'question'       => $q['question'],
                'options'        => publicOptions($q['question_type'], $q['option_a'], $q['option_b'], $q['option_c'], $q['option_d']),
                'points'         => $pts,
            ];
        }

        $accuracy = $total > 0 ? round($correct / $total, 4) : 0.0;

        $user = AuthHelper::currentUser();
        $userId = $user ? (int)$user['sub'] : null;

        $sessionId = null;

        if ($userId !== null) {
            // Complete most recent active session or create new
            $sess = Database::fetchOne(
                "SELECT id FROM quiz_sessions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
                [$userId]
            );

            if ($sess) {
                $sessionId = (int)$sess['id'];
                Database::execute(
                    "UPDATE quiz_sessions SET class_level = ?, subject = ?, difficulty = ?, topic = ?, total = ?, correct = ?, score = ?, accuracy = ?, duration_seconds = ?, status = 'completed', ended_at = NOW(), is_daily = ? WHERE id = ?",
                    [$classLevel, $subject, $difficulty ?: null, $topic ?: null, $total, $correct, $score, $accuracy, $durationSeconds, $daily ? 1 : 0, $sessionId]
                );
            } else {
                $sessionId = Database::execute(
                    "INSERT INTO quiz_sessions (user_id, class_level, subject, difficulty, topic, total, correct, score, accuracy, duration_seconds, status, started_at, ended_at, is_daily) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW(), ?)",
                    [$userId, $classLevel, $subject, $difficulty ?: null, $topic ?: null, $total, $correct, $score, $accuracy, $durationSeconds, $daily ? 1 : 0]
                );
            }

            // Get full user row
            $userRow = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);

            // Update progress
            $newStreak = $this->updateProgress($userRow, $body, $questions, $answers, $score);

            // Mark seen
            $this->markSeen($userId, $questionIds);
        } else {
            $newStreak = 0;
        }

        Response::json([
            'session_id'           => $sessionId ?: 0,
            'total'                => $total,
            'correct'              => $correct,
            'accuracy'             => $accuracy,
            'score'                => $score,
            'streak'               => $newStreak,
            'points_breakdown'     => $perDiff,
            'feedback'             => $feedback,
            'points_breakdown_list'=> $perQuestionPoints,
        ]);
    }

    /**
     * GET /quiz/leaderboard
     */
    public function leaderboard(): void
    {
        $get = queryParams();
        $scope = trim((string)($get['scope'] ?? 'global'));
        $classLevel = isset($get['class_level']) ? trim((string)$get['class_level']) : null;
        $schoolCode = isset($get['school_code']) ? trim((string)$get['school_code']) : null;
        $limit = max(1, min(100, (int)($get['limit'] ?? 50)));

        if ($scope === 'weekly' || $scope === 'monthly') {
            $kind = $scope === 'weekly' ? 'weekly' : 'monthly';
            $period = $scope === 'weekly' ? weekPeriod() : monthPeriod();

            $sql = "SELECT u.id, u.nickname, u.class_level, u.total_questions, u.total_correct, lp.points
                    FROM users u
                    JOIN leaderboard_periods lp ON lp.user_id = u.id
                    WHERE lp.kind = ? AND lp.period = ? AND u.is_guest = 0";
            $params = [$kind, $period];

            if ($classLevel) {
                $sql .= ' AND u.class_level = ?';
                $params[] = $classLevel;
            }

            $sql .= ' ORDER BY lp.points DESC LIMIT ?';
            $params[] = $limit;

            $rows = Database::fetchAll($sql, $params);

            $out = [];
            $rank = 1;
            foreach ($rows as $u) {
                $acc = round(($u['total_correct'] ?? 0) / max(1, $u['total_questions'] ?? 1), 4);
                $out[] = [
                    'rank'            => $rank++,
                    'nickname'        => $u['nickname'],
                    'class_level'     => $u['class_level'],
                    'lifetime_score'  => (int)$u['points'],
                    'total_questions' => (int)$u['total_questions'],
                    'accuracy'        => $acc,
                    'is_guest'        => (bool)$u['is_guest'],
                ];
            }
            Response::json($out);
        }

        // Global / class / school
        $sql = "SELECT id, nickname, class_level, total_questions, total_correct, lifetime_score, is_guest FROM users WHERE is_guest = 0";
        $params = [];

        if ($scope === 'class' && $classLevel) {
            $sql .= ' AND class_level = ?';
            $params[] = $classLevel;
        } elseif ($scope === 'school' && $schoolCode) {
            $sql .= ' AND school_code = ?';
            $params[] = $schoolCode;
        }

        $sql .= ' AND lifetime_score > 0 ORDER BY lifetime_score DESC LIMIT ?';
        $params[] = $limit;

        $rows = Database::fetchAll($sql, $params);

        $out = [];
        $rank = 1;
        foreach ($rows as $u) {
            $acc = round(($u['total_correct'] ?? 0) / max(1, $u['total_questions'] ?? 1), 4);
            $out[] = [
                'rank'            => $rank++,
                'nickname'        => $u['nickname'],
                'class_level'     => $u['class_level'],
                'lifetime_score'  => (int)$u['lifetime_score'],
                'total_questions' => (int)$u['total_questions'],
                'accuracy'        => $acc,
                'is_guest'        => (bool)$u['is_guest'],
            ];
        }
        Response::json($out);
    }

    /**
     * GET /quiz/progress — detailed progress (auth required).
     */
    public function progress(): void
    {
        $user = AuthHelper::requireAuth();
        $userId = (int)$user['sub'];

        $userRow = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$userRow) {
            Response::error('User not found', 404);
        }

        // Overall
        $overall = [
            'lifetime_score'  => (int)$userRow['lifetime_score'],
            'total_questions' => (int)$userRow['total_questions'],
            'total_correct'   => (int)$userRow['total_correct'],
            'accuracy'        => $userRow['total_questions'] > 0
                ? round($userRow['total_correct'] / $userRow['total_questions'], 4)
                : 0.0,
            'current_streak'  => (int)$userRow['current_streak'],
            'longest_streak'  => (int)$userRow['longest_streak'],
            'last_played'     => $userRow['last_played'],
        ];

        // Subject progress
        $subjects = Database::fetchAll(
            'SELECT class_level, subject, questions_answered, correct FROM subject_progress WHERE user_id = ? ORDER BY class_level, subject',
            [$userId]
        );

        // Topic progress
        $topics = Database::fetchAll(
            'SELECT class_level, subject, topic, questions_answered, correct, mastery_score, mastered FROM topic_progress WHERE user_id = ? ORDER BY class_level, subject, topic',
            [$userId]
        );

        Response::json([
            'overall' => $overall,
            'subjects' => $subjects,
            'topics'  => $topics,
        ]);
    }

    // ─────────── HELPERS ───────────

    private function toQuestionOut(array $q): array
    {
        return [
            'id'            => (int)$q['id'],
            'class_level'   => $q['class_level'],
            'subject'       => $q['subject'],
            'topic'         => $q['topic'],
            'sub_topic'     => $q['sub_topic'] ?? null,
            'strand'        => $q['strand'],
            'difficulty'    => $q['difficulty'],
            'question'      => $q['question'],
            'options'       => publicOptions($q['question_type'], $q['option_a'], $q['option_b'], $q['option_c'], $q['option_d']),
            'question_type' => $q['question_type'] ?? 'mcq',
            'image_url'     => $q['image_url'] ?? null,
        ];
    }

    private function selectPackIds(array $poolIds, int $count, bool $daily, ?int $userId): array
    {
        if ($daily) {
            // Deterministic daily seed
            $seed = (int)gmdate('Ymd');
            mt_srand($seed);
            $pool = $poolIds;
            shuffle($pool);
            mt_srand(); // reset
            return array_slice($pool, 0, $count);
        }

        if ($userId === null) {
            // Guest: random sample
            shuffle($poolIds);
            return array_slice($poolIds, 0, $count);
        }

        // Authenticated: prefer unseen
        $placeholders = implode(',', array_fill(0, count($poolIds), '?'));
        $seenRows = Database::fetchAll(
            "SELECT question_id, seen_at FROM user_question_seen WHERE user_id = ? AND question_id IN ($placeholders)",
            array_merge([$userId], $poolIds)
        );

        $seenIds = [];
        $seenOldestFirst = [];
        foreach ($seenRows as $r) {
            $seenIds[(int)$r['question_id']] = true;
            $seenOldestFirst[] = (int)$r['question_id'];
        }

        // Sort seen oldest-first
        usort($seenOldestFirst, function($a, $b) use ($seenRows) {
            $ta = $tb = '';
            foreach ($seenRows as $r) {
                if ((int)$r['question_id'] === $a) $ta = $r['seen_at'];
                if ((int)$r['question_id'] === $b) $tb = $r['seen_at'];
            }
            return strcmp($ta, $tb);
        });

        $unseen = array_values(array_diff($poolIds, array_keys($seenIds)));
        shuffle($unseen);

        $chosen = array_slice($unseen, 0, $count);

        if (count($chosen) < $count) {
            $need = $count - count($chosen);
            $chosenSet = array_flip($chosen);
            $recycle = array_values(array_diff($seenOldestFirst, $chosenSet));
            shuffle($recycle);
            $chosen = array_merge($chosen, array_slice($recycle, 0, $need));
        }

        shuffle($chosen);
        return $chosen;
    }

    private function markSeen(int $userId, array $questionIds): void
    {
        if (empty($questionIds)) return;

        $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
        $existing = Database::fetchAll(
            "SELECT question_id FROM user_question_seen WHERE user_id = ? AND question_id IN ($placeholders)",
            array_merge([$userId], $questionIds)
        );
        $existingIds = array_map('intval', array_column($existing, 'question_id'));

        foreach ($questionIds as $qid) {
            if (!in_array($qid, $existingIds, true)) {
                Database::execute(
                    'INSERT INTO user_question_seen (user_id, question_id) VALUES (?, ?)',
                    [$userId, $qid]
                );
            }
        }
    }

    private function updateProgress(array $userRow, array $body, array $questions, array $answers, int $score): int
    {
        $userId = (int)$userRow['id'];
        $classLevel = trim((string)($body['class_level'] ?? ''));

        // 1. Overall
        $lifetimeScore = (int)$userRow['lifetime_score'] + $score;
        $totalQuestions = (int)$userRow['total_questions'] + count($answers);
        $totalCorrect = (int)$userRow['total_correct'];
        foreach ($answers as $ans) {
            $qid = (int)($ans['question_id'] ?? 0);
            if (isset($questions[$qid]) && (int)$ans['selected_index'] === (int)$questions[$qid]['answer_index']) {
                $totalCorrect++;
            }
        }

        // Streak
        $today = new DateTime('now', new DateTimeZone('UTC'));
        $todayStr = $today->format('Y-m-d');
        $lastPlayed = $userRow['last_played'] ? new DateTime($userRow['last_played']) : null;
        $currentStreak = (int)$userRow['current_streak'];
        $longestStreak = (int)$userRow['longest_streak'];

        if ($lastPlayed === null || $lastPlayed->format('Y-m-d') < $todayStr) {
            if ($lastPlayed !== null) {
                $diff = (int)$lastPlayed->diff($today)->format('%a');
                if ($diff === 1) {
                    $currentStreak++;
                } else {
                    $currentStreak = 1;
                }
            } else {
                $currentStreak = 1;
            }
            $longestStreak = max($longestStreak, $currentStreak);
        }

        Database::execute(
            'UPDATE users SET lifetime_score = ?, total_questions = ?, total_correct = ?, current_streak = ?, longest_streak = ?, last_played = NOW() WHERE id = ?',
            [$lifetimeScore, $totalQuestions, $totalCorrect, $currentStreak, $longestStreak, $userId]
        );

        // 2 & 3. Subject + topic counts
        $subjCounts = [];
        $topicCounts = [];

        foreach ($answers as $ans) {
            $qid = (int)($ans['question_id'] ?? 0);
            if (!isset($questions[$qid])) continue;
            $q = $questions[$qid];
            $isCorrect = (int)$ans['selected_index'] === (int)$q['answer_index'];

            $subj = $q['subject'];
            if (!isset($subjCounts[$subj])) $subjCounts[$subj] = [0, 0];
            $subjCounts[$subj][0]++;
            if ($isCorrect) $subjCounts[$subj][1]++;

            $key = $subj . '|' . $q['topic'];
            if (!isset($topicCounts[$key])) $topicCounts[$key] = [0, 0, $subj, $q['topic']];
            $topicCounts[$key][0]++;
            if ($isCorrect) $topicCounts[$key][1]++;
        }

        // Upsert subject progress
        foreach ($subjCounts as $subj => [$answered, $correct]) {
            $existing = Database::fetchOne(
                'SELECT id, questions_answered, correct FROM subject_progress WHERE user_id = ? AND class_level = ? AND subject = ?',
                [$userId, $classLevel, $subj]
            );
            if ($existing) {
                Database::execute(
                    'UPDATE subject_progress SET questions_answered = ?, correct = ? WHERE id = ?',
                    [(int)$existing['questions_answered'] + $answered, (int)$existing['correct'] + $correct, (int)$existing['id']]
                );
            } else {
                Database::execute(
                    'INSERT INTO subject_progress (user_id, class_level, subject, questions_answered, correct) VALUES (?, ?, ?, ?, ?)',
                    [$userId, $classLevel, $subj, $answered, $correct]
                );
            }
        }

        // Upsert topic progress
        foreach ($topicCounts as [$answered, $correct, $subj, $topic]) {
            $existing = Database::fetchOne(
                'SELECT id, questions_answered, correct FROM topic_progress WHERE user_id = ? AND class_level = ? AND subject = ? AND topic = ?',
                [$userId, $classLevel, $subj, $topic]
            );
            if ($existing) {
                $newAnswered = (int)$existing['questions_answered'] + $answered;
                $newCorrect = (int)$existing['correct'] + $correct;
                $acc = $newAnswered > 0 ? $newCorrect / $newAnswered : 0.0;
                $mastery = calculateMastery($acc, $newAnswered);
                $mastered = isMastered($acc, $newAnswered);
                Database::execute(
                    'UPDATE topic_progress SET questions_answered = ?, correct = ?, mastery_score = ?, mastered = ? WHERE id = ?',
                    [$newAnswered, $newCorrect, $mastery, $mastered ? 1 : 0, (int)$existing['id']]
                );
            } else {
                $acc = $answered > 0 ? $correct / $answered : 0.0;
                $mastery = calculateMastery($acc, $answered);
                $mastered = isMastered($acc, $answered);
                Database::execute(
                    'INSERT INTO topic_progress (user_id, class_level, subject, topic, questions_answered, correct, mastery_score, mastered) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [$userId, $classLevel, $subj, $topic, $answered, $correct, $mastery, $mastered ? 1 : 0]
                );
            }
        }

        // 4 & 5. Award period points
        $this->addPeriodPoints($userId, 'weekly', weekPeriod(), $score);
        $this->addPeriodPoints($userId, 'monthly', monthPeriod(), $score);

        return $currentStreak;
    }

    private function addPeriodPoints(int $userId, string $kind, string $period, int $delta): void
    {
        $existing = Database::fetchOne(
            'SELECT id, points FROM leaderboard_periods WHERE user_id = ? AND kind = ? AND period = ?',
            [$userId, $kind, $period]
        );
        if ($existing) {
            Database::execute(
                'UPDATE leaderboard_periods SET points = ? WHERE id = ?',
                [(int)$existing['points'] + $delta, (int)$existing['id']]
            );
        } else {
            Database::execute(
                'INSERT INTO leaderboard_periods (user_id, kind, period, points) VALUES (?, ?, ?, ?)',
                [$userId, $kind, $period, $delta]
            );
        }
    }
}

$routes = [
    ['POST', 'check',      [QuizRoutes::class, 'check']],
    ['POST', 'pack',       [QuizRoutes::class, 'pack']],
    ['POST', 'submit',     [QuizRoutes::class, 'submit']],
    ['GET',  'leaderboard',[QuizRoutes::class, 'leaderboard']],
    ['GET',  'progress',   [QuizRoutes::class, 'progress']],
];
