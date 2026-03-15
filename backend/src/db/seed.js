const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function seed() {
  const cfg = {
    host: process.env.DB_HOST || "db",
    port: parseInt(process.env.DB_PORT || "3306"),
    database: process.env.DB_NAME || "inventory_db",
    user: process.env.DB_USER || "inventory_user",
    password: process.env.DB_PASS || "inventory_pass",
  };

  // Wait for MySQL to be ready
  let conn;
  for (let i = 1; i <= 30; i++) {
    try {
      conn = await mysql.createConnection(cfg);
      console.log("Connected to database.");
      break;
    } catch (e) {
      console.log(`Waiting for DB... attempt ${i}/30`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!conn) {
    console.error("Could not connect to DB");
    process.exit(1);
  }

  // Create tables
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(50)  NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
      is_active     TINYINT(1)   NOT NULL DEFAULT 1,
      last_login    TIMESTAMP    NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      name            VARCHAR(255) NOT NULL UNIQUE,
      count_beginning INT          NOT NULL DEFAULT 0,
      lead_time       INT          NOT NULL DEFAULT 3,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      date             DATE        NOT NULL,
      inventory_id     INT         NOT NULL,
      transaction_type ENUM('Purchased','Sold','Adjustment') NOT NULL,
      quantity         INT         NOT NULL DEFAULT 1,
      invoice_number   VARCHAR(100),
      notes            TEXT,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  console.log("Tables ready.");

  // Seed admin user
  const [[{ count: userCount }]] = await conn.execute(
    "SELECT COUNT(*) as count FROM users",
  );
  if (userCount === 0) {
    const adminPass = process.env.ADMIN_PASSWORD || "Admin1234";
    const hash = await bcrypt.hash(adminPass, 12);
    await conn.execute(
      "INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')",
      [hash],
    );
    console.log(`Admin user created (admin / ${adminPass})`);
  } else {
    console.log("Users already exist, skipping.");
  }

  // Seed inventory
  const [[{ count: itemCount }]] = await conn.execute(
    "SELECT COUNT(*) as count FROM inventory_items",
  );
  if (itemCount === 0) {
    await conn.execute(`
      INSERT INTO inventory_items (name, count_beginning, lead_time, price) VALUES
      ('Inventory 1', 100, 3, 10.50),
      ('Inventory 2', 100, 3, 25.00),
      ('Inventory 3', 100, 3, 5.75),
      ('Inventory 4', 100, 3, 15.20)
    `);
    await conn.execute(`
      INSERT INTO transactions (date, inventory_id, transaction_type, quantity, invoice_number) VALUES
      ('2026-02-20', 1, 'Purchased', 40, '00000'),
      ('2026-02-24', 2, 'Purchased', 100, NULL),
      ('2026-02-25', 1, 'Sold', 50, '123'),
      ('2026-02-26', 2, 'Sold', 50, NULL)
    `);
    console.log("Inventory and transactions seeded.");
  } else {
    console.log("Inventory already exists, skipping.");
  }

  await conn.end();
  console.log("Seed complete.");
}

module.exports = seed;
