<?php
/**
 * Admin API Routes — KwizBox PHP Backend
 * 
 * Secure, role-based admin management panel. All endpoints (except POST /token)
 * require a valid admin JWT and the appropriate permission scope. Every mutating
 * action writes an audit_logs row.
 *
 * Route format: [method, 'pattern/:param', handler]
 * Handler target: [AdminRoutes::class, 'methodName']
 */

require_once __DIR__ . '/../includes/Auth.php';
require_once __DIR__ . '/../includes/Database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/QuestionTypes.php';

// ═══════════════════════════════════════════════════════════════
// Role → permission matrix (mirrors ROLE_PERMISSIONS in models.py)
// ═══════════════════════════════════════════════════════════════
const ROLE_PERMISSIONS = [
    'super_admin'       => ['users', 'questions', 'schools', 'leaderboard', 'monitor', 'settings', 'export', 'audit'],
    'question_manager' => ['questions', 'leaderboard', 'monitor'],
    'school_manager'    => ['schools', 'users', 'leaderboard', 'monitor'],
    'moderator'         => ['users', 'leaderboard', 'monitor'],
];

const ADMIN_ROLES = ['super_admin', 'question_manager', 'school_manager', 'moderator'];

// Default system settings (match schema.sql inserts)
const DEFAULT_SETTINGS = [
    'game_duration_seconds' => '600',
    'questions_per_game'    => '12',
    'scoring_base_easy'     => '5',
    'scoring_base_medium'   => '10',
    'scoring_base_hard'     => '15',
    'maintenance_mode'      => 'false',
    'registration_open'       => 'true',
    'max_class_level'       => 'B9',
];

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

/** Write an audit_logs row. */
function auditLog(int $adminId, string $adminUsername, string $action, ?string $target = null, ?string $detail = null): void
{
    Database::execute(
        "INSERT INTO audit_logs (admin_id, admin_username, action, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
        [$adminId, $adminUsername, $action, $target, $detail, $_SERVER['REMOTE_ADDR'] ?? null]
    );
}

/** Resolve the current admin from the bearer token. Returns row array or sends 401. */
function currentAdmin(): array
{
    $payload = AuthHelper::currentUser();
    if (!$payload || empty($payload['admin'])) {
        Response::error('Admin authentication required', 401);
    }
    $admin = Database::fetchOne("SELECT * FROM admin_users WHERE id = ?", [$payload['sub']]);
    if (!$admin) {
        Response::error('Admin account not found', 401);
    }
    return $admin;
}

/** Require a specific permission scope. Returns the admin row or sends 403. */
function requirePermission(array $admin, string $perm): array
{
    $role = $admin['role'] ?? 'moderator';
    $perms = ROLE_PERMISSIONS[$role] ?? [];
    if (!in_array($perm, $perms, true)) {
        Response::error('Insufficient permissions', 403);
    }
    return $admin;
}

/** Shape a question row for API output. */
function questionOut(array $q): array
{
    $opts = publicOptions($q['question_type'], $q['option_a'], $q['option_b'], $q['option_c'], $q['option_d']);
    $answered = (int)($q['times_answered'] ?? 0);
    $correct  = (int)($q['times_correct'] ?? 0);
    return [
        'id'              => (int)$q['id'],
        'class_level'     => $q['class_level'],
        'subject'         => $q['subject'],
        'topic'           => $q['topic'],
        'sub_topic'       => $q['sub_topic'] ?? null,
        'strand'          => $q['strand'],
        'difficulty'      => $q['difficulty'],
        'question'        => $q['question'],
        'options'         => $opts,
        'answer_index'    => (int)$q['answer_index'],
        'explanation'     => $q['explanation'],
        'is_active'       => (bool)$q['is_active'],
        'times_answered'  => $answered,
        'times_correct'   => $correct,
        'correct_rate'    => $answered > 0 ? round($correct / $answered, 4) : null,
        'question_type'   => $q['question_type'] ?? MCQ,
        'image_url'       => $q['image_url'] ?? null,
    ];
}

// ═══════════════════════════════════════════════════════════════
// Route handlers
// ═══════════════════════════════════════════════════════════════

class AdminRoutes
{
    // ──────────────────────────────────────── AUTH ─────────────

    /** POST /admin/token — admin login. No auth required. */
    public static function login(): never
    {
        $body = requestBody();
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if ($username === '' || $password === '') {
            Response::error('username and password are required', 400);
        }

        $admin = Database::fetchOne("SELECT * FROM admin_users WHERE username = ?", [$username]);
        if (!$admin || !(int)$admin['is_active'] || !AuthHelper::verifyPassword($password, $admin['password_hash'])) {
            Response::error('Invalid admin credentials', 401);
        }

        // Update last_login
        Database::execute("UPDATE admin_users SET last_login = NOW() WHERE id = ?", [$admin['id']]);

        $token = AuthHelper::createAdminToken((int)$admin['id']);
        Response::json([
            'access_token' => $token,
            'role'         => $admin['role'],
            'username'     => $admin['username'],
            'full_name'    => $admin['full_name'],
        ]);
    }

    /** POST /admin/logout — audit the logout event. */
    public static function logout(): never
    {
        $admin = currentAdmin();
        auditLog((int)$admin['id'], $admin['username'], 'admin.logout');
        Response::json(['detail' => 'logged out']);
    }

    /** GET /admin/me — return admin profile with permissions. */
    public static function me(): never
    {
        $admin = currentAdmin();
        $perms = ROLE_PERMISSIONS[$admin['role']] ?? [];
        Response::json([
            'id'          => (int)$admin['id'],
            'username'    => $admin['username'],
            'full_name'   => $admin['full_name'],
            'role'        => $admin['role'],
            'permissions' => array_values($perms),
            'is_active'   => (bool)$admin['is_active'],
            'last_login'  => $admin['last_login'],
        ]);
    }

    // ─────────────────────────── ADMIN MANAGEMENT ───────────────

