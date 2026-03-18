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
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const TABLES = [
  "users",
  "inventory_items",
  "transactions",
  "purchase_details",
  "audit_log",
];

// GET /api/backup — list all backups
router.get("/", (req, res) => {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          size_bytes: stat.size,
          created_at: stat.birthtime,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ data: files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list backups" });
  }
});

// POST /api/backup — create a new backup
router.post("/", async (req, res) => {
  try {
    const dump = { created_at: new Date().toISOString(), tables: {} };

    for (const table of TABLES) {
      try {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        dump.tables[table] = rows;
      } catch {
        dump.tables[table] = [];
      }
    }

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(dump, null, 2), "utf8");

    res.json({ message: "Backup created", filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Backup failed" });
  }
});

// GET /api/backup/:filename — download
router.get("/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    if (
      !filename.endsWith(".json") ||
      !/^backup_[\w\-]+\.json$/.test(filename)
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath))
      return res.status(404).json({ error: "Backup not found" });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.sendFile(filepath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});

// DELETE /api/backup/:filename — delete
router.delete("/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    if (
      !filename.endsWith(".json") ||
      !/^backup_[\w\-]+\.json$/.test(filename)
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath))
      return res.status(404).json({ error: "Backup not found" });

    fs.unlinkSync(filepath);
    res.json({ message: "Backup deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
