<?php

class AuthController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function login(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password are required']);
            return;
        }

        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = :username AND is_active = 1");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Same response for both "user not found" and "wrong password" — prevents user enumeration
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        // Update last login
        $this->db->prepare("UPDATE users SET last_login = NOW() WHERE id = :id")
            ->execute([':id' => $user['id']]);

        $token = JwtAuth::generate([
            'sub'      => $user['id'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ]);

        echo json_encode([
            'token'    => $token,
            'user'     => [
                'id'       => $user['id'],
                'username' => $user['username'],
                'role'     => $user['role'],
            ],
        ]);
    }

    public function me(array $params): void {
        // This route is protected — middleware already validated the token
        // $params['_auth'] is injected by the auth middleware
        echo json_encode($params['_auth']);
    }

    public function changePassword(array $params): void {
        $auth = $params['_auth'];
        $body = json_decode(file_get_contents('php://input'), true);

        $current = $body['current_password'] ?? '';
        $new     = $body['new_password'] ?? '';

        if (!$current || !$new) {
            http_response_code(400);
            echo json_encode(['error' => 'current_password and new_password are required']);
            return;
        }

        $errors = Validator::validatePassword($new);
        if ($errors) {
            http_response_code(422);
            echo json_encode(['errors' => $errors]);
            return;
        }

        $stmt = $this->db->prepare("SELECT password_hash FROM users WHERE id = :id");
        $stmt->execute([':id' => $auth['sub']]);
        $user = $stmt->fetch();

        if (!password_verify($current, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Current password is incorrect']);
            return;
        }

        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
        $this->db->prepare("UPDATE users SET password_hash = :hash WHERE id = :id")
            ->execute([':hash' => $hash, ':id' => $auth['sub']]);

        echo json_encode(['message' => 'Password updated successfully']);
    }
}
