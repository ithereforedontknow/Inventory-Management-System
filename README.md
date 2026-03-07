# StockPilot — Inventory Management System

A professional full-stack inventory management application built with React + PHP + MySQL, containerized with Docker.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, DaisyUI, Recharts, Lucide Icons
- **Backend**: PHP 8.2, Apache
- **Database**: MySQL 8.0
- **Infrastructure**: Docker & Docker Compose

## Features

- 📊 **Dashboard** — Real-time stats: total items, low stock alerts, purchase/sale totals, monthly chart, recent activity
- 📦 **Inventory Management** — Full CRUD for inventory items with search, pagination, and low-stock highlighting
- 🔄 **Transactions** — Log purchased/sold transactions with invoice numbers, filter by type
- 📈 **Reports** — Trend charts, top-selling items, stock distribution pie chart, low stock alerts

## Quick Start

### Prerequisites
- [Docker](https://www.docker.com/get-started) & Docker Compose installed

### Run the app

```bash
# Clone / navigate to the project directory
cd inventory-app

# Start all services
docker compose up --build

# App will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080/api
```

The database is automatically seeded with sample data from the original Excel file.

### Stop

```bash
docker compose down

# To also remove the database volume:
docker compose down -v
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items (supports `?search=`, `?page=`, `?limit=`) |
| POST | `/api/inventory` | Create new item |
| PUT | `/api/inventory/{id}` | Update item |
| DELETE | `/api/inventory/{id}` | Delete item |
| GET | `/api/transactions` | List transactions (supports `?type=`, `?inventory_id=`) |
| POST | `/api/transactions` | Record new transaction |
| PUT | `/api/transactions/{id}` | Update transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/dashboard` | Dashboard statistics |

## Project Structure

```
inventory-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── apache.conf
│   ├── public/
│   │   ├── index.php       # Router entry point
│   │   └── .htaccess
│   ├── src/
│   │   ├── Database.php
│   │   ├── Router.php
│   │   ├── InventoryController.php
│   │   └── TransactionController.php
│   └── sql/
│       └── init.sql        # DB schema + seed data
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── components/
    │   │   └── Sidebar.jsx
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── Inventory.jsx
    │       ├── Transactions.jsx
    │       └── Reports.jsx
    └── ...config files
```
