<?php

class ErrorHandler {
    public static function register(): void {
        $appEnv = getenv('APP_ENV') ?: 'local';

        set_exception_handler(function (Throwable $e) use ($appEnv) {
            http_response_code(500);
            header('Content-Type: application/json');

            // Log full detail internally
            error_log(sprintf(
                "[%s] %s in %s:%d\nStack trace:\n%s",
                date('Y-m-d H:i:s'),
                $e->getMessage(),
                $e->getFile(),
                $e->getLine(),
                $e->getTraceAsString()
            ));

            // Only expose detail locally; production gets a generic message
            if ($appEnv === 'local') {
                echo json_encode([
                    'error'   => 'Internal server error',
                    'detail'  => $e->getMessage(),
                    'file'    => basename($e->getFile()) . ':' . $e->getLine(),
                ]);
            } else {
                echo json_encode(['error' => 'Internal server error']);
            }
        });

        set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
            throw new ErrorException($message, 0, $severity, $file, $line);
        });
    }
}
