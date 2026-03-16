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
      SELECT
        t.id,
        t.date,
        i.name AS item_name,
        t.transaction_type,
        t.quantity,
        pd.supplier_name,
        t.invoice_number,
        t.notes
      FROM transactions t
      JOIN inventory_items i ON t.inventory_id = i.id
      LEFT JOIN purchase_details pd ON t.id = pd.transaction_id
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
    const transId = req.params.id;
    const dataSql = `
      SELECT
        t.id,
        t.date,
        i.name AS item_name,
        t.transaction_type,
        t.quantity,
        pd.supplier_name,
        t.invoice_number,
        t.notes
      FROM transactions t
      JOIN inventory_items i ON t.inventory_id = i.id
      LEFT JOIN purchase_details pd ON t.id = pd.transaction_id
      WHERE t.id = ?
    `;

    const [rows] = await pool.query(dataSql, [transId]);

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
  const conn = await pool.getConnection(); // Need a single connection for the transaction
  try {
    const errors = validate(req.body);
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const {
      inventory_id,
      transaction_type,
      date,
      quantity,
      invoice_number,
      notes,
      supplier_name,
    } = req.body;

    await conn.beginTransaction();

    // Insert main transaction
    const [tResult] = await conn.query(
      "INSERT INTO transactions (date, inventory_id, transaction_type, quantity, invoice_number, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        date,
        inventory_id,
        transaction_type,
        quantity,
        invoice_number || null,
        notes || null,
      ],
    );

    const newId = tResult.insertId;

    // Insert purchase details only if needed
    if (transaction_type === "Purchased") {
      await conn.query(
        "INSERT INTO purchase_details (transaction_id, supplier_name) VALUES (?, ?)",
        [newId, supplier_name],
      );
    }

    await conn.commit();
    res.status(201).json({ id: newId, message: "Transaction created" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
});

// PUT /api/transactions/:id
router.put("/:id", async (req, res) => {
  const conn = await pool.getConnection();
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
      supplier_name = null,
    } = req.body;
    const transId = req.params.id;

    // Check if record exists before starting transaction
    const [[existing]] = await conn.query(
      "SELECT id FROM transactions WHERE id = ?",
      [transId],
    );
    if (!existing)
      return res.status(404).json({ error: "Transaction not found" });

    await conn.beginTransaction();

    // 1. Update main table
    await conn.query(
      "UPDATE transactions SET date=?, inventory_id=?, transaction_type=?, quantity=?, invoice_number=?, notes=? WHERE id=?",
      [
        date,
        parseInt(inventory_id),
        transaction_type,
        parseInt(quantity),
        invoice_number || null,
        notes || null,
        transId,
      ],
    );

    // 2. Handle Purchase Subtype logic
    if (transaction_type === "Purchased") {
      // Use UPSERT (INSERT ... ON DUPLICATE KEY UPDATE) to handle adding or updating the supplier
      await conn.query(
        "INSERT INTO purchase_details (transaction_id, supplier_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE supplier_name = ?",
        [transId, supplier_name, supplier_name],
      );
    } else {
      // If the type changed to 'Sold' or 'Adjustment', remove the now-irrelevant purchase info
      await conn.query(
        "DELETE FROM purchase_details WHERE transaction_id = ?",
        [transId],
      );
    }

    await conn.commit();
    res.json({ message: "Transaction updated" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
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