    /** GET /admin/admins — list all admins. Requires 'users' permission. */
    public static function listAdmins(): never
    {
        $admin = requirePermission(currentAdmin(), 'users');
        $rows = Database::fetchAll("SELECT id, username, full_name, role, is_active, last_login FROM admin_users ORDER BY id");
        Response::json(array_map(fn($r) => [
            'id'         => (int)$r['id'],
            'username'   => $r['username'],
            'full_name'  => $r['full_name'],
            'role'       => $r['role'],
            'is_active'  => (bool)$r['is_active'],
            'last_login' => $r['last_login'],
        ], $rows));
    }

    /** POST /admin/admins — create new admin. Requires 'settings' permission. */
    public static function createAdmin(): never
    {
        $admin = requirePermission(currentAdmin(), 'settings');
        $body = requestBody();

        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';
        $fullName = $body['full_name'] ?? null;
        $role     = $body['role'] ?? 'moderator';

        if ($username === '' || strlen($password) < 6) {
            Response::error('username required and password must be ≥ 6 characters', 400);
        }
        if (!in_array($role, ADMIN_ROLES, true)) {
            Response::error('role must be one of: ' . implode(', ', ADMIN_ROLES), 400);
        }
        $exists = Database::fetchOne("SELECT id FROM admin_users WHERE username = ?", [$username]);
        if ($exists) {
            Response::error('username already exists', 400);
        }

        Database::execute(
            "INSERT INTO admin_users (username, full_name, password_hash, role, is_active, created_by) VALUES (?, ?, ?, ?, 1, ?)",
            [$username, $fullName, AuthHelper::hashPassword($password), $role, $admin['id']]
        );
        $id = (int)Database::lastInsertId();
        auditLog((int)$admin['id'], $admin['username'], 'admin.create', "admin:$username", "role=$role");

        Response::json(['detail' => 'ok', 'id' => $id, 'username' => $username, 'role' => $role], 201);
    }

    /** POST /admin/admins/:id/status — activate/deactivate admin. Requires 'settings'. */
    public static function setAdminStatus(int $id): never
    {
        $admin = requirePermission(currentAdmin(), 'settings');
        $body = requestBody();
        $isActive = !empty($body['is_active']);

        $target = Database::fetchOne("SELECT * FROM admin_users WHERE id = ?", [$id]);
        if (!$target) {
            Response::error('admin not found', 404);
        }

        Database::execute("UPDATE admin_users SET is_active = ? WHERE id = ?", [$isActive ? 1 : 0, $id]);
        auditLog((int)$admin['id'], $admin['username'], 'admin.status', "admin:{$target['username']}", 'active=' . ($isActive ? 'true' : 'false'));
        Response::json(['detail' => 'ok']);
    }

    // ─────────────────────────── DASHBOARD ──────────────────────

    /** GET /admin/dashboard — aggregate stats. Requires 'users' permission. */
    public static function dashboard(): never
    {
        $admin = requirePermission(currentAdmin(), 'users');
        $db = Database::connection();

        $registered    = (int)$db->query("SELECT COUNT(*) FROM users WHERE is_guest = 0")->fetchColumn();
        $dayAgo        = date('Y-m-d H:i:s', strtotime('-24 hours'));
        $activePlayers = (int)$db->query("SELECT COUNT(*) FROM users WHERE is_guest = 0 AND last_played >= " . $db->quote($dayAgo))->fetchColumn();
        $onlinePlayers = (int)$db->query("SELECT COUNT(DISTINCT user_id) FROM quiz_sessions WHERE status = 'active'")->fetchColumn();
        $totalQ        = (int)$db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
        $activeQ       = (int)$db->query("SELECT COUNT(*) FROM questions WHERE is_active = 1")->fetchColumn();
        $schools       = (int)$db->query("SELECT COUNT(*) FROM school_codes WHERE is_active = 1")->fetchColumn();
        $gamesPlayed   = (int)$db->query("SELECT COUNT(*) FROM quiz_sessions")->fetchColumn();

        $tot = (float)$db->query("SELECT COALESCE(SUM(total_questions),0) FROM users")->fetchColumn();
        $cor = (float)$db->query("SELECT COALESCE(SUM(total_correct),0) FROM users")->fetchColumn();
        $avgAcc = $tot > 0 ? round($cor / $tot, 4) : 0.0;

        // Recent activity
        $recent = [];
        foreach (Database::fetchAll("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 15") as $a) {
            $recent[] = [
                'time' => $a['created_at'],
                'text' => ($a['admin_username'] ?? 'system') . ': ' . $a['action']
                          . ($a['target'] ? " ({$a['target']})" : ''),
            ];
        }
        foreach (Database::fetchAll("SELECT * FROM users WHERE is_guest = 0 ORDER BY created_at DESC LIMIT 5") as $u) {
            $recent[] = ['time' => $u['created_at'], 'text' => "{$u['nickname']} registered"];
        }
        usort($recent, fn($a, $b) => strcmp($b['time'] ?? '', $a['time'] ?? ''));
        $recent = array_slice($recent, 0, 15);

        Response::json([
            'registered_users'  => $registered,
            'active_players'    => $activePlayers,
            'online_players'    => $onlinePlayers,
            'total_questions'   => $totalQ,
            'active_questions'  => $activeQ,
            'schools'           => $schools,
            'games_played'      => $gamesPlayed,
            'avg_accuracy'      => $avgAcc,
            'total_school_codes'=> $schools,
            'recent_activity'   => $recent,
        ]);
    }

    // ─────────────────────────── USER MANAGEMENT ────────────────

