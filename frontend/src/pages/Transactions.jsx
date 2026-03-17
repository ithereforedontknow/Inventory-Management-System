import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useValidation, rules } from "../hooks/useValidation";
import { FieldError, ConfirmModal } from "../components/FormComponents";
import { useDebounce } from "../hooks/useDebounce";

const EMPTY_FORM = {
  inventory_id: "",
  date: format(new Date(), "yyyy-MM-dd"),
  transaction_type: "Purchased",
  quantity: "",
  invoice_number: "",
  notes: "",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const txRules = {
  inventory_id: (v) => (!v ? "Please select an inventory item" : null),
  transaction_type: rules.oneOf(
    ["Purchased", "Sold", "Adjustment"],
    "Transaction type",
  ),
  date: (v) => rules.required("Date")(v) || rules.dateFormat("Date")(v),
  quantity: (v) =>
    rules.required("Quantity")(v) || rules.positiveInt("Quantity")(v),
  invoice_number: rules.maxLength(100, "Invoice number"),
  notes: rules.maxLength(1000, "Notes"),
};

const TYPE_STYLE = {
  Purchased: {
    cls: "bg-primary/10 text-primary border-primary/20",
    icon: ArrowUpRight,
    label: "Purchased",
  },
  Sold: {
    cls: "bg-secondary/10 text-secondary border-secondary/20",
    icon: ArrowDownRight,
    label: "Sold",
  },
  Adjustment: {
    cls: "bg-info/10 text-info border-info/20",
    icon: RefreshCw,
    label: "Adjustment",
  },
};

const TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "Purchased", label: "Purchased" },
  { key: "Sold", label: "Sold" },
  { key: "Adjustment", label: "Adjustment" },
];

function TypeBadge({ type, size = 10 }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.Purchased;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${s.cls}`}
    >
      <Icon size={size} />
      {s.label}
    </span>
  );
}

function TransactionModal({ tx, onClose, onSaved }) {
  const [form, setForm] = useState(
    tx ? { ...tx, date: tx.date?.substring(0, 10) } : { ...EMPTY_FORM },
  );
  const [inventoryList, setInventoryList] = useState([]);
  const [saving, setSaving] = useState(false);
  const { errors, validate, clearField, applyServerErrors } =
    useValidation(txRules);

  useEffect(() => {
    api.getInventory({ limit: 200 }).then((r) => setInventoryList(r.data));
  }, []);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearField(key);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      if (tx?.id) {
        await api.updateTransaction(tx.id, form);
        toast.success("Transaction updated");
      } else {
        await api.createTransaction(form);
        toast.success("Transaction recorded");
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err.validationErrors) applyServerErrors(err.validationErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-200 border border-base-300 w-full max-w-lg mx-0 sm:mx-auto rounded-none sm:rounded-2xl h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">
            {tx?.id ? "Edit Transaction" : "New Transaction"}
          </h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-3 sm:space-y-4"
        >
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text text-base-content/70 text-sm">
                Inventory Item *
              </span>
            </label>
            <select
              className={`select select-bordered select-sm sm:select-md bg-base-300 focus:border-primary ${errors.inventory_id ? "select-error" : ""}`}
              value={form.inventory_id}
              onChange={(e) => set("inventory_id", e.target.value)}
            >
              <option value="">Select item...</option>
              {inventoryList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <FieldError error={errors.inventory_id} />
          </div>

          {form.transaction_type === "Purchased" && (
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Supplier Name *
                </span>
              </label>
              <input
                type="text"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.supplier_name ? "input-error" : ""}`}
                value={form.supplier_name || ""}
                onChange={(e) => set("supplier_name", e.target.value)}
                placeholder="Supplier name"
              />
              <FieldError error={errors.supplier_name} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Date *
                </span>
              </label>
              <input
                type="date"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.date ? "input-error" : ""}`}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
              <FieldError error={errors.date} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Type *
                </span>
              </label>
              <select
                className="select select-bordered select-sm sm:select-md bg-base-300 focus:border-primary"
                value={form.transaction_type}
                onChange={(e) => set("transaction_type", e.target.value)}
              >
                <option value="Purchased">Purchased</option>
                <option value="Sold">Sold</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          {form.transaction_type === "Adjustment" && (
            <div className="bg-info/10 border border-info/20 rounded-xl p-3 text-xs text-info/80">
              Use <strong>Adjustment</strong> for corrections, damage,
              shrinkage, or opening stock changes.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Quantity *
                </span>
              </label>
              <input
                type="number"
                min="1"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.quantity ? "input-error" : ""}`}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="Min: 1"
              />
              <FieldError error={errors.quantity} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Invoice #
                </span>
              </label>
              <input
                type="text"
                className={`input input-bordered input-sm sm:input-md bg-base-300 font-mono focus:border-primary ${errors.invoice_number ? "input-error" : ""}`}
                value={form.invoice_number}
                onChange={(e) => set("invoice_number", e.target.value)}
                placeholder="Optional"
              />
              <FieldError error={errors.invoice_number} />
            </div>
          </div>

          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text text-base-content/70 text-sm">
                Notes
              </span>
            </label>
            <textarea
              rows={2}
              className={`textarea textarea-bordered textarea-sm sm:textarea-md bg-base-300 resize-none focus:border-primary ${errors.notes ? "textarea-error" : ""}`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes..."
            />
            <FieldError error={errors.notes} />
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
              {saving && (
                <span className="loading loading-spinner loading-sm" />
              )}
              {tx?.id ? "Update" : "Record"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

function downloadCSV(url, filename) {
  const token = localStorage.getItem("sp_token");
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    })
    .catch(() => toast.error("Export failed"));
}

