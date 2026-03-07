<?php

class TransactionController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function index(array $params): void {
        $inventoryId = isset($_GET['inventory_id']) ? (int)$_GET['inventory_id'] : null;
        $type        = $_GET['type'] ?? null;
        $dateFrom    = $_GET['date_from'] ?? null;
        $dateTo      = $_GET['date_to'] ?? null;
        $page        = max(1, (int)($_GET['page'] ?? 1));
        $limit       = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset      = ($page - 1) * $limit;

        // Whitelist the type filter
        $allowedTypes = ['Purchased', 'Sold'];
        if ($type && !in_array($type, $allowedTypes, true)) {
            $type = null;
        }

        $conditions = [];
        $bindings   = [];

        if ($inventoryId) {
            $conditions[]              = "t.inventory_id = :inventory_id";
            $bindings[':inventory_id'] = $inventoryId;
        }
        if ($type) {
            $conditions[]   = "t.transaction_type = :type";
            $bindings[':type'] = $type;
        }
        if ($dateFrom) {
            $conditions[]       = "t.date >= :date_from";
            $bindings[':date_from'] = $dateFrom;
        }
        if ($dateTo) {
            $conditions[]     = "t.date <= :date_to";
            $bindings[':date_to'] = $dateTo;
        }

        $where = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM transactions t $where");
        $countStmt->execute($bindings);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT t.*, i.name AS inventory_name
            FROM transactions t
            JOIN inventory_items i ON t.inventory_id = i.id
            $where
            ORDER BY t.date DESC, t.id DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($bindings as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode([
            'data'  => $stmt->fetchAll(),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / $limit),
        ]);
    }

    public function show(array $params): void {
        $stmt = $this->db->prepare("
            SELECT t.*, i.name AS inventory_name
            FROM transactions t
            JOIN inventory_items i ON t.inventory_id = i.id
            WHERE t.id = :id
        ");
        $stmt->execute([':id' => (int)$params['id']]);
        $tx = $stmt->fetch();

        if (!$tx) {
            http_response_code(404);
            echo json_encode(['error' => 'Transaction not found']);
            return;
        }
        echo json_encode($tx);
    }

    public function store(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = (new Validator($body))
            ->required('inventory_id', 'Inventory item')
            ->required('transaction_type', 'Transaction type')
            ->required('date', 'Date')
            ->integer('inventory_id', 1, null, 'Inventory item')
            ->in('transaction_type', ['Purchased', 'Sold'], 'Transaction type')
            ->date('date')
            ->integer('quantity', 1, null)  // quantity must be at least 1
            ->maxLength('invoice_number', 100, 'Invoice number')
            ->maxLength('notes', 1000);

        Validator::respondIfFails($v);

        // Verify the referenced inventory item exists
        $inv = $this->db->prepare("SELECT id FROM inventory_items WHERE id = :id");
        $inv->execute([':id' => (int)$body['inventory_id']]);
        if (!$inv->fetch()) {
            http_response_code(422);
            echo json_encode(['errors' => ['inventory_id' => ['Selected inventory item does not exist']]]);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO transactions (date, inventory_id, transaction_type, quantity, invoice_number, notes)
            VALUES (:date, :inventory_id, :transaction_type, :quantity, :invoice_number, :notes)
        ");
        $stmt->execute([
            ':date'             => $body['date'],
            ':inventory_id'     => (int)$body['inventory_id'],
            ':transaction_type' => $body['transaction_type'],
            ':quantity'         => (int)$body['quantity'],
            ':invoice_number'   => isset($body['invoice_number']) && $body['invoice_number'] !== '' ? trim($body['invoice_number']) : null,
            ':notes'            => isset($body['notes']) && $body['notes'] !== '' ? trim($body['notes']) : null,
        ]);

        http_response_code(201);
        echo json_encode(['id' => (int)$this->db->lastInsertId(), 'message' => 'Transaction recorded']);
    }

    public function update(array $params): void {
        $id   = (int)$params['id'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = (new Validator($body))
            ->required('inventory_id', 'Inventory item')
            ->required('transaction_type', 'Transaction type')
            ->required('date', 'Date')
            ->integer('inventory_id', 1, null, 'Inventory item')
            ->in('transaction_type', ['Purchased', 'Sold'], 'Transaction type')
            ->date('date')
            ->integer('quantity', 1, null)
            ->maxLength('invoice_number', 100, 'Invoice number')
            ->maxLength('notes', 1000);

        Validator::respondIfFails($v);

        $exists = $this->db->prepare("SELECT id FROM transactions WHERE id = :id");
        $exists->execute([':id' => $id]);
        if (!$exists->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Transaction not found']);
            return;
        }

        $stmt = $this->db->prepare("
            UPDATE transactions SET
                date             = :date,
                inventory_id     = :inventory_id,
                transaction_type = :transaction_type,
                quantity         = :quantity,
                invoice_number   = :invoice_number,
                notes            = :notes
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'               => $id,
            ':date'             => $body['date'],
            ':inventory_id'     => (int)$body['inventory_id'],
            ':transaction_type' => $body['transaction_type'],
            ':quantity'         => (int)$body['quantity'],
            ':invoice_number'   => isset($body['invoice_number']) && $body['invoice_number'] !== '' ? trim($body['invoice_number']) : null,
            ':notes'            => isset($body['notes']) && $body['notes'] !== '' ? trim($body['notes']) : null,
        ]);

        echo json_encode(['message' => 'Transaction updated']);
    }

    public function destroy(array $params): void {
        $id = (int)$params['id'];

        $exists = $this->db->prepare("SELECT id FROM transactions WHERE id = :id");
        $exists->execute([':id' => $id]);
        if (!$exists->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Transaction not found']);
            return;
        }

        $this->db->prepare("DELETE FROM transactions WHERE id = :id")->execute([':id' => $id]);
        echo json_encode(['message' => 'Transaction deleted']);
    }
}
