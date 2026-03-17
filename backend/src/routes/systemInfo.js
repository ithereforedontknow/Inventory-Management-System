const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");
const { requireRole } = require("../Middleware/requireRole");
const fs = require("fs");
const path = require("path");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin"));

const BACKUP_DIR = path.join(__dirname, "../backups");

// GET /api/system-info
router.get("/", async (req, res) => {
  try {
    const [[{ inventory_count }]] = await pool.query(
      "SELECT COUNT(*) as inventory_count FROM inventory_items",
    );
    const [[{ transaction_count }]] = await pool.query(
      "SELECT COUNT(*) as transaction_count FROM transactions",
    );
    const [[{ user_count }]] = await pool.query(
      "SELECT COUNT(*) as user_count FROM users",
    );
    const [[{ audit_count }]] = await pool.query(
      "SELECT COUNT(*) as audit_count FROM audit_log",
    );

    // Backup stats
    let backup_count = 0;
    let last_backup = null;
    try {
      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => fs.statSync(path.join(BACKUP_DIR, f)).birthtime)
        .sort((a, b) => b - a);
      backup_count = files.length;
      last_backup = files[0] || null;
    } catch {
      // backups dir may not exist yet
    }

    res.json({
      inventory_count,
      transaction_count,
      user_count,
      audit_count,
      backup_count,
      last_backup,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
