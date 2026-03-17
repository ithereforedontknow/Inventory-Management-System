const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");

const router = express.Router();
router.use(requireAuth);

const VALID_ACTIONS = ["CREATE", "UPDATE", "DELETE"];
const VALID_ENTITIES = ["inventory", "transaction", "user"];

// GET /api/audit-log
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "25")));
    const offset = (page - 1) * limit;

    const action = VALID_ACTIONS.includes(req.query.action)
      ? req.query.action
      : null;
    const entity = VALID_ENTITIES.includes(req.query.entity)
      ? req.query.entity
      : null;
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    const from = req.query.date_from || null;
    const to = req.query.date_to || null;

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push("action = ?");
      params.push(action);
    }
    if (entity) {
      conditions.push("entity = ?");
      params.push(entity);
    }
    if (userId) {
      conditions.push("user_id = ?");
      params.push(userId);
    }
    if (from) {
      conditions.push("created_at >= ?");
      params.push(from);
    }
    if (to) {
      conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(to);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_log ${where}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT id, user_id, username, action, entity, entity_id, entity_label, changes, created_at
       FROM audit_log ${where}
       ORDER BY created_at DESC, id DESC
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

module.exports = router;
