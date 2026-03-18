const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");
const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const [[{ total_items }]] = await pool.execute(
      "SELECT COUNT(*) as total_items FROM inventory_items",
    );

    // Low stock count
    const [lowStockRows] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM inventory_items i
      WHERE (
        SELECT COALESCE(MAX(t.quantity), 0) FROM transactions t
        WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
      ) > 0
      AND (
        i.count_beginning
        + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
        - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
      ) < (
        i.lead_time * (
          SELECT COALESCE(MAX(t.quantity), 0) FROM transactions t
          WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
        )
      )
    `);
    const low_stock_count = lowStockRows[0].cnt;

    const [[{ total_purchased }]] = await pool.execute(
      "SELECT COALESCE(SUM(quantity), 0) as total_purchased FROM transactions WHERE transaction_type = 'Purchased'",
    );

    const [[{ total_sold }]] = await pool.execute(
      "SELECT COALESCE(SUM(quantity), 0) as total_sold FROM transactions WHERE transaction_type = 'Sold'",
    );

    // Total stock value — sum of (ending count × price) for items with positive stock
    const [[{ stock_value }]] = await pool.execute(`
      SELECT COALESCE(SUM(
        (
          i.count_beginning
          + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
          - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
        ) * i.price
      ), 0) as stock_value
      FROM inventory_items i
      WHERE (
        i.count_beginning
        + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
        - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
      ) > 0
    `);

    // Top 5 low stock items for the dashboard quick list
    const [low_stock_items] = await pool.execute(`
      SELECT
        i.id,
        i.name,
        i.lead_time,
        (
          i.count_beginning
          + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
          - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
        ) AS count_ending,
        COALESCE((
          SELECT i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0))
          FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
        ), 0) AS safety_stock,
        COALESCE((
          SELECT
            (SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) * i.lead_time
            + i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0))
          FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'
        ), 0) AS reorder_point
      FROM inventory_items i
      HAVING reorder_point > 0 AND count_ending <= reorder_point
      ORDER BY count_ending ASC
      LIMIT 5
    `);

    const [recent_transactions] = await pool.execute(`
      SELECT t.*, i.name AS inventory_name
      FROM transactions t
      JOIN inventory_items i ON t.inventory_id = i.id
      ORDER BY t.date DESC, t.id DESC
      LIMIT 10
    `);

    const [monthly_stats] = await pool.execute(`
      SELECT DATE_FORMAT(date, '%Y-%m') AS month, transaction_type, SUM(quantity) AS total
      FROM transactions
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month, transaction_type
      ORDER BY month ASC
    `);

    res.json({
      total_items,
      low_stock_count,
      total_purchased,
      total_sold,
      stock_value: parseFloat(stock_value) || 0,
      low_stock_items,
      recent_transactions,
      monthly_stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
