<?php
/**
 * KwizBox dev router — handles API routes + static asset serving
 */

$documentRoot = __DIR__;
$frontendDir = dirname(__DIR__); // htdocs/ on InfinityFree
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// ─── API routes → php-backend/index.php ───
$apiPrefixes = ['/auth', '/quiz', '/admin', '/curriculum', '/health', '/media'];
foreach ($apiPrefixes as $prefix) {
    if (str_starts_with($uri, $prefix)) {
        // Forward to the main API router
        $_SERVER['SCRIPT_FILENAME'] = $documentRoot . '/index.php';
        require $documentRoot . '/index.php';
        exit;
    }
}

// ─── Static assets from frontend/dist ───
$file = $frontendDir . $uri;
if (is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mimeMap = ['js' => 'application/javascript', 'mjs' => 'application/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2', 'ttf' => 'font/ttf', 'json' => 'application/json'];
    $mime = $mimeMap[$ext] ?? mime_content_type($file) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=86400');
    readfile($file);
    exit;
}

// ─── SPA fallback → index.html ───
$indexFile = $frontendDir . '/index.html';
if (is_file($indexFile)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexFile);
    exit;
}

http_response_code(404);
echo 'Not found';