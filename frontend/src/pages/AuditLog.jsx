import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import toast from "react-hot-toast";
import {
  Shield,
  Package,
  ArrowUpRight,
  User,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const ACTION_STYLE = {
  CREATE: { cls: "badge-success", label: "Created" },
  UPDATE: { cls: "badge-info", label: "Updated" },
  DELETE: { cls: "badge-error", label: "Deleted" },
};

const ENTITY_STYLE = {
  inventory: { icon: Package, label: "Inventory" },
  transaction: { icon: ArrowUpRight, label: "Transaction" },
  user: { icon: User, label: "User" },
};

const ACTION_FILTERS = [
  { key: "", label: "All Actions" },
  { key: "CREATE", label: "Created" },
  { key: "UPDATE", label: "Updated" },
  { key: "DELETE", label: "Deleted" },
];

const ENTITY_FILTERS = [
  { key: "", label: "All Types" },
  { key: "inventory", label: "Inventory" },
  { key: "transaction", label: "Transaction" },
  { key: "user", label: "User" },
];

function ChangePill({ changes }) {
  if (!changes) return null;
  let parsed = changes;
  if (typeof changes === "string") {
    try {
      parsed = JSON.parse(changes);
    } catch {
      return null;
    }
  }
  const entries = Object.entries(parsed);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([field, [oldVal, newVal]]) => (
        <span
          key={field}
          className="text-xs bg-base-300/60 rounded-lg px-2 py-0.5 font-mono"
        >
          <span className="text-base-content/40">{field}:</span>{" "}
          <span className="text-error/70 line-through">{String(oldVal)}</span>
          {" → "}
          <span className="text-success/80">{String(newVal)}</span>
        </span>
      ))}
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(25);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await api.getAuditLog(params);
      setLogs(data.data);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, dateFrom, dateTo, limit]);

  const hasFilters = actionFilter || entityFilter || dateFrom || dateTo;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Shield size={24} className="text-primary" />
            Audit Log
          </h1>
          <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
            {total} events recorded
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ACTION_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-xs sm:btn-sm ${
                actionFilter === key
                  ? key === "CREATE"
                    ? "btn-success"
                    : key === "UPDATE"
                      ? "btn-info"
                      : key === "DELETE"
                        ? "btn-error"
                        : "btn-primary"
                  : "btn-ghost"
              }`}
              onClick={() => setActionFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ENTITY_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-xs sm:btn-sm ${entityFilter === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setEntityFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs text-base-content/40 font-mono">
          Date range:
        </span>
        <input
          type="date"
          className="input input-bordered input-xs sm:input-sm bg-base-200 focus:border-primary"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span className="text-base-content/40 text-xs">to</span>
        <input
          type="date"
          className="input input-bordered input-xs sm:input-sm bg-base-200 focus:border-primary"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        {hasFilters && (
          <button
            className="btn btn-ghost btn-xs text-base-content/40"
            onClick={() => {
              setActionFilter("");
              setEntityFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-300/50 text-base-content/60 text-xs uppercase tracking-wider font-semibold">
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Type</th>
                <th>Description</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-base-content/30"
                  >
                    <Shield size={36} className="mx-auto mb-3 opacity-30" />
                    <p>No activity recorded yet</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionStyle = ACTION_STYLE[log.action] || {};
                  const entityStyle = ENTITY_STYLE[log.entity] || {
                    icon: Shield,
                    label: log.entity,
                  };
                  const EntityIcon = entityStyle.icon;
                  return (
                    <tr key={log.id} className="hover align-top">
                      <td className="font-mono text-xs text-base-content/50 whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="font-semibold text-sm">{log.username}</td>
                      <td>
                        <span className={`badge badge-sm ${actionStyle.cls}`}>
                          {actionStyle.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                          <EntityIcon size={12} />
                          {entityStyle.label}
                        </div>
                      </td>
                      <td className="text-sm max-w-xs">{log.entity_label}</td>
                      <td className="max-w-sm">
                        <ChangePill changes={log.changes} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-base-content/30">
            <Shield size={36} className="mx-auto mb-3 opacity-30" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          logs.map((log) => {
            const actionStyle = ACTION_STYLE[log.action] || {};
            const entityStyle = ENTITY_STYLE[log.entity] || {
              icon: Shield,
              label: log.entity,
            };
            const EntityIcon = entityStyle.icon;
            return (
              <div key={log.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm">{log.username}</div>
                    <div className="font-mono text-xs text-base-content/40 mt-0.5">
                      {formatTime(log.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`badge badge-sm ${actionStyle.cls}`}>
                      {actionStyle.label}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-base-content/50">
                      <EntityIcon size={11} />
                      {entityStyle.label}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-base-content/80">
                  {log.entity_label}
                </div>
                <ChangePill changes={log.changes} />
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-base-content/50 font-mono">
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-base-content/40 font-mono hidden sm:inline">
                Show:
              </span>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`btn btn-xs font-mono ${limit === n ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setLimit(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
