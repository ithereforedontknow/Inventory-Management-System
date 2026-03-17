import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import toast from "react-hot-toast";
import {
  KeyRound,
  User,
  LogOut,
  Users,
  Shield,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Database,
  Package,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { FieldError } from "../components/FormComponents";
import { useValidation, rules } from "../hooks/useValidation";

const pwRules = {
  current_password: rules.required("Current password"),
  new_password: (v) => rules.required("New password")(v) || rules.password()(v),
  confirm_password: (v, all) =>
    rules.required("Confirm password")(v) ||
    rules.match("new_password", "Passwords")(v, all),
};

const createUserRules = {
  username: (v) =>
    rules.required("Username")(v) || rules.maxLength(100, "Username")(v),
  password: (v) => rules.required("Password")(v) || rules.password()(v),
  role: (v) =>
    !["admin", "manager", "viewer"].includes(v) ? "Please select a role" : null,
};

const ROLE_COLORS = {
  admin: "badge-error",
  manager: "badge-warning",
  viewer: "badge-info",
};

// ── Shared modal shell — portaled, styled like TransactionModal ───────────────
function ModalShell({ title, onClose, children }) {
  return createPortal(
    <div className="modal modal-open">
      <div className="modal-box bg-base-200 border border-base-300 w-full max-w-lg mx-0 sm:mx-auto rounded-none sm:rounded-2xl h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">{title}</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>,
    document.body,
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ target, onClose }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (pw.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.resetUserPassword(target.id, pw);
      toast.success(`Password reset for ${target.username}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Reset Password" onClose={onClose}>
      <p className="text-sm text-base-content/60 mb-4">
        Set a new password for <strong>{target.username}</strong>.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text text-base-content/70 text-sm">
              New Password *
            </span>
          </label>
          <input
            type="password"
            className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${error ? "input-error" : ""}`}
            placeholder="Min 8 characters"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setError("");
            }}
          />
          {error && <p className="text-error text-xs mt-1">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm sm:btn-md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm sm:btn-md"
            disabled={saving}
          >
            {saving && <span className="loading loading-spinner loading-sm" />}
            Reset Password
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Create user modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onDone }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "viewer",
  });
  const [saving, setSaving] = useState(false);
  const { errors, validate, clearField, applyServerErrors } =
    useValidation(createUserRules);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearField(k);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      await api.createUser(form);
      toast.success(`User "${form.username}" created`);
      onDone();
    } catch (err) {
      if (err.validationErrors) applyServerErrors(err.validationErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Create User" onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-3 sm:space-y-4"
      >
        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text text-base-content/70 text-sm">
              Username *
            </span>
          </label>
          <input
            type="text"
            className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.username ? "input-error" : ""}`}
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="e.g. john_doe"
          />
          <FieldError error={errors.username} />
        </div>

        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text text-base-content/70 text-sm">
              Password *
            </span>
          </label>
          <input
            type="password"
            className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.password ? "input-error" : ""}`}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Min 8 characters"
          />
          <FieldError error={errors.password} />
        </div>

        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text text-base-content/70 text-sm">
              Role *
            </span>
          </label>
          <select
            className={`select select-bordered select-sm sm:select-md bg-base-300 focus:border-primary ${errors.role ? "select-error" : ""}`}
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
          >
            <option value="viewer">Viewer — read only</option>
            <option value="manager">
              Manager — can edit inventory & transactions
            </option>
            <option value="admin">Admin — full access</option>
          </select>
          <FieldError error={errors.role} />
        </div>

        {/* Role descriptions */}
        <div className="bg-base-300/40 border border-base-content/10 rounded-xl p-3 text-xs text-base-content/50 space-y-1">
          <p>
            <strong className="text-base-content/70">Viewer</strong> — can
            browse inventory, transactions, reports. No edits.
          </p>
          <p>
            <strong className="text-base-content/70">Manager</strong> — can
            create and edit inventory and transactions.
          </p>
          <p>
            <strong className="text-base-content/70">Admin</strong> — full
            access including users, backups, and audit log.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm sm:btn-md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm sm:btn-md"
            disabled={saving}
          >
            {saving && <span className="loading loading-spinner loading-sm" />}
            Create User
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── User Management panel ─────────────────────────────────────────────────────
function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleActive(user) {
    try {
      await api.toggleUserActive(user.id);
      toast.success(
        `${user.username} ${user.is_active ? "deactivated" : "activated"}`,
      );
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function changeRole(user, role) {
    try {
      await api.changeUserRole(user.id, role);
      toast.success(`${user.username} is now ${role}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h2 className="font-bold">User Management</h2>
        </div>
        <button
          className="btn btn-primary btn-sm gap-1.5"
          onClick={() => setCreateModal(true)}
        >
          <Plus size={13} /> New User
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  u.is_active
                    ? "bg-base-300/30 border-base-300/50"
                    : "bg-base-300/10 border-base-300/20 opacity-60"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${u.is_active ? "bg-primary/20" : "bg-base-300"}`}
                >
                  <User
                    size={14}
                    className={
                      u.is_active ? "text-primary" : "text-base-content/40"
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{u.username}</span>
                    {isSelf && (
                      <span className="badge badge-ghost badge-xs">you</span>
                    )}
                    {!u.is_active && (
                      <span className="badge badge-error badge-xs">
                        inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/40 font-mono mt-0.5">
                    {u.last_login
                      ? `Last login: ${new Date(u.last_login).toLocaleDateString()}`
                      : "Never logged in"}
                  </div>
                </div>

                <select
                  className="select select-xs bg-base-300 border-base-content/10 font-semibold"
                  value={u.role}
                  disabled={isSelf}
                  onChange={(e) => changeRole(u, e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>

                <div className="flex gap-1 flex-shrink-0">
                  <button
                    className="btn btn-ghost btn-xs gap-1 hover:text-warning"
                    onClick={() => setResetTarget(u)}
                    title="Reset password"
                  >
                    <KeyRound size={12} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => !isSelf && toggleActive(u)}
                    title={u.is_active ? "Deactivate" : "Activate"}
                    disabled={isSelf}
                  >
                    {u.is_active ? (
                      <ToggleRight size={16} className="text-success" />
                    ) : (
                      <ToggleLeft size={16} className="text-base-content/30" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createModal && (
        <CreateUserModal
          onClose={() => setCreateModal(false)}
          onDone={() => {
            setCreateModal(false);
            fetchUsers();
          }}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}

// ── System Info panel ─────────────────────────────────────────────────────────
function SystemInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchInfo() {
    setLoading(true);
    try {
      const data = await api.getSystemInfo();
      setInfo(data);
    } catch {
      toast.error("Failed to load system info");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInfo();
  }, []);

  const stats = info
    ? [
        {
          label: "Inventory Items",
          value: info.inventory_count,
          icon: Package,
          color: "text-primary",
        },
        {
          label: "Transactions",
          value: info.transaction_count,
          icon: ArrowUpRight,
          color: "text-secondary",
        },
        {
          label: "Users",
          value: info.user_count,
          icon: Users,
          color: "text-warning",
        },
        {
          label: "Audit Events",
          value: info.audit_count,
          icon: Shield,
          color: "text-info",
        },
        {
          label: "Backups Stored",
          value: info.backup_count,
          icon: Database,
          color: "text-success",
        },
      ]
    : [];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-primary" />
          <h2 className="font-bold">System Info</h2>
        </div>
        <button
          className="btn btn-ghost btn-xs btn-circle"
          onClick={fetchInfo}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-base-300/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={color} />
                  <span className="text-xs text-base-content/50">{label}</span>
                </div>
                <div className={`font-mono font-bold text-lg ${color}`}>
                  {value?.toLocaleString() ?? "—"}
                </div>
              </div>
            ))}
          </div>
          {info?.last_backup ? (
            <p className="text-xs text-base-content/40 font-mono">
              Last backup: {new Date(info.last_backup).toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-warning/70 font-mono">
              No backups created yet
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
const TABS = [
  { key: "account", label: "Account", icon: User },
  { key: "users", label: "Users", icon: Users, adminOnly: true },
  { key: "system", label: "System", icon: Database, adminOnly: true },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("account");
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const { errors, validate, clearField, applyServerErrors } =
    useValidation(pwRules);

  const visibleTabs = TABS.filter(
    (t) => !t.adminOnly || user?.role === "admin",
  );

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearField(key);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      await api.changePassword(form);
      toast.success("Password changed successfully");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      if (err.validationErrors) applyServerErrors(err.validationErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const pwField = (key, label) => (
    <div className="form-control">
      <label className="label pb-1">
        <span className="label-text text-base-content/70 text-sm">{label}</span>
      </label>
      <input
        type="password"
        className={`input input-bordered bg-base-300 focus:border-primary ${errors[key] ? "input-error" : ""}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      <FieldError error={errors[key]} />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Settings
        </h1>
        <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
          Account & system configuration
        </p>
      </div>

      <div className="tabs tabs-boxed bg-base-200 mb-6 w-fit">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab gap-2 ${tab === key ? "tab-active" : ""}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <User size={18} className="text-primary" />
              </div>
              <div>
                <div className="font-bold">{user?.username}</div>
                <span
                  className={`badge badge-sm ${ROLE_COLORS[user?.role] || "badge-ghost"}`}
                >
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10"
              onClick={logout}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={16} className="text-primary" />
              <h2 className="font-bold">Change Password</h2>
            </div>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {pwField("current_password", "Current Password")}
              {pwField("new_password", "New Password")}
              {pwField("confirm_password", "Confirm New Password")}
              <button
                type="submit"
                className="btn btn-primary btn-sm sm:btn-md"
                disabled={saving}
              >
                {saving && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "users" && user?.role === "admin" && (
        <UserManagement currentUser={user} />
      )}

      {tab === "system" && user?.role === "admin" && <SystemInfo />}
    </div>
  );
}