    /** GET /admin/users — list users with filters. Requires 'users' permission. */
    public static function listUsers(): never
    {
        $admin = requirePermission(currentAdmin(), 'users');
        $q = queryParams();

        $search = trim($q['search'] ?? '');
        $schoolCode = trim($q['school_code'] ?? '');
        $status = $q['status'] ?? '';
        $limit = min(500, max(1, (int)($q['limit'] ?? 100)));
        $offset = max(0, (int)($q['offset'] ?? 0));

        $where = ["is_guest = 0"];
        $params = [];
        if ($search !== '') {
            $where[] = "nickname LIKE ?";
            $params[] = "%$search%";
        }
        if ($schoolCode !== '') {
            $where[] = "school_code = ?";
            $params[] = $schoolCode;
        }

        $sql = "SELECT * FROM users WHERE " . implode(' AND ', $where) . " ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $rows = Database::fetchAll($sql, $params);

        $activeSessionIds = array_column(
            Database::fetchAll("SELECT DISTINCT user_id FROM quiz_sessions WHERE status = 'active'"),
            'user_id'
        );

        $out = [];
        foreach ($rows as $u) {
            $tot = (int)$u['total_questions'];
            $cor = (int)$u['total_correct'];
            $out[] = [
                'id'              => (int)$u['id'],
                'nickname'        => $u['nickname'],
                'class_level'     => $u['class_level'],
                'school_code'     => $u['school_code'],
                'is_guest'        => (bool)$u['is_guest'],
                'created_at'      => $u['created_at'],
                'last_played'     => $u['last_played'],
                'lifetime_score'  => (int)$u['lifetime_score'],
                'total_questions' => $tot,
                'total_correct'   => $cor,
                'accuracy'        => $tot > 0 ? round($cor / $tot, 4) : 0.0,
                'account_status'  => $u['is_active'] ? 'active' : 'disabled',
                'is_online'       => in_array((int)$u['id'], $activeSessionIds, true),
            ];
        }
        Response::json($out);
    }

