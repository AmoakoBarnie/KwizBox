<?php
/**
 * Shared helpers: JSON responses, CORS headers, request body parsing.
 */

require_once __DIR__ . '/config.php';

class Response {
    /**
     * Send a JSON response with the given status code.
     */
    public static function json(mixed $data, int $status = 200): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Send an error JSON response.
     */
    public static function error(string $message, int $status = 400): never {
        self::json(['detail' => $message], $status);
    }

    /**
     * Send a success JSON response.
     */
    public static function success(mixed $data = null, int $status = 200): never {
        self::json($data ?? ['detail' => 'ok'], $status);
    }

    /**
     * Send a 204 No Content response.
     */
    public static function noContent(): never {
        http_response_code(204);
        exit;
    }
}

/**
 * Get the request body as an associative array (JSON).
 */
function requestBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Get query string parameters.
 */
function queryParams(): array {
    return $_GET;
}

/**
 * Get the request path (e.g. "/auth/login").
 */
function requestPath(): string {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    return rtrim($uri, '/') ?: '/';
}

/**
 * Get the request method (GET, POST, PUT, PATCH, DELETE).
 */
function requestMethod(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

/**
 * Send CORS headers for the configured origin.
 */
function sendCorsHeaders(): void {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    if (requestMethod() === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
