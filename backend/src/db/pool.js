const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "inventory_db",
  user: process.env.DB_USER || "inventory_user",
  password: process.env.DB_PASS || "inventory_pass",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
