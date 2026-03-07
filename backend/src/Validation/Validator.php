<?php

class Validator {
    private array $errors = [];
    private array $data;

    public function __construct(array $data) {
        $this->data = $data;
    }

    // ── Fluent rule methods ───────────────────────────────────────

    public function required(string $field, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') {
            $this->errors[$field][] = "$label is required";
        }
        return $this;
    }

    public function string(string $field, int $min = 1, int $max = 255, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null) return $this;

        $value = trim((string)$value);
        if (strlen($value) < $min) {
            $this->errors[$field][] = "$label must be at least $min character(s)";
        }
        if (strlen($value) > $max) {
            $this->errors[$field][] = "$label must be no more than $max characters";
        }
        return $this;
    }

    public function integer(string $field, int $min = 0, ?int $max = null, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') return $this;

        if (!is_numeric($value) || (int)$value != $value) {
            $this->errors[$field][] = "$label must be a whole number";
            return $this;
        }
        $int = (int)$value;
        if ($int < $min) {
            $this->errors[$field][] = "$label must be at least $min";
        }
        if ($max !== null && $int > $max) {
            $this->errors[$field][] = "$label must be no more than $max";
        }
        return $this;
    }

    public function numeric(string $field, float $min = 0, ?float $max = null, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') return $this;

        if (!is_numeric($value)) {
            $this->errors[$field][] = "$label must be a number";
            return $this;
        }
        $f = (float)$value;
        if ($f < $min) {
            $this->errors[$field][] = "$label must be at least $min";
        }
        if ($max !== null && $f > $max) {
            $this->errors[$field][] = "$label must be no more than $max";
        }
        return $this;
    }

    public function date(string $field, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') return $this;

        $d = DateTime::createFromFormat('Y-m-d', $value);
        if (!$d || $d->format('Y-m-d') !== $value) {
            $this->errors[$field][] = "$label must be a valid date (YYYY-MM-DD)";
        }
        return $this;
    }

    public function in(string $field, array $allowed, string $label = ''): static {
        $label = $label ?: ucfirst(str_replace('_', ' ', $field));
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') return $this;

        if (!in_array($value, $allowed, true)) {
            $list = implode(', ', $allowed);
            $this->errors[$field][] = "$label must be one of: $list";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $label = ''): static {
        return $this->string($field, 0, $max, $label);
    }

    // ── Result ────────────────────────────────────────────────────

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    // ── Static helpers ────────────────────────────────────────────

    public static function validatePassword(string $password): array {
        $errors = [];
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }
        return $errors;
    }

    // ── Send error response and exit ──────────────────────────────

    public static function respondIfFails(self $v): void {
        if ($v->fails()) {
            http_response_code(422);
            echo json_encode(['errors' => $v->errors()]);
            exit;
        }
    }
}
