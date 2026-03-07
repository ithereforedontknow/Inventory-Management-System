<?php

class InventoryController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Core computed-column SQL.
     *
     * Calculated fields (all derived from transactions):
     *   total_purchased  = SUM of all Purchased quantities
     *   total_sold       = SUM of all Sold quantities
     *   count_ending     = count_beginning + purchased - sold  (can go negative = flag)
     *   max_sales        = MAX single-transaction Sold quantity  (MAXIFS equivalent)
     *   avg_daily_usage  = total_sold / count of distinct days that had a Sold transaction
     *   safety_stock     = lead_time * (max_sales - avg_daily_usage)
     *   reorder_point    = (avg_daily_usage * lead_time) + safety_stock
     *
     * All four derived values default to 0 when no Sold transactions exist yet.
     */
    private function selectWithCounts(): string {
        return "
            SELECT
                i.id,
                i.name,
                i.count_beginning,
                i.lead_time,
                i.created_at,
                i.updated_at,

                -- ── Raw totals ────────────────────────────────────────────
                COALESCE((
                    SELECT SUM(t.quantity) FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'
                ), 0) AS total_purchased,

                COALESCE((
                    SELECT SUM(t.quantity) FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                ), 0) AS total_sold,

                -- ── Ending stock (can be negative) ────────────────────────
                (
                    i.count_beginning
                    + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
                    - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
                ) AS count_ending,

                -- ── Max Sales = highest single Sold qty (MAXIFS) ─────────
                COALESCE((
                    SELECT MAX(t.quantity) FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                ), 0) AS max_sales,

                -- ── Avg Daily Usage = total sold / distinct sale days ─────
                COALESCE((
                    SELECT
                        SUM(t.quantity) /
                        NULLIF(COUNT(DISTINCT t.date), 0)
                    FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                ), 0) AS avg_daily_usage,

                -- ── Safety Stock = lead_time * (max_sales - avg_daily_usage)
                COALESCE((
                    SELECT
                        i.lead_time * (
                            MAX(t.quantity) -
                            SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)
                        )
                    FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                ), 0) AS safety_stock,

                -- ── Reorder Point = (avg_daily_usage * lead_time) + safety_stock
                -- Expanded inline: avg * lt + lt*(max - avg) = lt * max
                -- But we keep the full formula for clarity / future changes
                COALESCE((
                    SELECT
                        (SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) * i.lead_time
                        + i.lead_time * (
                            MAX(t.quantity) -
                            SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)
                        )
                    FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                ), 0) AS reorder_point

            FROM inventory_items i
        ";
    }

    public function index(array $params): void {
        $search = trim($_GET['search'] ?? '');
        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $where     = $search ? "WHERE i.name LIKE :search" : "";
        $searchVal = "%$search%";

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM inventory_items i $where");
        if ($search) $countStmt->bindValue(':search', $searchVal);
        $countStmt->execute();
        $total = (int)$countStmt->fetchColumn();

        $sql  = $this->selectWithCounts() . " $where ORDER BY i.name LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        if ($search) $stmt->bindValue(':search', $searchVal);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
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
        $stmt = $this->db->prepare($this->selectWithCounts() . " WHERE i.id = :id");
        $stmt->execute([':id' => (int)$params['id']]);
        $item = $stmt->fetch();

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
            return;
        }
        echo json_encode($item);
    }

    public function store(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = (new Validator($body))
            ->required('name')
            ->string('name', 1, 255)
            ->integer('count_beginning', 0)
            ->integer('lead_time', 1, 365, 'Lead time');

        Validator::respondIfFails($v);

        $dup = $this->db->prepare("SELECT id FROM inventory_items WHERE name = :name");
        $dup->execute([':name' => trim($body['name'])]);
        if ($dup->fetch()) {
            http_response_code(409);
            echo json_encode(['errors' => ['name' => ['An item with this name already exists']]]);
            return;
        }

        $stmt = $this->db->prepare("
            INSERT INTO inventory_items (name, count_beginning, lead_time)
            VALUES (:name, :count_beginning, :lead_time)
        ");
        $stmt->execute([
            ':name'            => trim($body['name']),
            ':count_beginning' => (int)($body['count_beginning'] ?? 0),
            ':lead_time'       => (int)($body['lead_time'] ?? 3),
        ]);

        http_response_code(201);
        echo json_encode(['id' => (int)$this->db->lastInsertId(), 'message' => 'Item created']);
    }

    public function update(array $params): void {
        $id   = (int)$params['id'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = (new Validator($body))
            ->required('name')
            ->string('name', 1, 255)
            ->integer('count_beginning', 0)
            ->integer('lead_time', 1, 365, 'Lead time');

        Validator::respondIfFails($v);

        $exists = $this->db->prepare("SELECT id FROM inventory_items WHERE id = :id");
        $exists->execute([':id' => $id]);
        if (!$exists->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
            return;
        }

        $dup = $this->db->prepare("SELECT id FROM inventory_items WHERE name = :name AND id != :id");
        $dup->execute([':name' => trim($body['name']), ':id' => $id]);
        if ($dup->fetch()) {
            http_response_code(409);
            echo json_encode(['errors' => ['name' => ['An item with this name already exists']]]);
            return;
        }

        $stmt = $this->db->prepare("
            UPDATE inventory_items SET
                name            = :name,
                count_beginning = :count_beginning,
                lead_time       = :lead_time
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'              => $id,
            ':name'            => trim($body['name']),
            ':count_beginning' => (int)($body['count_beginning'] ?? 0),
            ':lead_time'       => (int)($body['lead_time'] ?? 3),
        ]);

        echo json_encode(['message' => 'Item updated']);
    }

    public function destroy(array $params): void {
        $id = (int)$params['id'];

        $exists = $this->db->prepare("SELECT id FROM inventory_items WHERE id = :id");
        $exists->execute([':id' => $id]);
        if (!$exists->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
            return;
        }

        $this->db->prepare("DELETE FROM inventory_items WHERE id = :id")->execute([':id' => $id]);
        echo json_encode(['message' => 'Item deleted']);
    }

    public function dashboard(array $params): void {
        $totalItems = (int)$this->db->query("SELECT COUNT(*) FROM inventory_items")->fetchColumn();

        // Low stock: ending count <= computed reorder point (lead_time * max_sales)
        $lowStock = (int)$this->db->query("
            SELECT COUNT(*) FROM inventory_items i
            WHERE (
                SELECT COALESCE(MAX(t.quantity), 0)
                FROM transactions t
                WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
            ) > 0
            AND (
                i.count_beginning
                + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
                - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
            ) <= (
                i.lead_time * (
                    SELECT COALESCE(MAX(t.quantity), 0)
                    FROM transactions t
                    WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
                )
            )
        ")->fetchColumn();

        $totalPurchased = (int)$this->db->query("SELECT COALESCE(SUM(quantity),0) FROM transactions WHERE transaction_type='Purchased'")->fetchColumn();
        $totalSold      = (int)$this->db->query("SELECT COALESCE(SUM(quantity),0) FROM transactions WHERE transaction_type='Sold'")->fetchColumn();

        $recentTx = $this->db->query("
            SELECT t.*, i.name AS inventory_name
            FROM transactions t
            JOIN inventory_items i ON t.inventory_id = i.id
            ORDER BY t.date DESC, t.id DESC
            LIMIT 10
        ")->fetchAll();

        $monthlyStats = $this->db->query("
            SELECT DATE_FORMAT(date,'%Y-%m') AS month, transaction_type, SUM(quantity) AS total
            FROM transactions
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month, transaction_type
            ORDER BY month ASC
        ")->fetchAll();

        echo json_encode([
            'total_items'         => $totalItems,
            'low_stock_count'     => $lowStock,
            'total_purchased'     => $totalPurchased,
            'total_sold'          => $totalSold,
            'recent_transactions' => $recentTx,
            'monthly_stats'       => $monthlyStats,
        ]);
    }
}
