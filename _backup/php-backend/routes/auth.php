<?php
/**
 * Auth + user routes: register, login, guest, profile, avatar, password change, account deletion.
 */

require_once __DIR__ . '/../includes/Auth.php';
require_once __DIR__ . '/../includes/Database.php';
require_once __DIR__ . '/../includes/helpers.php';

// ─── Build a user's detailed progress payload (mirrors Python build_progress) ───

function buildProgress(int $userId): array
{
    $pdo = Database::connection();

    // Overall stats
    $overallAcc = 0.0;
    $stmt = $pdo->prepare(
        'SELECT total_questions, total_correct, lifetime_score, current_streak, longest_streak
         FROM users WHERE id = ?'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch() ?: [];

    if ($user && (int)$user['total_questions'] > 0) {
        $overallAcc = round((int)$user['total_correct'] / (int)$user['total_questions'], 4);
    }

    // Subjects + nested topics
    $subjectsStmt = $pdo->prepare(
        'SELECT class_level, subject, questions_answered, correct
         FROM subject_progress WHERE user_id = ? ORDER BY class_level, subject'
    );
    $subjectsStmt->execute([$userId]);
    $subjects = [];

    while ($sp = $subjectsStmt->fetch()) {
        $sAcc = (int)$sp['questions_answered'] > 0
            ? round((int)$sp['correct'] / (int)$sp['questions_answered'], 4)
            : 0.0;

        $topicStmt = $pdo->prepare(
            'SELECT topic, questions_answered, correct, mastery_score, mastered
             FROM topic_progress
             WHERE user_id = ? AND class_level = ? AND subject = ?
             ORDER BY topic'
        );
        $topicStmt->execute([$userId, $sp['class_level'], $sp['subject']]);
        $topics = [];

        while ($tp = $topicStmt->fetch()) {
            $tAcc = (int)$tp['questions_answered'] > 0
                ? round((int)$tp['correct'] / (int)$tp['questions_answered'], 4)
                : 0.0;
            $topics[] = [
                'topic'              => $tp['topic'],
                'questions_answered' => (int)$tp['questions_answered'],
                'correct'            => (int)$tp['correct'],
                'accuracy'           => $tAcc,
                'mastery_score'      => (float)$tp['mastery_score'],
                'mastered'           => (bool)$tp['mastered'],
            ];
        }

        $subjects[] = [
            'class_level'        => (int)$sp['class_level'],
            'subject'            => $sp['subject'],
            'questions_answered' => (int)$sp['questions_answered'],
            'correct'            => (int)$sp['correct'],
            'accuracy'           => $sAcc,
            'topics'             => $topics,
        ];
    }

    // Total mastered topics
    $masteredStmt = $pdo->prepare(
        'SELECT COUNT(*) as cnt FROM topic_progress WHERE user_id = ? AND mastered = 1'
    );
    $masteredStmt->execute([$userId]);
    $masteredCount = (int)($masteredStmt->fetch() ?: ['cnt' => 0])['cnt'];

    return [
        'overall' => [
            'questions_answered' => (int)($user['total_questions'] ?? 0),
            'correct'            => (int)($user['total_correct'] ?? 0),
            'accuracy'           => $overallAcc,
            'lifetime_score'     => (int)($user['lifetime_score'] ?? 0),
            'current_streak'     => (int)($user['current_streak'] ?? 0),
            'longest_streak'     => (int)($user['longest_streak'] ?? 0),
        ],
        'subjects'        => $subjects,
        'topics_mastered' => $masteredCount,
    ];
}

// ─── Public user shape ───

function publicUser(array $user): array
{
    return [
        'id'            => (int)$user['id'],
        'nickname'      => $user['nickname'],
        'class_level'   => $user['class_level'] !== null ? (int)$user['class_level'] : null,
        'school_code'   => $user['school_code'],
        'is_guest'      => (bool)$user['is_guest'],
        'lifetime_score'=> (int)($user['lifetime_score'] ?? 0),
        'total_questions'=> (int)($user['total_questions'] ?? 0),
        'total_correct' => (int)($user['total_correct'] ?? 0),
        'current_streak'=> (int)($user['current_streak'] ?? 0),
        'longest_streak'=> (int)($user['longest_streak'] ?? 0),
        'progress'      => buildProgress((int)$user['id']),
        'avatar'        => [
            'skin'      => $user['avatar_skin'] ?? 'warm',
            'hat'       => $user['avatar_hat'] ?? 'none',
            'accessory' => $user['avatar_accessory'] ?? 'none',
            'gender'    => $user['avatar_gender'] ?? 'male',
        ],
    ];
}

// ─── Routes: [method, pattern, handler] ───

$routes = [
    ['POST', '/auth/register', function () {
        $body = requestBody();
        $nickname = trim($body['nickname'] ?? '');
        $password = $body['password'] ?? '';
        $classLevel = $body['class_level'] ?? null;
        $schoolCode = $body['school_code'] ?? null;

        if ($nickname === '') {
            Response::error('Nickname is required', 422);
        }
        if (strlen($password) < 6) {
            Response::error('Password must be at least 6 characters', 422);
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE nickname = ? AND is_guest = 0');
        $stmt->execute([$nickname]);
        $existing = $stmt->fetch();
        if ($existing) {
            Response::error('Nickname already taken', 409);
        }

        $hash = AuthHelper::hashPassword($password);
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        Database::execute(
            'INSERT INTO users (nickname, class_level, school_code, is_guest, password_hash, last_ip, created_at)
             VALUES (?, ?, ?, 0, ?, ?, NOW())',
            [$nickname, $classLevel, $schoolCode, $hash, $ip]
        );
        $userId = (int)Database::lastInsertId();

        $token = AuthHelper::createUserToken($userId);
        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);

        Response::json([
            'access_token' => $token,
            'user'         => publicUser($user),
        ], 201);
    }],

    ['POST', '/auth/login', function () {
        $body = requestBody();
        $nickname = trim($body['nickname'] ?? '');
        $password = $body['password'] ?? '';

        if ($nickname === '' || $password === '') {
            Response::error('Nickname and password are required', 422);
        }

        $pdo = Database::connection();

        // Regular user
        $stmt = $pdo->prepare('SELECT * FROM users WHERE nickname = ? AND is_guest = 0');
        $stmt->execute([$nickname]);
        $user = $stmt->fetch();

        if ($user && $user['password_hash'] && AuthHelper::verifyPassword($password, $user['password_hash'])) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            Database::execute(
                'UPDATE users SET last_ip = ?, last_login = NOW() WHERE id = ?',
                [$ip, $user['id']]
            );
            $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$user['id']]);
            $token = AuthHelper::createUserToken((int)$user['id']);
            Response::json([
                'access_token' => $token,
                'user'         => publicUser($user),
            ]);
        }

        // Admin user
        $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
        $stmt->execute([$nickname]);
        $admin = $stmt->fetch();

        if ($admin && $admin['password_hash'] && AuthHelper::verifyPassword($password, $admin['password_hash'])) {
            $token = AuthHelper::createAdminToken((int)$admin['id']);
            Response::json([
                'access_token' => $token,
                'user'         => [
                    'id'            => (int)$admin['id'],
                    'nickname'      => $admin['username'],
                    'class_level'   => null,
                    'school_code'   => null,
                    'is_guest'      => false,
                    'lifetime_score'=> 0,
                    'total_questions'=> 0,
                    'total_correct' => 0,
                    'current_streak'=> 0,
                    'longest_streak'=> 0,
                    'progress'      => null,
                    'avatar'        => [
                        'skin'      => 'warm',
                        'hat'       => 'none',
                        'accessory' => 'none',
                        'gender'    => 'male',
                    ],
                ],
            ]);
        }

        Response::error('Invalid nickname or password', 401);
    }],

    ['POST', '/auth/guest', function () {
        $body = requestBody();
        $nickname = trim($body['nickname'] ?? '') ?: 'Guest';
        $classLevel = $body['class_level'] ?? null;
        $schoolCode = $body['school_code'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        Database::execute(
            'INSERT INTO users (nickname, class_level, school_code, is_guest, is_active, last_ip, created_at)
             VALUES (?, ?, ?, 1, 1, ?, NOW())',
            [$nickname, $classLevel, $schoolCode, $ip]
        );
        $userId = (int)Database::lastInsertId();

        $token = AuthHelper::createUserToken($userId, true);
        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);

        Response::json([
            'access_token' => $token,
            'user'         => publicUser($user),
        ], 201);
    }],

    ['GET', '/auth/me', function () {
        $payload = AuthHelper::requireAuth();
        $userId = (int)$payload['sub'];

        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::error('User not found', 404);
        }

        Response::json(publicUser($user));
    }],

    ['PATCH', '/auth/me/avatar', function () {
        $payload = AuthHelper::requireAuth();
        $userId = (int)$payload['sub'];
        $body = requestBody();

        $validSkins = ['warm', 'deep', 'light', 'cool'];
        $validHats = ['none', 'kente_cap', 'school_cap', 'beanie', 'sun_hat'];
        $validAccessories = ['none', 'glasses', 'watch', 'necklace', 'school_bag', 'bow_tie'];
        $validGenders = ['male', 'female'];

        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::error('User not found', 404);
        }

        $updates = [];
        $params = [];

        if (isset($body['skin'])) {
            if (!in_array($body['skin'], $validSkins, true)) {
                Response::error("Invalid skin. Must be one of: " . implode(', ', $validSkins), 400);
            }
            $updates[] = 'avatar_skin = ?';
            $params[] = $body['skin'];
        }
        if (isset($body['hat'])) {
            if (!in_array($body['hat'], $validHats, true)) {
                Response::error("Invalid hat. Must be one of: " . implode(', ', $validHats), 400);
            }
            $updates[] = 'avatar_hat = ?';
            $params[] = $body['hat'];
        }
        if (isset($body['accessory'])) {
            if (!in_array($body['accessory'], $validAccessories, true)) {
                Response::error("Invalid accessory. Must be one of: " . implode(', ', $validAccessories), 400);
            }
            $updates[] = 'avatar_accessory = ?';
            $params[] = $body['accessory'];
        }
        if (isset($body['gender'])) {
            if (!in_array($body['gender'], $validGenders, true)) {
                Response::error("Invalid gender. Must be one of: " . implode(', ', $validGenders), 400);
            }
            $updates[] = 'avatar_gender = ?';
            $params[] = $body['gender'];
        }

        if (empty($updates)) {
            Response::error('No avatar fields to update', 400);
        }

        $params[] = $userId;
        Database::execute('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);

        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        Response::json(publicUser($user));
    }],

    ['PUT', '/auth/me/password', function () {
        $payload = AuthHelper::requireAuth();
        $userId = (int)$payload['sub'];
        $body = requestBody();

        $currentPassword = $body['current_password'] ?? '';
        $newPassword = $body['new_password'] ?? '';

        if ($currentPassword === '' || $newPassword === '') {
            Response::error('Current password and new password are required', 422);
        }
        if (strlen($newPassword) < 6) {
            Response::error('New password must be at least 6 characters', 422);
        }

        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::error('User not found', 404);
        }
        if ($user['is_guest']) {
            Response::error('Guest accounts cannot change password', 400);
        }
        if (!$user['password_hash']) {
            Response::error('No password set for this account', 400);
        }
        if (!AuthHelper::verifyPassword($currentPassword, $user['password_hash'])) {
            Response::error('Current password is incorrect', 401);
        }

        $newHash = AuthHelper::hashPassword($newPassword);
        Database::execute('UPDATE users SET password_hash = ? WHERE id = ?', [$newHash, $userId]);

        Response::json(['detail' => 'Password updated successfully']);
    }],

    ['DELETE', '/auth/me', function () {
        $payload = AuthHelper::requireAuth();
        $userId = (int)$payload['sub'];
        $body = requestBody();

        $user = Database::fetchOne('SELECT * FROM users WHERE id = ?', [$userId]);
        if (!$user) {
            Response::error('User not found', 404);
        }

        if (!$user['is_guest']) {
            $password = $body['password'] ?? '';
            if (!$user['password_hash']) {
                Response::error('No password set for this account', 400);
            }
            if (!AuthHelper::verifyPassword($password, $user['password_hash'])) {
                Response::error('Password is incorrect', 401);
            }
        }

        // Delete related data
        Database::execute('DELETE FROM user_question_seen WHERE user_id = ?', [$userId]);
        Database::execute('DELETE FROM topic_progress WHERE user_id = ?', [$userId]);
        Database::execute('DELETE FROM subject_progress WHERE user_id = ?', [$userId]);
        Database::execute('DELETE FROM quiz_sessions WHERE user_id = ?', [$userId]);

        // Delete the user
        Database::execute('DELETE FROM users WHERE id = ?', [$userId]);

        Response::noContent();
    }],
];

return $routes;
