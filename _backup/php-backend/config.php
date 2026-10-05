<?php
/**
 * KwizBox PHP Backend Configuration
 * Hosted on InfinityFree (PHP 8.x + MySQL 8.0)
 *
 * Credentials MUST be set in .env file - no hardcoded passwords.
 */

// ─────────────── LOAD .env ───────────────
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;
        $key = trim($parts[0]);
        $val = trim($parts[1], "\"'");
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

// ──────── SECRET KEYS ───────
// These MUST be set in .env - empty/invalid values fail securely
$jwtSecret = getenv('JWT_SECRET');
if ($jwtSecret === false || $jwtSecret === '' || strpos($jwtSecret, 'YOUR') !== false) {
    $jwtSecret = bin2hex(random_bytes(32)); // Random for dev only
}
define('JWT_SECRET', $jwtSecret);
define('JWT_ALGORITHM', 'HS256');
define('JWT_ACCESS_EXPIRY', 60 * 24 * 30);
define('JWT_ADMIN_EXPIRY', 60 * 2);

// ─────────────── DATABASE ───────────────
// These MUST be set in .env - empty string means no DB connection
define('DB_HOST', getenv('DB_HOST') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: '');
define('DB_USER', getenv('DB_USER') ?: '');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ─────────────── CORS ───────────────
define('CORS_ORIGIN', getenv('ALLOWED_ORIGINS') ?: 'https://kwizbox.infinityfree.io');

// ─────────────── ADMIN CREDENTIALS ───────────────
// These MUST be set in .env for security
define('ADMIN_USERNAME', getenv('ADMIN_USERNAME') ?: 'admin');
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: '');
define('ADMIN_FULLNAME', getenv('ADMIN_FULLNAME') ?: 'Super Admin');

// ─────────────── GAME SETTINGS ───────────────
define('QUESTIONS_PER_GAME', 12);
define('GAME_DURATION_SECONDS', 600);

// ─────────────── DEBUG ───────────────
ini_set('display_errors', 0);
error_reporting(E_ALL);