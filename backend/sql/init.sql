CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS inventory_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    count_beginning INT NOT NULL DEFAULT 0,
    lead_time       INT NOT NULL DEFAULT 3,   -- only manual input; supplier lead time in days
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    date             DATE NOT NULL,
    inventory_id     INT NOT NULL,
    transaction_type ENUM('Purchased', 'Sold') NOT NULL,
    quantity         INT NOT NULL DEFAULT 1,
    invoice_number   VARCHAR(100),
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- Seed inventory (only the fields we keep)
INSERT INTO inventory_items (name, count_beginning, lead_time) VALUES
('Inventory 1', 100, 3),
('Inventory 2', 100, 3),
('Inventory 3', 100, 3),
('Inventory 4', 100, 3);

-- Seed transactions from Excel
INSERT INTO transactions (date, inventory_id, transaction_type, quantity, invoice_number) VALUES
('2026-02-20', 1, 'Purchased', 40, '00000'),
('2026-02-24', 2, 'Purchased', 100, NULL),
('2026-02-25', 1, 'Sold', 50, '123'),
('2026-02-26', 2, 'Sold', 50, NULL);
