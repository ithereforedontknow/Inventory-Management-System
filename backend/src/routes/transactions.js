const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");
const { requireRole } = require("../Middleware/requireRole");
const { auditLog } = require("../helpers/auditHelper");

const router = express.Router();
router.use(requireAuth);

const VALID_TYPES = ["Purchased", "Sold", "Adjustment"];

// GET — all roles
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
    const itemSearch = req.query.item_search?.trim() || "";

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
    if (itemSearch) {
      conditions.push("i.name LIKE ?");
      params.push(`%${itemSearch}%`);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM transactions t JOIN inventory_items i ON t.inventory_id = i.id ${whereClause}`,
      params,
    );
    const total = countResult[0].total;

    const [rows] = await pool.query(
      `SELECT t.id, t.date, i.name AS item_name, t.transaction_type, t.quantity,
              pd.supplier_name, t.invoice_number, t.notes
       FROM transactions t
       JOIN inventory_items i ON t.inventory_id = i.id
       LEFT JOIN purchase_details pd ON t.id = pd.transaction_id
       ${whereClause}
       ORDER BY t.date DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

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

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.date, i.name AS item_name, t.transaction_type, t.quantity,
              pd.supplier_name, t.invoice_number, t.notes
       FROM transactions t
       JOIN inventory_items i ON t.inventory_id = i.id
       LEFT JOIN purchase_details pd ON t.id = pd.transaction_id
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

// POST — viewer and above can create
router.post("/", requireRole("viewer"), async (req, res) => {
  const conn = await pool.getConnection();
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
    if (transaction_type === "Purchased") {
      await conn.query(
        "INSERT INTO purchase_details (transaction_id, supplier_name) VALUES (?, ?)",
        [tResult.insertId, supplier_name],
      );
    }
    await conn.commit();

    const [[item]] = await pool.query(
      "SELECT name FROM inventory_items WHERE id = ?",
      [inventory_id],
    );
    await auditLog(
      req.user,
      "CREATE",
      "transaction",
      tResult.insertId,
      `${transaction_type} ${quantity} × ${item?.name || "unknown"}`,
    );

    res
      .status(201)
      .json({ id: tResult.insertId, message: "Transaction created" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
});

// PUT — manager and above only
router.put("/:id", requireRole("manager"), async (req, res) => {
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

    const [[existing]] = await conn.query(
      `SELECT t.*, i.name AS item_name FROM transactions t
       JOIN inventory_items i ON t.inventory_id = i.id WHERE t.id = ?`,
      [transId],
    );
    if (!existing)
      return res.status(404).json({ error: "Transaction not found" });

    await conn.beginTransaction();
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
    if (transaction_type === "Purchased") {
      await conn.query(
        "INSERT INTO purchase_details (transaction_id, supplier_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE supplier_name = ?",
        [transId, supplier_name, supplier_name],
      );
    } else {
      await conn.query(
        "DELETE FROM purchase_details WHERE transaction_id = ?",
        [transId],
      );
    }
    await conn.commit();

    const changes = {};
    if (existing.transaction_type !== transaction_type)
      changes.type = [existing.transaction_type, transaction_type];
    if (parseInt(existing.quantity) !== parseInt(quantity))
      changes.quantity = [existing.quantity, parseInt(quantity)];
    // Convert existing.date to a 'YYYY-MM-DD' string safely
    const existingDateStr =
      existing.date instanceof Date
        ? existing.date.toISOString().split("T")[0]
        : existing.date?.toString().substring(0, 10);

    if (existingDateStr !== date) {
      changes.date = [existingDateStr, date];
    }

    const [[newItem]] = await pool.query(
      "SELECT name FROM inventory_items WHERE id = ?",
      [inventory_id],
    );
    await auditLog(
      req.user,
      "UPDATE",
      "transaction",
      parseInt(transId),
      `${transaction_type} ${quantity} × ${newItem?.name || "unknown"}`,
      Object.keys(changes).length ? changes : null,
    );

    res.json({ message: "Transaction updated" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
});

// DELETE — manager and above only
router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      `SELECT t.*, i.name AS item_name FROM transactions t
       JOIN inventory_items i ON t.inventory_id = i.id WHERE t.id = ?`,
      [req.params.id],
    );
    if (!existing)
      return res.status(404).json({ error: "Transaction not found" });
    await pool.query("DELETE FROM transactions WHERE id = ?", [req.params.id]);
    await auditLog(
      req.user,
      "DELETE",
      "transaction",
      existing.id,
      `${existing.transaction_type} ${existing.quantity} × ${existing.item_name}`,
    );
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
