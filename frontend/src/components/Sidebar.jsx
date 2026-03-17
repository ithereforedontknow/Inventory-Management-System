import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  TrendingUp,
  Boxes,
  Settings,
  X,
  LogOut,
  DatabaseBackup,
  FileClock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLE_LEVEL = { viewer: 1, manager: 2, admin: 3 };

const ALL_LINKS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", minRole: "viewer" },
  { to: "/inventory", icon: Package, label: "Inventory", minRole: "viewer" },
  {
    to: "/transactions",
    icon: ArrowLeftRight,
    label: "Transactions",
    minRole: "viewer",
  },
  { to: "/reports", icon: TrendingUp, label: "Reports", minRole: "viewer" },
  { to: "/audit-log", icon: FileClock, label: "Audit Log", minRole: "manager" },
  { to: "/backups", icon: DatabaseBackup, label: "Backups", minRole: "admin" },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  const userLevel = ROLE_LEVEL[user?.role] ?? 0;
  const visibleLinks = ALL_LINKS.filter(
    ({ minRole }) => userLevel >= (ROLE_LEVEL[minRole] ?? 99),
  );

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 min-h-screen bg-base-200 border-r border-base-300
        flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      <div className="p-6 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Boxes size={20} className="text-primary" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight logo-gradient">
              StockPilot
            </div>
            <div className="text-xs text-base-content/40 font-mono -mt-1">
              Inventory Management
            </div>
          </div>
        </div>
        <button
          className="lg:hidden btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <nav className="p-4 flex flex-col gap-1 flex-1">
        <div className="text-xs font-semibold text-base-content/30 uppercase tracking-widest mb-2 px-4">
          Menu
        </div>
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="text-xs font-semibold text-base-content/30 uppercase tracking-widest mb-2 px-4 mt-4">
          Account
        </div>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-base-300">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {user?.username}
            </div>
            <div className="text-xs text-base-content/40 font-mono capitalize">
              {user?.role}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
