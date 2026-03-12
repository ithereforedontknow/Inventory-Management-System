CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    last_login    TIMESTAMP    NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    price           FLOAT(10,2) NOT NULL DEFAULT 0.00,
    count_beginning INT          NOT NULL DEFAULT 0,
    lead_time       INT          NOT NULL DEFAULT 3,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);


-- NOTE: Admin user is seeded by seed.php at container startup, not here.
-- This avoids hardcoded bcrypt hash mismatches across PHP versions.
