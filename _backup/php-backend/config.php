<?php
/**
 * KwizBox PHP Backend Configuration
 * Hosted on InfinityFree (PHP 8.x + MySQL 8.0)
 *
 * Reads values from a .env file in this directory, falling back to
 * hardcoded defaults (safe for local dev). On InfinityFree the .env
 * file holds the real MySQL credentials.
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
        $val = trim($parts[1], '"\'');
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

// ────────════── SECRET KEYS ──════────────
// Override these in .env for production!
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'replace_with_random_64_char_hex_string');
define('JWT_ALGORITHM', 'HS256');
define('JWT_ACCESS_EXPIRY', 60 * 24 * 30);       // 30 days in seconds
define('JWT_ADMIN_EXPIRY', 60 * 2);               // 2 hours in seconds

// ─────────────── DATABASE ───────────────
// InfinityFree MySQL credentials (set these from your htdocs/.env)
define('DB_HOST', getenv('DB_HOST') ?: 'sql312.infinityfree.com');
define('DB_NAME', getenv('DB_NAME') ?: 'if0_42952568_kwizbox');
define('DB_USER', getenv('DB_USER') ?: 'if0_42952568');
define('DB_PASS', getenv('DB_PASS') ?: 'kwizbox_db_pass');
define('DB_CHARSET', 'utf8mb4');

// ─────────────── CORS ───────────────
// Allow the frontend origin (set via env or default to '*')
define('CORS_ORIGIN', getenv('ALLOWED_ORIGINS') ?: 'https://kwizbox.infinityfree.io');

// ─────────────── ADMIN CREDENTIALS ───────────────
// Change these! Used by seed_admin.php to create the first super-admin.
define('ADMIN_USERNAME', getenv('ADMIN_USERNAME') ?: 'admin');
define('ADMIN_PASSWORD', getenv('ADMIN_PASSWORD') ?: 'Admin@1234');
define('ADMIN_FULLNAME', getenv('ADMIN_FULLNAME') ?: 'Super Admin');

// ─────────────── GAME SETTINGS ───────────────
define('QUESTIONS_PER_GAME', 12);
define('GAME_DURATION_SECONDS', 600);

// ─────────────── DISPLAY ERRORS ───────────────
ini_set('display_errors', 0);
error_reporting(E_ALL);
