<?php
/**
 * Create the super-admin account on first deployment.
 * Run manually via:  php seed_admin.php
 */

require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/Auth.php';
require_once __DIR__ . '/config.php';

// Check if admin already exists
$existing = Database::fetchOne(
    'SELECT id FROM admin_users WHERE username = ?',
    [ADMIN_USERNAME]
);

if ($existing) {
    echo "Admin '" . ADMIN_USERNAME . "' already exists (id={$existing['id']}). Skipping.\n";
    exit(0);
}

$hash = AuthHelper::hashPassword(ADMIN_PASSWORD);
Database::execute(
    'INSERT INTO admin_users (username, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [ADMIN_USERNAME, ADMIN_FULLNAME, $hash, 'super_admin']
);

echo "Super-admin '" . ADMIN_USERNAME . "' created (id=" . Database::lastInsertId() . ").\n";
echo "IMPORTANT: Change the admin password after first login!\n";
