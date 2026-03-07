const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");

const router = express.Router();
router.use(requireAuth);

function toCSV(rows) {
  if (!rows.length) return "";
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = Object.keys(rows[0]).join(",");
  const body = rows
    .map((r) => Object.values(r).map(escape).join(","))
    .join("\n");
  return header + "\n" + body;
}

// GET /api/export/inventory
router.get("/inventory", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        i.name                          AS 'Item Name',
        i.count_beginning               AS 'Beginning Count',
        i.lead_time                     AS 'Lead Time (days)',
        COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0) AS 'Total Purchased',
        COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)      AS 'Total Sold',
        (
          i.count_beginning
          + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
          - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
        )                               AS 'Ending Count',
        ROUND(COALESCE((SELECT MAX(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0), 2) AS 'Max Sales',
        ROUND(COALESCE((SELECT SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0), 2) AS 'Avg Daily Usage',
        ROUND(COALESCE((SELECT i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0), 2) AS 'Safety Stock',
        ROUND(COALESCE((SELECT (SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) * i.lead_time + i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0), 2) AS 'Reorder Point'
      FROM inventory_items i
      ORDER BY i.name
    `);

    const filename = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + toCSV(rows)); // BOM for Excel
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

// GET /api/export/transactions
router.get("/transactions", async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.date_from) {
      conditions.push("t.date >= ?");
      params.push(req.query.date_from);
    }
    if (req.query.date_to) {
      conditions.push("t.date <= ?");
      params.push(req.query.date_to);
    }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [rows] = await pool.execute(
      `
      SELECT
        t.date                         AS 'Date',
        i.name                         AS 'Item',
        t.transaction_type             AS 'Type',
        t.quantity                     AS 'Quantity',
        COALESCE(t.invoice_number, '') AS 'Invoice #',
        COALESCE(t.notes, '')          AS 'Notes'
      FROM transactions t
      JOIN inventory_items i ON t.inventory_id = i.id
      ${where}
      ORDER BY t.date DESC, t.id DESC
    `,
      params,
    );

    const filename = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + toCSV(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

module.exports = router;
