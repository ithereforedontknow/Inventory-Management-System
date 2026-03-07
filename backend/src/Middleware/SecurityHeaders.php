<?php

class SecurityHeaders {
    public static function apply(): void {
        // Prevent browsers from MIME-sniffing
        header('X-Content-Type-Options: nosniff');

        // Prevent clickjacking
        header('X-Frame-Options: DENY');

        // Basic XSS protection (legacy browsers)
        header('X-XSS-Protection: 1; mode=block');

        // Don't send referrer info outside the origin
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Content Security Policy — API only serves JSON, no HTML
        header("Content-Security-Policy: default-src 'none'");

        // Ensure JSON content type is set on all API responses
        header('Content-Type: application/json; charset=utf-8');
    }
}