    /** GET /admin/users/:id — detailed user info. Requires 'users' permission. */
    public static function userDetail(int $userId): never
    {
        $admin = requirePermission(currentAdmin(), 'users');

        $u = Database::fetchOne("SELECT * FROM users WHERE id = ? AND is_guest = 0", [$userId]);
        if (!$u) {
            Response::error('user not found', 404);
        }

        $tot = (int)$u['total_questions'];
        $cor = (int)$u['total_correct'];
        $sessions = Database::fetchAll("SELECT * FROM quiz_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [$userId]);
        $school = $u['school_code'] ? Database::fetchOne("SELECT * FROM school_codes WHERE code = ?", [$u['school_code']]) : null;

        $games = [];
        foreach ($sessions as $s) {
            $games[] = [
                'id'       => (int)$s['id'],
                'date'     => $s['ended_at'] ?? $s['created_at'],
                'score'    => (int)$s['score'],
                'total'    => (int)$s['total'],
                'correct'  => (int)$s['correct'],
                'subject'  => $s['subject'],
                'status'   => $s['status'],
                'accuracy' => (float)$s['accuracy'],
            ];
        }

        $subjRows = Database::fetchAll("SELECT * FROM subject_progress WHERE user_id = ?", [$userId]);
        $subjectAccuracy = [];
        foreach ($subjRows as $s) {
            $subjectAccuracy[] = [
                'subject'   => $s['subject'],
                'accuracy'  => (int)$s['questions_answered'] > 0
                                 ? round((int)$s['correct'] / (int)$s['questions_answered'], 4)
                                 : 0.0,
                'questions' => (int)$s['questions_answered'],
            ];
        }

        $masteredCount = (int)Database::connection()->query(
            "SELECT COUNT(*) FROM topic_progress WHERE user_id = " . (int)$userId . " AND mastered = 1"
        )->fetchColumn();

        Response::json([
            'id'               => (int)$u['id'],
            'nickname'         => $u['nickname'],
            'full_name'        => $u['full_name'],
            'class_level'      => $u['class_level'],
            'school_code'      => $u['school_code'],
            'school'           => $school ? $school['school'] : null,
            'is_guest'         => (bool)$u['is_guest'],
            'created_at'       => $u['created_at'],
            'last_played'      => $u['last_played'],
            'lifetime_score'   => (int)$u['lifetime_score'],
            'total_questions'  => $tot,
            'total_correct'    => $cor,
            'accuracy'         => $tot > 0 ? round($cor / $tot, 4) : 0.0,
            'current_streak'   => (int)$u['current_streak'],
            'longest_streak'   => (int)$u['longest_streak'],
            'account_status'   => $u['is_active'] ? 'active' : 'disabled',
            'games_played'     => count($sessions),
            'games'            => $games,
            'subject_accuracy' => $subjectAccuracy,
            'mastered_count'   => $masteredCount,
        ]);
    }

    /** POST /admin/users/:id/status — activate/deactivate user. Requires 'users' permission. */
    public static function setUserStatus(int $userId): never
    {
        $admin = requirePermission(currentAdmin(), 'users');
        $body = requestBody();
        $isActive = !empty($body['is_active']);

        $u = Database::fetchOne("SELECT * FROM users WHERE id = ? AND is_guest = 0", [$userId]);
        if (!$u) {
            Response::error('user not found', 404);
        }

        Database::execute("UPDATE users SET is_active = ? WHERE id = ?", [$isActive ? 1 : 0, $userId]);
        auditLog((int)$admin['id'], $admin['username'], 'user.status', "user:$userId", 'active=' . ($isActive ? 'true' : 'false'));

        Response::json(['detail' => 'ok', 'account_status' => $isActive ? 'active' : 'disabled']);
    }

    // ─────────────────────────── QUESTION MANAGEMENT ────────────

    /** GET /admin/questions — list with filters. Requires 'questions' permission. */
    public static function listQuestions(): never
    {
        $admin = requirePermission(currentAdmin(), 'questions');
        $q = queryParams();

        $where = [];
        $params = [];

        $search = trim($q['search'] ?? '');
        if ($search !== '') {
            $where[] = "question LIKE ?";
            $params[] = "%$search%";
        }
        if (!empty($q['class_level']))    { $where[] = "class_level = ?";  $params[] = $q['class_level']; }
        if (!empty($q['subject']))         { $where[] = "subject = ?";      $params[] = $q['subject']; }
        if (!empty($q['difficulty']))      { $where[] = "difficulty = ?";   $params[] = $q['difficulty']; }
        if (!empty($q['question_type']))  { $where[] = "question_type = ?";$params[] = $q['question_type']; }
        if (isset($q['is_active']))       { $where[] = "is_active = ?";    $params[] = (int)$q['is_active']; }

        $limit  = min(500, max(1, (int)($q['limit'] ?? 100)));
        $offset = max(0, (int)($q['offset'] ?? 0));

        $sql = "SELECT * FROM questions";
        if ($where) $sql .= " WHERE " . implode(' AND ', $where);
        $sql .= " ORDER BY id LIMIT $limit OFFSET $offset";

        $rows = Database::fetchAll($sql, $params);
        Response::json(array_map('questionOut', $rows));
    }

    /** POST /admin/questions — create question. Requires 'questions' permission. */
    public static function createQuestion(): never
    {
        $admin = requirePermission(currentAdmin(), 'questions');
        $body = requestBody();

        $qtype = validateQuestionFields(
            $body['question_type'] ?? MCQ,
            $body['options'] ?? [],
            (int)($body['answer_index'] ?? 0),
            $body['image_url'] ?? null,
            require_image: true
        );
        [$a, $b, $c, $d] = padOptions($qtype, $body['options'] ?? []);

        Database::execute(
            "INSERT INTO questions (class_level, subject, topic, sub_topic, strand, difficulty, question,
             option_a, option_b, option_c, option_d, answer_index, explanation, question_type, image_url, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
            [
                $body['class_level'], $body['subject'], $body['topic'], $body['sub_topic'] ?? null,
                $body['strand'], $body['difficulty'], $body['question'],
                $a, $b, $c, $d,
                (int)$body['answer_index'], $body['explanation'], $qtype, $body['image_url'] ?? null,
            ]
        );
        $id = (int)Database::lastInsertId();
        auditLog((int)$admin['id'], $admin['username'], 'question.create', "question:$id");

        $q = Database::fetchOne("SELECT * FROM questions WHERE id = ?", [$id]);
        Response::json(questionOut($q), 201);
    }

    /** PUT /admin/questions/:id — update question. Requires 'questions' permission. */
    public static function updateQuestion(int $qid): never
    {
        $admin = requirePermission(currentAdmin(), 'questions');
        $body = requestBody();

        $q = Database::fetchOne("SELECT * FROM questions WHERE id = ?", [$qid]);
        if (!$q) {
            Response::error('question not found', 404);
        }

        $newType = strtolower($body['question_type'] ?? ($q['question_type'] ?: MCQ));
        $newOpts = $body['options'] ?? [$q['option_a'], $q['option_b'], $q['option_c'], $q['option_d']];
        $newIdx = $body['answer_index'] ?? $q['answer_index'];
        $newImg = array_key_exists('image_url', $body) ? $body['image_url'] : $q['image_url'];

        $newType = validateQuestionFields($newType, $newOpts, (int)$newIdx, $newImg, require_image: $newType === IMAGE_MCQ);
        [$a, $b, $c, $d] = padOptions($newType, $newOpts);

        Database::execute(
            "UPDATE questions SET class_level = ?, subject = ?, topic = ?, sub_topic = ?, strand = ?,
             difficulty = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
             answer_index = ?, explanation = ?, question_type = ?, image_url = ? WHERE id = ?",
            [
                $body['class_level'] ?? $q['class_level'],
                $body['subject'] ?? $body['subject'],
                $body['topic'] ?? $q['topic'],
                $body['sub_topic'] ?? $q['sub_topic'],
                $body['strand'] ?? $q['strand'],
                $body['difficulty'] ?? $q['difficulty'],
                $body['question'] ?? $q['question'],
                $a, $b, $c, $d,
                (int)$newIdx,
                $body['explanation'] ?? $q['explanation'],
                $newType,
                $newImg ?: null,
                $qid,
            ]
        );
        auditLog((int)$admin['id'], $admin['username'], 'question.update', "question:$qid");

        $upd = Database::fetchOne("SELECT * FROM questions WHERE id = ?", [$qid]);
        Response::json(questionOut($upd));
    }

    /** DELETE /admin/questions/:id — delete question. Requires 'questions' permission. */
    public static function deleteQuestion(int $qid): never
    {
        $admin = requirePermission(currentAdmin(), 'questions');
        $q = Database::fetchOne("SELECT id FROM questions WHERE id = ?", [$qid]);
        if (!$q) {
            Response::error('question not found', 404);
        }
        Database::connection()->exec("DELETE FROM questions WHERE id = " . (int)$qid);
        auditLog((int)$admin['id'], $admin['username'], 'question.delete', "question:$qid");
        Response::json(['detail' => 'deleted']);
    }

    /** POST /admin/questions/:id/active — toggle active flag. Requires 'questions' permission. */
    public static function setQuestionActive(int $qid): never
    {
        $admin = requirePermission(currentAdmin(), 'questions');
        $body = requestBody();
        $isActive = !empty($body['is_active']);

        $q = Database::fetchOne("SELECT id FROM questions WHERE id = ?", [$qid]);
        if (!$q) {
            Response::error('question not found', 404);
        }

        Database::execute("UPDATE questions SET is_active = ? WHERE id = ?", [$isActive ? 1 : 0, $qid]);
        auditLog((int)$admin['id'], $admin['username'], 'question.active', "question:$qid", 'active=' . ($isActive ? 'true' : 'false'));
        Response::json(['detail' => 'ok']);
    }

    // ─────────────────────────── SCHOOL CODES ───────────────────

    /** Generate a unique school code. */
    static function generateCode(): string
    {
        $db = Database::connection();
        do {
            $code = 'GH-' . substr(strtoupper(bin2hex(random_bytes(4))), 0, 8);
        } while ($db->query("SELECT COUNT(*) FROM school_codes WHERE code = " . $db->quote($code))->fetchColumn() > 0);
        return $code;
    }

    /** Shape a school code row for output. */
    static function schoolCodeOut(array $sc): array
    {
        $usersUsing = (int)Database::connection()->query(
            "SELECT COUNT(*) FROM users WHERE school_code = " . Database::connection()->quote($sc['code'])
        )->fetchColumn();
        return [
            'id'          => (int)$sc['id'],
            'code'        => $sc['code'],
            'name'        => $sc['name'],
            'school'      => $sc['school'],
            'created_at'  => $sc['created_at'],
            'expires_at'  => $sc['expires_at'],
            'is_active'   => (bool)$sc['is_active'],
            'max_uses'    => $sc['max_uses'] ? (int)$sc['max_uses'] : null,
            'used_count'  => (int)$sc['used_count'],
            'users_using' => $usersUsing,
        ];
    }

    /** POST /admin/school-codes — create school code(s). Requires 'schools' permission. */
    public static function createSchoolCode(): never
    {
        $admin = requirePermission(currentAdmin(), 'schools');
        $body = requestBody();

        $name = trim($body['name'] ?? '');
        if ($name === '') {
            Response::error('name is required', 400);
        }

        $count  = min(100, max(1, (int)($body['count'] ?? 1)));
        $school = $body['school'] ?? null;
        $expiresAt = $body['expires_at'] ?? null;
        $maxUses = isset($body['max_uses']) ? max(0, (int)$body['max_uses']) : null;
        $explicitCode = trim($body['code'] ?? '');

        $created = [];
        for ($i = 0; $i < $count; $i++) {
            $code = ($count === 1 && $explicitCode !== '') ? $explicitCode : self::generateCode();
            Database::execute(
                "INSERT INTO school_codes (code, name, school, created_by, expires_at, max_uses, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, 1)",
                [$code, $name, $school, $admin['id'], $expiresAt, $maxUses]
            );
            $sc = Database::fetchOne("SELECT * FROM school_codes WHERE code = ?", [$code]);
            $created[] = $sc;
            auditLog((int)$admin['id'], $admin['username'], 'schoolcode.create', "code:$code");
        }

        Response::json(array_map([self::class, 'schoolCodeOut'], $created), 201);
    }

    /** GET /admin/school-codes — list all. Requires 'schools' permission. */
    public static function listSchoolCodes(): never
    {
        $admin = requirePermission(currentAdmin(), 'schools');
        $rows = Database::fetchAll("SELECT * FROM school_codes ORDER BY created_at DESC");
        Response::json(array_map([self::class, 'schoolCodeOut'], $rows));
    }

    /** PATCH /admin/school-codes/:id — update fields. Requires 'schools' permission. */
    public static function updateSchoolCode(int $codeId): never
    {
        $admin = requirePermission(currentAdmin(), 'schools');
        $body = requestBody();

        $sc = Database::fetchOne("SELECT * FROM school_codes WHERE id = ?", [$codeId]);
        if (!$sc) {
            Response::error('code not found', 404);
        }

        $fields = [];
        $params = [];
        foreach (['name', 'school', 'code', 'expires_at', 'is_active', 'max_uses'] as $col) {
            if (array_key_exists($col, $body)) {
                if ($col === 'is_active') {
                    $fields[] = "$col = ?";
                    $params[] = (int)$body[$col];
                } elseif ($col === 'max_uses') {
                    $fields[] = "$col = ?";
                    $params[] = $body[$col] !== null ? max(0, (int)$body[$col]) : null;
                } else {
                    $fields[] = "$col = ?";
                    $params[] = $body[$col];
                }
            }
        }
        if (!$fields) {
            Response::error('no fields to update', 400);
        }

        $params[] = $codeId;
        $db = Database::connection();
        $db->exec("UPDATE school_codes SET " . implode(', ', $fields) . " WHERE id = " . (int)$codeId);
        auditLog((int)$admin['id'], $admin['username'], 'schoolcode.update', "code:{$sc['code']}");

        $upd = Database::fetchOne("SELECT * FROM school_codes WHERE id = ?", [$codeId]);
        Response::json(self::schoolCodeOut($upd));
    }

    // ─────────────────────────── LEADERBOARDS ───────────────────

    /** GET /admin/leaderboard — admin view with scope/filters. Requires 'leaderboard' permission. */
    public static function leaderboard(): never
    {
        $admin   = requirePermission(currentAdmin(), 'leaderboard');
        $scope   = $_GET['scope'] ?? 'global';
        $classLevel = $_GET['class_level'] ?? null;
        $limit   = min(500, max(1, (int)($_GET['limit'] ?? 50)));
        $db      = Database::connection();

        if ($scope === 'daily') {
            $today = date('Y-m-d');
            $out = [];
            $sessRows = Database::fetchAll("SELECT user_id, SUM(score) as pts FROM quiz_sessions WHERE DATE(created_at) = ? GROUP BY user_id ORDER BY pts DESC LIMIT ?", [$today, $limit]);
            foreach ($sessRows as $i => $s) {
                $u = Database::fetchOne("SELECT * FROM users WHERE id = ?", [$s['user_id']]);
                if (!$u) continue;
                $tot = (int)$u['total_questions'];
                $cor = (int)$u['total_correct'];
                $out[] = [
                    'rank'          => $i + 1,
                    'nickname'      => $u['nickname'],
                    'class_level'   => $u['class_level'],
                    'lifetime_score'=> (int)$s['pts'],
                    'accuracy'      => $tot > 0 ? round($cor / $tot, 4) : 0.0,
                ];
            }
            Response::json($out);
        }

        // weekly/monthly via leaderboard_periods
        if ($scope === 'weekly' || $scope === 'monthly') {
            $kind = $scope; // 'weekly' or 'monthly'
            $period = date('Y') . '-' . ($scope === 'weekly' ? 'W' . date('W') : 'm' . date('m'));
            $rows = Database::fetchAll(
                "SELECT lp.user_id, lp.points, u.nickname, u.class_level, u.total_questions, u.total_correct
                 FROM leaderboard_periods lp JOIN users u ON u.id = lp.user_id
                 WHERE lp.kind = ? AND lp.period = ? ORDER BY lp.points DESC LIMIT ?",
                [$kind, $period, $limit]
            );
            $out = [];
            foreach ($rows as $i => $r) {
                $tot = (int)$r['total_questions'];
                $cor = (int)$r['total_correct'];
                $out[] = [
                    'rank'           => $i + 1,
                    'nickname'       => $r['nickname'],
                    'class_level'    => $r['class_level'],
                    'lifetime_score' => (int)$r['points'],
                    'accuracy'       => $tot > 0 ? round($cor / $tot, 4) : 0.0,
                ];
            }
            Response::json($out);
        }

        // global
        $where = "is_guest = 0 AND lifetime_score > 0";
        $params = [];
        if ($classLevel) { $where .= " AND class_level = ?"; $params[] = $classLevel; }

        $rows = Database::fetchAll("SELECT * FROM users WHERE $where ORDER BY lifetime_score DESC LIMIT ?", array_merge($params, [$limit]));
        $out = [];
        foreach ($rows as $i => $u) {
            $tot = (int)$u['total_questions'];
            $cor = (int)$u['total_correct'];
            $out[] = [
                'rank'           => $i + 1,
                'nickname'       => $u['nickname'],
                'class_level'    => $u['class_level'],
                'lifetime_score' => (int)$u['lifetime_score'],
                'accuracy'       => $tot > 0 ? round($cor / $tot, 4) : 0.0,
            ];
        }
        Response::json($out);
    }

    // ─────────────────────────── MONITORING ─────────────────────

    /** GET /admin/monitor — active/completed/abandoned counts + live players. Requires 'monitor' permission. */
    public static function monitor(): never
    {
        $admin = requirePermission(currentAdmin(), 'monitor');
        $db = Database::connection();

        $active    = (int)$db->query("SELECT COUNT(*) FROM quiz_sessions WHERE status = 'active'")->fetchColumn();
        $completed = (int)$db->query("SELECT COUNT(*) FROM quiz_sessions WHERE status = 'completed'")->fetchColumn();
        $abandoned = (int)$db->query("SELECT COUNT(*) FROM quiz_sessions WHERE status = 'abandoned'")->fetchColumn();

        $live = [];
        $sessions = Database::fetchAll("SELECT * FROM quiz_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 20");
        foreach ($sessions as $s) {
            $u = Database::fetchOne("SELECT * FROM users WHERE id = ?", [$s['user_id']]);
            $school = $s['school_code'] ? Database::fetchOne("SELECT * FROM school_codes WHERE code = ?", [$s['school_code']]) : null;
            $live[] = [
                'nickname'   => $u ? $u['nickname'] : '?',
                'school'     => $school ? $school['school'] : ($s['school_code'] ?? '-'),
                'score'      => (int)$s['score'],
                'status'     => $s['status'],
                'started_at' => $s['started_at'],
            ];
        }

        Response::json([
            'active_games'             => $active,
            'completed_games'          => $completed,
            'abandoned_games'          => $abandoned,
            'players_currently_playing'=> $active,
            'live_players'             => $live,
        ]);
    }

    // ─────────────────────────── SETTINGS ──────────────────────

    /** GET /admin/settings — get all settings with defaults. Requires 'settings' permission. */
    public static function getSettings(): never
    {
        $admin = requirePermission(currentAdmin(), 'settings');
        $rows = Database::fetchAll("SELECT key_name, value FROM system_settings");
        $settings = [];
        foreach ($rows as $r) {
            $settings[$r['key_name']] = $r['value'];
        }
        foreach (DEFAULT_SETTINGS as $k => $v) {
            $settings[$k] ??= $v;
        }
        Response::json($settings);
    }

    /** PUT /admin/settings/:key — update a setting. Requires 'settings' permission. */
    public static function updateSetting(string $key): never
    {
        $admin = requirePermission(currentAdmin(), 'settings');
        $body = requestBody();
        $value = $body['value'] ?? null;

        if ($value === null) {
            Response::error('value is required', 400);
        }

        $existing = Database::fetchOne("SELECT key_name FROM system_settings WHERE key_name = ?", [$key]);
        if ($existing) {
            Database::execute("UPDATE system_settings SET value = ?, updated_at = NOW(), updated_by = ? WHERE key_name = ?", [$value, $admin['id'], $key]);
        } else {
            Database::execute("INSERT INTO system_settings (key_name, value, updated_by) VALUES (?, ?, ?)", [$key, $value, $admin['id']]);
        }

        auditLog((int)$admin['id'], $admin['username'], 'settings.update', "setting:$key", (string)$value);
        Response::json(['detail' => 'ok', 'key' => $key, 'value' => $value]);
    }

    // ─────────────────────────── AUDIT LOG ─────────────────────

    /** GET /admin/audit — audit log entries. Requires 'audit' permission. */
    public static function audit(): never
    {
        $admin = requirePermission(currentAdmin(), 'audit');
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
        $rows = Database::fetchAll("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", [$limit]);
        Response::json(array_map(fn($a) => [
            'id'            => (int)$a['id'],
            'admin_id'      => $a['admin_id'] ? (int)$a['admin_id'] : null,
            'admin_username'=> $a['admin_username'],
            'action'        => $a['action'],
            'target'        => $a['target'],
            'detail'        => $a['detail'],
            'ip'            => $a['ip'],
            'created_at'    => $a['created_at'],
        ], $rows));
    }

    // ─────────────────────────── EXPORTS ───────────────────────

    /** GET /admin/export/users — CSV. Requires 'export' permission. */
    public static function exportUsers(): never
    {
        $admin = requirePermission(currentAdmin(), 'export');
        $users = Database::fetchAll("SELECT * FROM users WHERE is_guest = 0 ORDER BY created_at DESC");
        $rows = [];
        foreach ($users as $u) {
            $rows[] = [
                $u['id'], $u['nickname'], $u['class_level'], $u['school_code'],
                $u['created_at'], $u['last_played'] ?? '',
                $u['lifetime_score'], $u['total_questions'], $u['total_correct'],
            ];
        }
        auditLog((int)$admin['id'], $admin['username'], 'export.users');
        self::sendCsv('users.csv', ['id', 'nickname', 'class', 'school_code', 'registered', 'last_active', 'score', 'questions', 'correct'], $rows);
    }

    /** GET /admin/export/leaderboard — CSV. Requires 'export' permission. */
    public static function exportLeaderboard(): never
    {
        $admin = requirePermission(currentAdmin(), 'export');
        $scope = $_GET['scope'] ?? 'global';

        // Reuse leaderboard logic
        $_GET['limit'] = 500;
        $data = self::leaderboardData($scope);
        $rows = [];
        foreach ($data as $r) {
            $rows[] = [$r['rank'], $r['nickname'], $r['class_level'], $r['lifetime_score'], $r['accuracy']];
        }
        auditLog((int)$admin['id'], $admin['username'], 'export.leaderboard', $scope);
        self::sendCsv('leaderboard.csv', ['rank', 'nickname', 'class', 'score', 'accuracy'], $rows);
    }

    /** GET /admin/export/game-history — CSV. Requires 'export' permission. */
    public static function exportGameHistory(): never
    {
        $admin = requirePermission(currentAdmin(), 'export');
        $sessions = Database::fetchAll("SELECT * FROM quiz_sessions ORDER BY created_at DESC");
        $rows = [];
        foreach ($sessions as $s) {
            $rows[] = [
                $s['id'], $s['user_id'], $s['ended_at'] ?? $s['created_at'],
                $s['subject'], $s['total'], $s['correct'], $s['score'], $s['status'],
            ];
        }
        auditLog((int)$admin['id'], $admin['username'], 'export.game_history');
        self::sendCsv('game_history.csv', ['session_id', 'user_id', 'date', 'subject', 'total', 'correct', 'score', 'status'], $rows);
    }

    /** GET /admin/export/questions — CSV. Requires 'export' permission. */
    public static function exportQuestions(): never
    {
        $admin = requirePermission(currentAdmin(), 'export');
        $qs = Database::fetchAll("SELECT * FROM questions ORDER BY id");
        $rows = [];
        foreach ($qs as $q) {
            $answered = (int)$q['times_answered'];
            $correct  = (int)$q['times_correct'];
            $rows[] = [
                $q['id'], $q['class_level'], $q['subject'], $q['topic'], $q['qdifficulty'] ?? '',
                $answered, $correct, $answered > 0 ? round($correct / $answered, 3) : '',
            ];
        }
        auditLog((int)$admin['id'], $admin['username'], 'export.questions');
        self::sendCsv('questions.csv', ['id', 'class', 'subject', 'topic', 'difficulty', 'answered', 'correct', 'correct_rate'], $rows);
    }

    /** Send a CSV download response. */
    private static function sendCsv(string $filename, array $headers, array $rows): never
    {
        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=$filename");
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fputcsv($out, $headers);
        foreach ($rows as $row) {
            fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }

    // ─────────────────────────── GUEST CLEANUP ────────────────

    /** DELETE /admin/cleanup/guests — remove stale guest accounts. Requires 'users' permission. */
    public static function cleanupGuests(): never
    {
        $admin = requirePermission(currentAdmin(), 'users');
        $q = queryParams();
        $daysOld = min(365, max(1, (int)($q['days_old'] ?? 7)));
        $dryRun = !array_key_exists('dry_run', $q) || filter_var($q['dry_run'], FILTER_VALIDATE_BOOLEAN);

        $cutoff = date('Y-m-d H:i:s', strtotime("-{$daysOld} days"));
        $guests = Database::fetchAll("SELECT * FROM users WHERE is_guest = 1 AND created_at <= ?", [$cutoff]);

        $removable = [];
        foreach ($guests as $g) {
            $sessionCount = (int)Database::connection()->query(
                "SELECT COUNT(*) FROM quiz_sessions WHERE user_id = " . (int)$g['id']
            )->fetchColumn();
            if ($sessionCount === 0) {
                $removable[] = (int)$g['id'];
            }
        }

        if (!$dryRun && $removable) {
            $db = Database::connection();
            foreach ($removable as $uid) {
                $db->exec("DELETE FROM user_question_seen WHERE user_id = " . (int)$uid);
                $db->exec("DELETE FROM topic_progress WHERE user_id = " . (int)$uid);
                $db->exec("DELETE FROM subject_progress WHERE user_id = " . (int)$uid);
                $db->exec("DELETE FROM users WHERE id = " . (int)$uid);
            }
            auditLog((int)$admin['id'], $admin['username'], 'cleanup.guests', null, "Removed " . count($removable) . " stale guests (>{$daysOld}d old)");
        } elseif (!$dryRun) {
            auditLog((int)$admin['id'], $admin['username'], 'cleanup.guests', null, 'No stale guests to remove');
        }

        Response::json([
            'guest_count'    => count($removable),
            'threshold_days' => $daysOld,
            'dry_run'        => $dryRun,
            'ids'            => $dryRun ? $removable : null,
        ]);
    }

    // ─── internal: used by export leaderboard ───

    /** Raw leaderboard data without auth (for internal reuse). */
    private static function leaderboardData(string $scope): array
    {
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 50)));
        $db = Database::connection();

