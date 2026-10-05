<?php
// Debug test script
echo "PHP is running\n\n";

// Test database connection
require_once __DIR__ . '/config.php';

echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_NAME: " . DB_NAME . "\n";
echo "DB_USER: " . DB_USER . "\n";

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($mysqli->connect_error) {
    echo "Connection FAIL: " . $mysqli->connect_error . "\n";
} else {
    echo "Connection SUCCESS\n";
    $mysqli->close();
}
?>