CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- 1. Tables Structure
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'manager', 'viewer') NOT NULL DEFAULT 'viewer',
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    last_login    TIMESTAMP    NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    count_beginning INT          NOT NULL DEFAULT 0,
    lead_time       INT          NOT NULL DEFAULT 3,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    date             DATETIME    NOT NULL,
    inventory_id     INT         NOT NULL,
    transaction_type ENUM('Purchased','Sold','Adjustment') NOT NULL,
    quantity         INT         NOT NULL DEFAULT 1,
    invoice_number   VARCHAR(100),
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_details (
    transaction_id INT PRIMARY KEY,
    supplier_name  VARCHAR(255) NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- 2. Seed Data
INSERT INTO users (id, username, password_hash, role, is_active, last_login, created_at, updated_at) VALUES
(1, 'admin', '$2a$12$4m.qtdu72nreqzanewnui.nxqks4d8gmfjroqeauoxapq7ohjje72', 'admin', 1, '2026-03-18 02:52:46', '2026-03-12 02:05:57', '2026-03-18 02:52:46'),
(2, 'manager', '$2a$12$k901ebb4fzvc74ebee6ahujrb4jpjqypas/oyu9.8sgz4jayj6.uw', 'manager', 1, '2026-03-17 01:40:53', '2026-03-17 00:59:09', '2026-03-17 02:08:19'),
(3, 'viewer', '$2a$12$dpcaj1tnan1f2xnavxhrfuam.urs4til.qqw.baklegs6hvkmzvr2', 'viewer', 1, '2026-03-17 01:05:37', '2026-03-17 01:00:18', '2026-03-17 01:05:37');

INSERT INTO inventory_items (id, name, price, count_beginning, lead_time, created_at, updated_at) VALUES
(8, 'cortisol', 67.00, 67, 3, '2026-03-16 16:09:53', '2026-03-16 16:09:53'),
(9, 'tequila', 89.00, 13, 2, '2026-03-16 23:26:18', '2026-03-16 23:26:18'),
(10, 'the long run', 88.00, 16, 4, '2026-03-17 00:00:47', '2026-03-17 00:00:57');
