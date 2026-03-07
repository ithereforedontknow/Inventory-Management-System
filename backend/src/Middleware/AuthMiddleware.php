<?php

class AuthMiddleware {
    /**
     * Validates the Bearer token from the Authorization header.
     * Returns the decoded payload array, or sends 401 and exits.
     */
    public static function require(): array {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!str_starts_with($header, 'Bearer ')) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }

        $token = substr($header, 7);

        try {
            return JwtAuth::verify($token);
        } catch (RuntimeException $e) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }
    }
}
