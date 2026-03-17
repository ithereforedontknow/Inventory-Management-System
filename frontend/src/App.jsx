import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";
import Backups from "./pages/Backups";
import Login from "./pages/Login";
import Settings from "./pages/Settings";

const ROLE_LEVEL = { viewer: 1, manager: 2, admin: 3 };

// Redirects to "/" if user doesn't have the required role
function RequireRole({ minRole, children }) {
  const { user } = useAuth();
  const userLevel = ROLE_LEVEL[user?.role] ?? 0;
  const required = ROLE_LEVEL[minRole] ?? 99;
  if (userLevel < required) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (user === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );

  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );

  return (
    <div className="flex h-screen overflow-hidden bg-base-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-base-200 border-b border-base-300 sticky top-0 z-10">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="font-black text-lg logo-gradient">StockPilot</span>
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            {/* All roles */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />

            {/* Manager and above */}
            <Route
              path="/audit-log"
              element={
                <RequireRole minRole="manager">
                  <AuditLog />
                </RequireRole>
              }
            />

            {/* Admin only */}
            <Route
              path="/backups"
              element={
                <RequireRole minRole="admin">
                  <Backups />
                </RequireRole>
              }
            />

            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
