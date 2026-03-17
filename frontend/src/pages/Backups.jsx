import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Database,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { ConfirmModal } from "../components/FormComponents";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

async function authFetch(url, options = {}) {
  const token = localStorage.getItem("sp_token");
  return fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function fetchBackups() {
    setLoading(true);
    try {
      const res = await authFetch("/api/backup");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBackups(data.data);
    } catch {
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBackups();
  }, []);

  async function createBackup() {
    setCreating(true);
    try {
      const res = await authFetch("/api/backup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Backup created: ${data.filename}`);
      fetchBackups();
    } catch {
      toast.error("Backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(filename) {
    try {
      const res = await authFetch(`/api/backup/${filename}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  }

  async function confirmDelete() {
    try {
      const res = await authFetch(`/api/backup/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Backup deleted");
      setDeleteTarget(null);
      fetchBackups();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Database size={24} className="text-primary" />
            System Backups
          </h1>
          <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
            {backups.length} backup{backups.length !== 1 ? "s" : ""} stored ·
            JSON format
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm sm:btn-md btn-circle"
            onClick={fetchBackups}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            className="btn btn-primary btn-sm sm:btn-md gap-2"
            onClick={createBackup}
            disabled={creating}
          >
            {creating ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Plus size={15} />
            )}
            <span className="hidden sm:inline">Create Backup</span>
            <span className="sm:hidden">Backup</span>
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-base-200 border border-base-content/10 rounded-xl p-4 mb-6 flex gap-3">
        <Database size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-base-content/60 space-y-1">
          <p>
            Backups are full JSON snapshots of all database tables: inventory,
            transactions, purchase details, users, and audit log.
          </p>
          <p className="text-xs font-mono text-base-content/40">
            Stored in <code>/backups/</code> on the server. Download and store
            copies off-server for safety.
          </p>
        </div>
      </div>

      {/* Backup list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-16 text-base-content/30">
            <Database size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold mb-1">No backups yet</p>
            <p className="text-sm">
              Click "Create Backup" to make your first snapshot.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="bg-base-300/50 text-base-content/60 text-xs uppercase tracking-wider font-semibold">
                    <th>Filename</th>
                    <th>Created</th>
                    <th className="text-right">Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.filename} className="hover">
                      <td className="font-mono text-sm">{b.filename}</td>
                      <td className="text-sm text-base-content/70">
                        {formatTime(b.created_at)}
                      </td>
                      <td className="text-right font-mono text-sm text-base-content/60">
                        {formatBytes(b.size_bytes)}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs gap-1.5 hover:text-primary"
                            onClick={() => downloadBackup(b.filename)}
                          >
                            <Download size={13} /> Download
                          </button>
                          <button
                            className="btn btn-ghost btn-xs btn-circle hover:text-error"
                            onClick={() => setDeleteTarget(b.filename)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-base-300/30">
              {backups.map((b) => (
                <div
                  key={b.filename}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-base-content/70 truncate">
                      {b.filename}
                    </div>
                    <div className="text-xs text-base-content/40 mt-0.5">
                      {formatTime(b.created_at)} · {formatBytes(b.size_bytes)}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      className="btn btn-ghost btn-xs btn-circle hover:text-primary"
                      onClick={() => downloadBackup(b.filename)}
                    >
                      <Download size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-circle hover:text-error"
                      onClick={() => setDeleteTarget(b.filename)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Backup"
          message={`Permanently delete "${deleteTarget}"? This cannot be undone.`}
          confirmLabel="Delete Backup"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
