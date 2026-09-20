<?php
/**
 * JWT authentication & password hashing for KwizBox.
 * Pure PHP — no external libraries required.
 */

require_once __DIR__ . '/config.php';

class JWT {
    /**
     * Encode a payload into a JWT token string.
     */
    public static function encode(array $payload): string {
        $header = ['alg' => JWT_ALGORITHM, 'typ' => 'JWT'];
        $segments = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($payload)),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, JWT_SECRET, true);
        $segments[] = self::base64UrlEncode($signature);
        return implode('.', $segments);
    }

    /**
     * Decode and verify a JWT token. Returns payload array or null.
     */
    public static function decode(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $signature = self::base64UrlDecode($signatureB64);
        $signingInput = $headerB64 . '.' . $payloadB64;
        $expected = hash_hmac('sha256', $signingInput, JWT_SECRET, true);

        if (!hash_equals($expected, $signature)) return null;

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        if (!is_array($payload)) return null;

        if (isset($payload['exp']) && $payload['exp'] < time()) return null;

        return $payload;
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

class AuthHelper {
    /**
     * Hash a password using bcrypt.
     */
    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    /**
     * Verify a password against its hash.
     */
    public static function verifyPassword(string $password, string $hash): bool {
        return password_verify($password, $hash);
    }

    /**
     * Extract bearer token from Authorization header.
     */
    public static function bearerToken(): ?string {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            return $m[1];
        }
        return null;
    }

    /**
     * Create a JWT for a user (30-day expiry).
     */
    public static function createUserToken(int $userId, bool $isGuest = false): string {
        return JWT::encode([
            'sub'  => (string) $userId,
            'guest'=> $isGuest,
            'exp'  => time() + JWT_ACCESS_EXPIRY,
        ]);
    }

    /**
     * Create a JWT for an admin (2-hour expiry).
     */
    public static function createAdminToken(int $adminId): string {
        return JWT::encode([
            'sub'   => (string) $adminId,
            'admin' => true,
            'exp'   => time() + JWT_ADMIN_EXPIRY,
        ]);
    }

    /**
     * Get the current user from the bearer token, or null.
     */
    public static function currentUser(): ?array {
        $token = self::bearerToken();
        if (!$token) return null;
        $payload = JWT::decode($token);
        if (!$payload) return null;
        return $payload;
    }

    /**
     * Require authentication. Returns user payload or sends 401.
     */
    public static function requireAuth(): array {
        $user = self::currentUser();
        if (!$user) {
            Response::error('Not authenticated', 401);
        }
        return $user;
    }
}
