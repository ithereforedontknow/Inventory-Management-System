const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth } = require("../Middleware/auth");
const { requireRole } = require("../Middleware/requireRole");
const { auditLog } = require("../helpers/auditHelper");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("admin"));

const VALID_ROLES = ["admin", "manager", "viewer"];

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, role, is_active, last_login, created_at FROM users ORDER BY created_at ASC",
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users — create user
router.post("/", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const errors = {};

    if (!username?.trim()) errors.username = ["Username is required"];
    else if (username.trim().length > 100)
      errors.username = ["Username must be 100 characters or less"];
    else if (!/^[a-zA-Z0-9_\-\.]+$/.test(username.trim()))
      errors.username = [
        "Username can only contain letters, numbers, underscores, hyphens, and dots",
      ];
    if (!password) errors.password = ["Password is required"];
    else if (password.length < 8)
      errors.password = ["Password must be at least 8 characters"];
    if (!VALID_ROLES.includes(role)) errors.role = ["Invalid role"];

    if (Object.keys(errors).length) return res.status(422).json({ errors });

    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE username = ?",
      [username.trim()],
    );
    if (count > 0)
      return res
        .status(409)
        .json({ errors: { username: ["Username already taken"] } });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)",
      [username.trim(), hash, role],
    );

    await auditLog(
      req.user,
      "CREATE",
      "user",
      result.insertId,
      `User created: ${username.trim()} (role: ${role})`,
    );

    res.status(201).json({ id: result.insertId, message: "User created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id/toggle — activate / deactivate
router.patch("/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You cannot deactivate your own account" });
    }

    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newStatus = user.is_active ? 0 : 1;
    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [
      newStatus,
      id,
    ]);

    const action = newStatus ? "activated" : "deactivated";
    await auditLog(
      req.user,
      "UPDATE",
      "user",
      id,
      `User ${action}: ${user.username}`,
    );

    res.json({ message: `User ${action}`, is_active: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/:id/role — change role
router.patch("/:id/role", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;

    if (!VALID_ROLES.includes(role))
      return res.status(422).json({ error: "Invalid role" });
    if (id === req.user.id)
      return res.status(400).json({ error: "You cannot change your own role" });

    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    await auditLog(
      req.user,
      "UPDATE",
      "user",
      id,
      `Role changed for ${user.username}`,
      { role: [user.role, role] },
    );

    res.json({ message: "Role updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users/:id/reset-password
router.post("/:id/reset-password", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res
        .status(422)
        .json({
          errors: { new_password: ["Password must be at least 8 characters"] },
        });
    }

    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      id,
    ]);

    await auditLog(
      req.user,
      "UPDATE",
      "user",
      id,
      `Password reset for user: ${user.username}`,
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
