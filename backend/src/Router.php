<?php

class Router {
    private array $routes = [];

    public function get(string $path, array|callable $handler): void {
        $this->routes['GET'][$path] = $handler;
    }

    public function post(string $path, array|callable $handler): void {
        $this->routes['POST'][$path] = $handler;
    }

    public function put(string $path, array|callable $handler): void {
        $this->routes['PUT'][$path] = $handler;
    }

    public function delete(string $path, array|callable $handler): void {
        $this->routes['DELETE'][$path] = $handler;
    }

    public function dispatch(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $routes = $this->routes[$method] ?? [];

        foreach ($routes as $pattern => $handler) {
            $params = $this->match($pattern, $uri);
            if ($params === false) continue;

            if (is_callable($handler)) {
                $handler($params);
            } else {
                [$class, $action] = $handler;
                (new $class())->$action($params);
            }
            return;
        }

        http_response_code(404);
        echo json_encode(['error' => 'Not Found']);
    }

    private function match(string $pattern, string $uri): array|false {
        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';
        if (preg_match($regex, $uri, $matches)) {
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }
        return false;
    }
}
