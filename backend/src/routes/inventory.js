const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");
const { requireRole } = require("../Middleware/requireRole");
const { auditLog } = require("../helpers/auditHelper");
const router = express.Router();
router.use(requireAuth);

const WITH_STATS = `
  SELECT
    i.id, i.name, i.price, i.count_beginning, i.lead_time, i.created_at, i.updated_at,
    COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0) AS total_purchased,
    COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0) AS total_sold,
    (
      i.count_beginning
      + COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Purchased'), 0)
      - COALESCE((SELECT SUM(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0)
    ) AS count_ending,
    COALESCE((SELECT MAX(t.quantity) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0) AS max_sales,
    COALESCE((SELECT SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0) AS avg_daily_usage,
    COALESCE((SELECT i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0) AS safety_stock,
    COALESCE((SELECT (SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) * i.lead_time + i.lead_time * (MAX(t.quantity) - SUM(t.quantity) / NULLIF(COUNT(DISTINCT t.date), 0)) FROM transactions t WHERE t.inventory_id = i.id AND t.transaction_type = 'Sold'), 0) AS reorder_point
  FROM inventory_items i
`;

// GET — all roles
router.get("/", async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "15")));
    const offset = (page - 1) * limit;

    const countParams = [];
    let countSql = "SELECT COUNT(*) as total FROM inventory_items i";
    if (search) {
      countSql += " WHERE i.name LIKE ?";
      countParams.push(`%${search}%`);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0].total;

    const dataParams = [];
    let dataSql = WITH_STATS;
    if (search) {
      dataSql += " WHERE i.name LIKE ?";
      dataParams.push(`%${search}%`);
    }
    dataSql += " ORDER BY i.name ASC LIMIT ? OFFSET ?";
    dataParams.push(limit, offset);

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

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(`${WITH_STATS} WHERE i.id = ?`, [
      req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: "Item not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST/PUT/DELETE — manager and above
router.post("/", requireRole("manager"), async (req, res) => {
  try {
    const { name, price = 0, count_beginning = 0, lead_time = 3 } = req.body;
    const errors = {};
    if (!name?.trim()) errors.name = ["Name is required"];
    else if (name.trim().length > 255)
      errors.name = ["Name must be 255 characters or less"];
    if (isNaN(price) || parseFloat(price) < 0)
      errors.price = ["Price must be 0 or more"];
    if (isNaN(count_beginning) || parseInt(count_beginning) < 0)
      errors.count_beginning = ["Beginning count must be 0 or more"];
    if (
      !lead_time ||
      isNaN(lead_time) ||
      parseInt(lead_time) < 1 ||
      parseInt(lead_time) > 365
    )
      errors.lead_time = ["Lead time must be between 1 and 365 days"];
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) as count FROM inventory_items WHERE name = ?",
      [name.trim()],
    );
    if (count > 0)
      return res
        .status(409)
        .json({ errors: { name: ["An item with this name already exists"] } });

    const [result] = await pool.query(
      "INSERT INTO inventory_items (name, price, count_beginning, lead_time) VALUES (?, ?, ?, ?)",
      [
        name.trim(),
        parseFloat(price) || 0,
        parseInt(count_beginning),
        parseInt(lead_time),
      ],
    );
    await auditLog(
      req.user,
      "CREATE",
      "inventory",
      result.insertId,
      name.trim(),
    );
    res.status(201).json({ id: result.insertId, message: "Item created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireRole("manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price = 0, count_beginning = 0, lead_time = 3 } = req.body;
    const errors = {};
    if (!name?.trim()) errors.name = ["Name is required"];
    else if (name.trim().length > 255)
      errors.name = ["Name must be 255 characters or less"];
    if (isNaN(price) || parseFloat(price) < 0)
      errors.price = ["Price must be 0 or more"];
    if (isNaN(count_beginning) || parseInt(count_beginning) < 0)
      errors.count_beginning = ["Beginning count must be 0 or more"];
    if (
      !lead_time ||
      isNaN(lead_time) ||
      parseInt(lead_time) < 1 ||
      parseInt(lead_time) > 365
    )
      errors.lead_time = ["Lead time must be between 1 and 365 days"];
    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const [[existing]] = await pool.query(
      "SELECT * FROM inventory_items WHERE id = ?",
      [id],
    );
    if (!existing) return res.status(404).json({ error: "Item not found" });

    const [[dup]] = await pool.query(
      "SELECT id FROM inventory_items WHERE name = ? AND id != ?",
      [name.trim(), id],
    );
    if (dup)
      return res
        .status(409)
        .json({ errors: { name: ["An item with this name already exists"] } });

    const changes = {};
    if (existing.name !== name.trim())
      changes.name = [existing.name, name.trim()];
    if (parseFloat(existing.price) !== parseFloat(price))
      changes.price = [existing.price, parseFloat(price)];
    if (parseInt(existing.count_beginning) !== parseInt(count_beginning))
      changes.count_beginning = [
        existing.count_beginning,
        parseInt(count_beginning),
      ];
    if (parseInt(existing.lead_time) !== parseInt(lead_time))
      changes.lead_time = [existing.lead_time, parseInt(lead_time)];

    await pool.query(
      "UPDATE inventory_items SET name = ?, price = ?, count_beginning = ?, lead_time = ? WHERE id = ?",
      [
        name.trim(),
        parseFloat(price) || 0,
        parseInt(count_beginning),
        parseInt(lead_time),
        id,
      ],
    );
    await auditLog(
      req.user,
      "UPDATE",
      "inventory",
      id,
      name.trim(),
      Object.keys(changes).length ? changes : null,
    );
    res.json({ message: "Item updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireRole("manager"), async (req, res) => {
  try {
    const [[existing]] = await pool.query(
      "SELECT * FROM inventory_items WHERE id = ?",
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Item not found" });
    await pool.query("DELETE FROM inventory_items WHERE id = ?", [
      req.params.id,
    ]);
    await auditLog(req.user, "DELETE", "inventory", existing.id, existing.name);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