export default function Transactions() {
  const { user } = useAuth();
  const canEdit = user?.role === "manager" || user?.role === "admin";

  const [txs, setTxs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(itemSearch, 300);

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (typeFilter) params.type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (debouncedSearch) params.item_search = debouncedSearch;
      const res = await api.getTransactions(params);
      setTxs(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, dateFrom, dateTo, debouncedSearch]);

  useEffect(() => {
    fetchTxs();
  }, [fetchTxs]);
  useEffect(() => {
    setPage(1);
  }, [typeFilter, dateFrom, dateTo, debouncedSearch, limit]);

  async function confirmDelete() {
    try {
      await api.deleteTransaction(deleteTarget.id);
      toast.success("Transaction deleted");
      setDeleteTarget(null);
      fetchTxs();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    downloadCSV(
      `/api/export/transactions${qs ? "?" + qs : ""}`,
      `transactions_${dateFrom || "all"}.csv`,
    );
  }

  const hasFilters = typeFilter || dateFrom || dateTo || itemSearch;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Transactions
          </h1>
          <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
            {total} records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm sm:btn-md gap-1.5"
            onClick={exportCSV}
            title="Export to CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
          {/* All roles can add */}
          <button
            className="btn btn-primary btn-sm sm:btn-md gap-2"
            onClick={() => setModal("add")}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Transaction</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by item name..."
            value={itemSearch}
            className="input input-bordered input-sm sm:input-md bg-base-200 w-full pl-9 focus:border-primary"
            onChange={(e) => setItemSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-xs sm:btn-sm ${
                typeFilter === key
                  ? key === "Sold"
                    ? "btn-secondary"
                    : key === "Adjustment"
                      ? "btn-info"
                      : "btn-primary"
                  : "btn-ghost"
              }`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
          {hasFilters && (
            <button
              className="btn btn-ghost btn-xs text-base-content/40"
              onClick={() => {
                setTypeFilter("");
                setDateFrom("");
                setDateTo("");
                setItemSearch("");
              }}
            >
              <X size={12} /> Clear
            </button>
          )}
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
      </div>

      {/* Desktop table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-300/50 text-base-content/60 text-xs uppercase tracking-wider font-semibold">
                <th>Date</th>
                <th>Item</th>
                <th>Supplier</th>
                <th>Type</th>
                <th className="text-right">Qty</th>
                <th>Invoice #</th>
                <th>Notes</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-12">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </td>
                </tr>
              ) : txs.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="text-center py-12 text-base-content/30"
                  >
                    <ArrowUpRight
                      size={36}
                      className="mx-auto mb-3 opacity-30"
                    />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} className="hover">
                    <td className="font-mono text-xs text-base-content/70">
                      {tx.date?.substring(0, 10)}
                    </td>
                    <td className="font-semibold text-sm">{tx.item_name}</td>
                    <td className="text-xs text-base-content/60">
                      {tx.supplier_name || "—"}
                    </td>
                    <td>
                      <TypeBadge type={tx.transaction_type} />
                    </td>
                    <td
                      className={`text-right font-mono font-bold text-sm ${tx.transaction_type === "Purchased" ? "text-primary" : tx.transaction_type === "Sold" ? "text-secondary" : "text-info"}`}
                    >
                      {tx.transaction_type === "Purchased"
                        ? "+"
                        : tx.transaction_type === "Sold"
                          ? "-"
                          : "±"}
                      {tx.quantity}
                    </td>
                    <td className="font-mono text-xs text-base-content/60">
                      {tx.invoice_number || "—"}
                    </td>
                    <td className="text-xs text-base-content/60 max-w-xs truncate">
                      {tx.notes || "—"}
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs btn-circle hover:text-primary"
                            onClick={() => setModal(tx)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs btn-circle hover:text-error"
                            onClick={() => setDeleteTarget(tx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
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
        ) : txs.length === 0 ? (
          <div className="text-center py-12 text-base-content/30">
            <ArrowUpRight size={36} className="mx-auto mb-3 opacity-30" />
            <p>No transactions found</p>
          </div>
        ) : (
          txs.map((tx) => (
            <div key={tx.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-sm">{tx.item_name}</div>
                  <div className="font-mono text-xs text-base-content/50 mt-0.5">
                    {tx.date?.substring(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TypeBadge type={tx.transaction_type} />
                  {canEdit && (
                    <>
                      <button
                        className="btn btn-ghost btn-xs btn-circle hover:text-primary"
                        onClick={() => setModal(tx)}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-circle hover:text-error"
                        onClick={() => setDeleteTarget(tx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div
                  className={`text-xl font-black ${tx.transaction_type === "Purchased" ? "text-primary" : tx.transaction_type === "Sold" ? "text-secondary" : "text-info"}`}
                >
                  {tx.transaction_type === "Purchased"
                    ? "+"
                    : tx.transaction_type === "Sold"
                      ? "-"
                      : "±"}
                  {tx.quantity}
                </div>
                {tx.invoice_number && (
                  <div className="font-mono text-xs text-base-content/50">
                    #{tx.invoice_number}
                  </div>
                )}
              </div>
              {tx.supplier_name && (
                <div className="text-xs text-base-content/50 mt-1">
                  {tx.supplier_name}
                </div>
              )}
              {tx.notes && (
                <div className="text-xs text-base-content/40 mt-1 truncate">
                  {tx.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
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
                className={`btn btn-xs font-mono ${
                  limit === n ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setLimit(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {pages > 1 && (
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
        )}
      </div>

      {modal && (
        <TransactionModal
          tx={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchTxs}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Transaction"
          message={`Delete this ${deleteTarget.transaction_type?.toLowerCase()} of ${deleteTarget.quantity} unit(s)?`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
