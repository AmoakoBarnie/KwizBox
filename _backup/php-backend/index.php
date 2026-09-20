<?php
/**
 * KwizBox API Router — InfinityFree entry point.
 * Routes all requests to the correct handler based on path + method.
 *
 * The .htaccess directs /auth/*, /quiz/*, /admin/*, /curriculum/*, /media/*
 * here. React Router paths (/, /quiz/summary, etc.) are served by the SPA
 * frontend via .htaccess fallback.
 */

require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/Database.php';
require_once __DIR__ . '/includes/Auth.php';

// ─────────── SECURITY HEADERS ───────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: no-referrer');
sendCorsHeaders();

// ─────────── ROUTE DISPATCH ───────────
$path     = requestPath();
$method   = requestMethod();
$segments = array_values(array_filter(explode('/', $path)));

$resource = $segments[0] ?? '';

// ─────────── PUBLIC ROUTES ───────────

// Health check
if ($resource === 'health' && $method === 'GET') {
    Response::json(['status' => 'ok', 'service' => 'KwizBox-PHP', 'version' => '1.0.0']);
}

// Serve static question images from /media/questions/*
if ($resource === 'media' && isset($segments[1]) && $segments[1] === 'questions') {
    $file = implode('/', array_slice($segments, 2));
    $filePath = __DIR__ . '/../static/questions/' . $file;
    // Also check frontend/public/ for favicon etc.
    if (!file_exists($filePath)) {
        $filePath = dirname(__DIR__) . '/frontend/public/' . $file;
    }
    if (file_exists($filePath)) {
        $mime = mime_content_type($filePath) ?: 'image/svg+xml';
        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit;
    }
    Response::error('Not found', 404);
}

// ─────────── RESOURCE ROUTERS ───────────
$routeFiles = [
    'auth'       => __DIR__ . '/routes/auth.php',
    'quiz'       => __DIR__ . '/routes/quiz.php',
    'admin'      => __DIR__ . '/routes/admin.php',
    'curriculum' => __DIR__ . '/routes/curriculum.php',
];

foreach ($routeFiles as $prefix => $file) {
    if ($resource !== $prefix) continue;
    if (!file_exists($file)) {
        Response::error("Route file not found: $prefix", 500);
    }
    require_once $file;

    foreach ($routes as $route) {
        [$rMethod, $rPattern, $rHandler] = $route;
        if ($rMethod !== $method) continue;

        $patternSegments = array_values(array_filter(explode('/', $rPattern)));
        $remainingSegments = array_slice($segments, 1);

        if (count($patternSegments) !== count($remainingSegments)) continue;

        $params = [];
        $matched = true;
        foreach ($patternSegments as $i => $ps) {
            if (str_starts_with($ps, ':')) {
                $params[substr($ps, 1)] = $remainingSegments[$i];
            } elseif ($ps !== $remainingSegments[$i]) {
                $matched = false;
                break;
            }
        }

        if ($matched) {
            // Resolve handler arguments via reflection
            if (is_array($rHandler) && count($rHandler) === 2) {
                $ref = new ReflectionMethod($rHandler[0], $rHandler[1]);
            } else {
                $ref = new ReflectionFunction($rHandler);
            }
            $args = [];
            foreach ($ref->getParameters() as $param) {
                $paramName = $param->getName();
                if (isset($params[$paramName])) {
                    $args[] = $params[$paramName];
                } elseif ($param->isOptional()) {
                    $args[] = $param->getDefaultValue();
                } elseif ($param->getType() && $param->getType()->getName() === 'array') {
                    $args[] = requestBody();
                } else {
                    $args[] = null;
                }
            }
            if (is_array($rHandler) && count($rHandler) === 2) {
                $obj = new $rHandler[0]();
                call_user_func_array([$obj, $rHandler[1]], $args);
            } else {
                call_user_func_array($rHandler, $args);
            }
        }
    }
}

// ─────────── 404 FALLBACK ───────────
Response::error("Route not found: $method $path", 404);
