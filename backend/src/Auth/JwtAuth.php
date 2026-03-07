<?php

class JwtAuth {
    private static string $secret;
    private static int $expiryHours;

    private static function init(): void {
        self::$secret = getenv('JWT_SECRET') ?: throw new RuntimeException('JWT_SECRET not set');
        self::$expiryHours = (int)(getenv('JWT_EXPIRY_HOURS') ?: 8);
    }

    public static function generate(array $payload): string {
        self::init();

        $header = self::base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + (self::$expiryHours * 3600);
        $body   = self::base64url(json_encode($payload));
        $sig    = self::base64url(hash_hmac('sha256', "$header.$body", self::$secret, true));

        return "$header.$body.$sig";
    }

    public static function verify(string $token): array {
        self::init();

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Invalid token format');
        }

        [$header, $body, $sig] = $parts;
        $expected = self::base64url(hash_hmac('sha256', "$header.$body", self::$secret, true));

        if (!hash_equals($expected, $sig)) {
            throw new RuntimeException('Invalid token signature');
        }

        $payload = json_decode(self::base64urlDecode($body), true);

        if (!$payload || $payload['exp'] < time()) {
            throw new RuntimeException('Token expired');
        }

        return $payload;
    }

    private static function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
