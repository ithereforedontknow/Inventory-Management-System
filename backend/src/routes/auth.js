const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { signToken, requireAuth } = require("../Middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = 1",
      [username.trim()],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ error: "Both current and new password are required" });
    }
    if (new_password.length < 8) {
      return res
        .status(422)
        .json({
          errors: { new_password: ["Password must be at least 8 characters"] },
        });
    }

    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = rows[0];

    if (
      !user ||
      !(await bcrypt.compare(current_password, user.password_hash))
    ) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      req.user.id,
    ]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