        if ($scope === 'daily') {
            $today = date('Y-m-d');
            $out = [];
            $sessRows = Database::fetchAll("SELECT user_id, SUM(score) as pts FROM quiz_sessions WHERE DATE(created_at) = ? GROUP BY user_id ORDER BY pts DESC LIMIT ? LIMIT ?", [$today, $limit]);
            foreach ($sessRows as $i => $s) {
                $u = Database::fetchOne("SELECT * FROM users WHERE id = ?", [$s['user_id']]);
                if (!$u) continue;
                $tot = (int)$u['total_questions'];
                $cor = (int)$u['total_correct'];
                $out[] = [
                    'rank'           => $i + 1,
                    'nickname'       => $u['nickname'],
                    'class_level'    => $u['class_level'],
                    'lifetime_score' => (int)$s['pts'],
                    'accuracy'       => $tot > 0 ? round($cor / $tot, 4) : 0.0,
                ];
            }
            return $out;
        }

        if ($scope === 'weekly' || $scope === 'monthly') {
            $kind = $scope;
            $period = date('Y') . '-' . ($scope === 'weekly' ? 'W' . date('W') : 'm' . date('m'));
            $rows = Database::fetchAll(
                "SELECT lp.user_id, lp.points, u.nickname, u.class_level, u.total_questions, u.total_correct
                 FROM leaderboard_periods lp JOIN users u ON u.id = lp.user_id
                 WHERE lp.kind = ? AND lp.period = ? ORDER BY lp.points DESC LIMIT ?",
                [$kind, $period, $limit]
            );
            $out = [];
            foreach ($rows as $i => $r) {
                $tot = (int)$r['total_questions'];
                $cor = (int)$r['total_correct'];
                $out[] = [
                    'rank'           => $i + 1,
                    'nickname'       => $r['nickname'],
                    'class_level'    => $r['class_level'],
                    'lifetime_score' => (int)$r['points'],
                    'accuracy'       => $tot > 0 ? round($cor / $tot, 4) : 0.0,
                ];
            }
            return $out;
        }

