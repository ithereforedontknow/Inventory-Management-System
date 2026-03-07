<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Middleware/ErrorHandler.php';
ErrorHandler::register();

require_once __DIR__ . '/../src/Middleware/CorsMiddleware.php';
require_once __DIR__ . '/../src/Middleware/SecurityHeaders.php';
require_once __DIR__ . '/../src/Validation/Validator.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Router.php';
require_once __DIR__ . '/../src/InventoryController.php';
require_once __DIR__ . '/../src/TransactionController.php';

CorsMiddleware::handle();
SecurityHeaders::apply();

$router = new Router();

// Health check
$router->get('/api/health', function(array $p): void {
    echo json_encode(['status' => 'ok', 'timestamp' => date('c')]);
});

// Inventory
$router->get('/api/inventory',          [InventoryController::class, 'index']);
$router->get('/api/inventory/{id}',     [InventoryController::class, 'show']);
$router->post('/api/inventory',         [InventoryController::class, 'store']);
$router->put('/api/inventory/{id}',     [InventoryController::class, 'update']);
$router->delete('/api/inventory/{id}',  [InventoryController::class, 'destroy']);

// Transactions
$router->get('/api/transactions',         [TransactionController::class, 'index']);
$router->get('/api/transactions/{id}',    [TransactionController::class, 'show']);
$router->post('/api/transactions',        [TransactionController::class, 'store']);
$router->put('/api/transactions/{id}',    [TransactionController::class, 'update']);
$router->delete('/api/transactions/{id}', [TransactionController::class, 'destroy']);

// Dashboard
$router->get('/api/dashboard', [InventoryController::class, 'dashboard']);

$router->dispatch();
