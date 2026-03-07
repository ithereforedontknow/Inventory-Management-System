const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");

const router = express.Router();
router.use(requireAuth);

const VALID_TYPES = ["Purchased", "Sold", "Adjustment"];

// GET /api/transactions
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20")));
    const offset = (page - 1) * limit;
    const type = VALID_TYPES.includes(req.query.type) ? req.query.type : null;
    const invId = req.query.inventory_id
      ? parseInt(req.query.inventory_id)
      : null;
    const from = req.query.date_from || null;
    const to = req.query.date_to || null;

    // Build conditions and params
    const conditions = [];
    const params = [];

    if (type) {
      conditions.push("t.transaction_type = ?");
      params.push(type);
    }
    if (invId && !isNaN(invId)) {
      conditions.push("t.inventory_id = ?");
      params.push(invId);
    }
    if (from) {
      conditions.push("t.date >= ?");
      params.push(from);
    }
    if (to) {
      conditions.push("t.date <= ?");
      params.push(to);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // Data query
    const dataSql = `
      SELECT t.*, i.name AS inventory_name
      FROM transactions t
      JOIN inventory_items i ON t.inventory_id = i.id
      ${whereClause}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ? OFFSET ?
    `;

    // Create params array with filter params + pagination params
    const dataParams = params.concat([parseInt(limit), parseInt(offset)]);

    const [rows] = await pool.query(dataSql, dataParams);

    res.json({
      data: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/transactions/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, i.name AS inventory_name
       FROM transactions t
       JOIN inventory_items i ON t.inventory_id = i.id
       WHERE t.id = ?`,
      [req.params.id],
    );
    if (!rows[0])
      return res.status(404).json({ error: "Transaction not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function validate(body) {
  const errors = {};
  const { inventory_id, transaction_type, date, quantity } = body;

  if (!inventory_id) errors.inventory_id = ["Please select an inventory item"];
  if (!VALID_TYPES.includes(transaction_type))
    errors.transaction_type = ["Invalid transaction type"];
  if (!date) errors.date = ["Date is required"];
  if (!quantity || isNaN(quantity) || parseInt(quantity) < 1)
    errors.quantity = ["Quantity must be at least 1"];

  return errors;
}

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const {
      inventory_id,
      transaction_type,
      date,
      quantity,
      invoice_number = null,
      notes = null,
    } = req.body;

    // Check inventory item exists
    const [[item]] = await pool.query(
      "SELECT id FROM inventory_items WHERE id = ?",
      [inventory_id],
    );
    if (!item)
      return res.status(404).json({ error: "Inventory item not found" });

    const [result] = await pool.query(
      "INSERT INTO transactions (date, inventory_id, transaction_type, quantity, invoice_number, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        date,
        parseInt(inventory_id),
        transaction_type,
        parseInt(quantity),
        invoice_number || null,
        notes || null,
      ],
    );

    res
      .status(201)
      .json({ id: result.insertId, message: "Transaction created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  try {
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const [[existing]] = await pool.query(
      "SELECT id FROM transactions WHERE id = ?",
      [req.params.id],
    );
    if (!existing)
      return res.status(404).json({ error: "Transaction not found" });

    const {
      inventory_id,
      transaction_type,
      date,
      quantity,
      invoice_number = null,
      notes = null,
    } = req.body;

    await pool.query(
      "UPDATE transactions SET date=?, inventory_id=?, transaction_type=?, quantity=?, invoice_number=?, notes=? WHERE id=?",
      [
        date,
        parseInt(inventory_id),
        transaction_type,
        parseInt(quantity),
        invoice_number || null,
        notes || null,
        req.params.id,
      ],
    );

    res.json({ message: "Transaction updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM transactions WHERE id = ?",
      [req.params.id],
    );
    if (!existing)
      return res.status(404).json({ error: "Transaction not found" });

    await pool.query("DELETE FROM transactions WHERE id = ?", [req.params.id]);
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