        $rows = Database::fetchAll("SELECT * FROM users WHERE is_guest = 0 AND lifetime_score > 0 ORDER BY lifetime_score DESC LIMIT ?", [$limit]);
        $out = [];
        foreach ($rows as $i => $u) {
            $tot = (int)$u['total_questions'];
            $cor = (int)$u['total_correct'];
            $out[] = [
                'rank'           => $i + 1,
                'nickname'       => $u['nickname'],
                'class_level'    => $u['class_level'],
                'lifetime_score' => (int)$u['lifetime_score'],
                'accuracy'       => $tot > 0 ? round($cor / $tot, 4) : 0.0,
            ];
        }
        return $out;
    }
}

// ═══════════════════════════════════════════════════════════════
// Route registry — consumed by the router in index.php
//
// Format: [HTTP_METHOD, 'pattern/:param', [AdminRoutes::class, 'method']]
// ═══════════════════════════════════════════════════════════════

$routes = [
    // Auth
    ['POST', '/admin/token',                  [AdminRoutes::class, 'login']],
    ['POST', '/admin/logout',                 [AdminRoutes::class, 'logout']],
    ['GET',  '/admin/me',                     [AdminRoutes::class, 'me']],

    // Admin management (super_admin)
    ['GET',  '/admin/admins',                 [AdminRoutes::class, 'listAdmins']],
    ['POST', '/admin/admins',                 [AdminRoutes::class, 'createAdmin']],
    ['POST', '/admin/admins/:id/status',      [AdminRoutes::class, 'setAdminStatus']],

    // Dashboard
    ['GET',  '/admin/dashboard',              [AdminRoutes::class, 'dashboard']],

    // Users
    ['GET',  '/admin/users',                  [AdminRoutes::class, 'listUsers']],
    ['GET',  '/admin/users/:id',              [AdminRoutes::class, 'userDetail']],
    ['POST', '/admin/users/:id/status',       [AdminRoutes::class, 'setUserStatus']],

    // Questions
    ['GET',  '/admin/questions',              [AdminRoutes::class, 'listQuestions']],
    ['POST', '/admin/questions',              [AdminRoutes::class, 'createQuestion']],
    ['PUT',  '/admin/questions/:id',          [AdminRoutes::class, 'updateQuestion']],
    ['DELETE', '/admin/questions/:id',        [AdminRoutes::class, 'deleteQuestion']],
    ['POST', '/admin/questions/:id/active',   [AdminRoutes::class, 'setQuestionActive']],

    // School codes
    ['POST',   '/admin/school-codes',         [AdminRoutes::class, 'createSchoolCode']],
    ['GET',    '/admin/school-codes',         [AdminRoutes::class, 'listSchoolCodes']],
    ['PATCH',  '/admin/school-codes/:id',     [AdminRoutes::class, 'updateSchoolCode']],

    // Leaderboard
    ['GET',  '/admin/leaderboard',            [AdminRoutes::class, 'leaderboard']],

    // Monitor
    ['GET',  '/admin/monitor',                [AdminRoutes::class, 'monitor']],

    // Settings
    ['GET',  '/admin/settings',               [AdminRoutes::class, 'getSettings']],
    ['PUT',  '/admin/settings/:key',          [AdminRoutes::class, 'updateSetting']],

    // Audit log
    ['GET',  '/admin/audit',                  [AdminRoutes::class, 'audit']],

    // Exports
    ['GET',  '/admin/export/users',           [AdminRoutes::class, 'exportUsers']],
    ['GET',  '/admin/export/leaderboard',      [AdminRoutes::class, 'exportLeaderboard']],
    ['GET',  '/admin/export/game-history',    [AdminRoutes::class, 'exportGameHistory']],
    ['GET',  '/admin/export/questions',       [AdminRoutes::class, 'exportQuestions']],

    // Guest cleanup
    ['DELETE', '/admin/cleanup/guests',       [AdminRoutes::class, 'cleanupGuests']],
];
