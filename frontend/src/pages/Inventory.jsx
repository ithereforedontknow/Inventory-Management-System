import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  TrendingDown,
} from "lucide-react";
import { useValidation, rules } from "../hooks/useValidation";
import { FieldError, ConfirmModal } from "../components/FormComponents";

const EMPTY_FORM = { name: "", price: 0, count_beginning: 0, lead_time: 3 };

const inventoryRules = {
  name: (v) => rules.required("Name")(v) || rules.maxLength(255, "Name")(v),
  count_beginning: rules.nonNegativeInt("Beginning count"),
  lead_time: (v) => {
    if (!v && v !== 0) return "Lead time is required";
    if (!Number.isInteger(Number(v)) || Number(v) < 1)
      return "Lead time must be at least 1 day";
    if (Number(v) > 365) return "Lead time must be 365 days or less";
    return null;
  },
};

// Read-only calculated metric tile
function CalcField({ label, value, formula, color = "text-base-content" }) {
  const [tip, setTip] = useState(false);
  return (
    <div className="bg-base-300/60 rounded-xl p-3 relative">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-base-content/50">{label}</span>
        <button
          className="text-base-content/30 hover:text-base-content/60"
          onClick={() => setTip((t) => !t)}
        >
          <Info size={11} />
        </button>
      </div>
      <div className={`font-mono font-bold text-base ${color}`}>
        {typeof value === "number"
          ? value.toFixed(value % 1 === 0 ? 0 : 2)
          : value}
      </div>
      {tip && (
        <div className="absolute z-10 bottom-full left-0 mb-1 bg-base-100 border border-base-300 rounded-lg p-2 text-xs text-base-content/70 w-48 shadow-xl">
          {formula}
        </div>
      )}
    </div>
  );
}

function InventoryModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(
    item
      ? {
          name: item.name,
          price: item.price,
          count_beginning: item.count_beginning,
          lead_time: item.lead_time,
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const { errors, validate, clearField, applyServerErrors } =
    useValidation(inventoryRules);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    clearField(key);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate(form)) return;
    setSaving(true);
    try {
      if (item?.id) {
        await api.updateInventoryItem(item.id, form);
        toast.success("Item updated");
      } else {
        await api.createInventoryItem(form);
        toast.success("Item created");
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
            {item?.id ? "Edit Item" : "Add New Item"}
          </h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text text-base-content/70 text-sm">
                Item Name *
              </span>
            </label>
            <input
              type="text"
              className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.name ? "input-error" : ""}`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Inventory 5"
            />
            <FieldError error={errors.name} />
          </div>

          {/* Price + Beginning Count + Lead Time side by side */}
          <div className="grid grid-cols-3 gap-3">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Price *
                </span>
              </label>
              <input
                type="number"
                min="0"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.price ? "input-error" : ""}`}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
              <FieldError error={errors.price} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Beginning Count *
                </span>
              </label>
              <input
                type="number"
                min="0"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.count_beginning ? "input-error" : ""}`}
                value={form.count_beginning}
                onChange={(e) => set("count_beginning", e.target.value)}
              />
              <FieldError error={errors.count_beginning} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Lead Time (days) *
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                className={`input input-bordered input-sm sm:input-md bg-base-300 focus:border-primary ${errors.lead_time ? "input-error" : ""}`}
                value={form.lead_time}
                onChange={(e) => set("lead_time", e.target.value)}
              />
              <FieldError error={errors.lead_time} />
            </div>
          </div>

          {/* Calculated fields notice */}
          <div className="bg-base-300/40 border border-base-content/10 rounded-xl p-3 text-xs text-base-content/50 flex gap-2">
            <Info size={13} className="flex-shrink-0 mt-0.5 text-primary/60" />
            <span>
              <strong className="text-base-content/70">
                Avg Daily Usage, Max Sales, Safety Stock
              </strong>{" "}
              and{" "}
              <strong className="text-base-content/70">Reorder Point</strong>{" "}
              are automatically calculated from your transaction history — no
              manual entry needed.
            </span>
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
              {item?.id ? "Update" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

// Expanded detail row shown on click (desktop)
function DetailRow({ item }) {
  const isNegative = parseInt(item.count_ending) < 0;
  return (
    <tr className="bg-base-300/20">
      <td colSpan={9} className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CalcField
            label="Avg Daily Usage"
            value={parseFloat(item.avg_daily_usage)}
            formula="Total units sold ÷ number of distinct days with a sale"
            color="text-info"
          />
          <CalcField
            label="Max Sales"
            value={parseInt(item.max_sales)}
            formula="Highest single-transaction sold quantity for this item"
            color="text-warning"
          />
          <CalcField
            label="Safety Stock"
            value={parseFloat(item.safety_stock)}
            formula="Lead time × (Max Sales − Avg Daily Usage)"
            color="text-success"
          />
          <CalcField
            label="Reorder Point"
            value={parseFloat(item.reorder_point)}
            formula="(Avg Daily Usage × Lead Time) + Safety Stock"
            color="text-primary"
          />
        </div>
        {isNegative && (
          <div className="mt-2 flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
            <TrendingDown size={13} />
            <span>
              ⚠️ Ending stock is negative — more units have been sold than are
              available. Check your transaction records.
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getInventory({ page, limit: 15, search });
      setItems(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  async function confirmDelete() {
    try {
      await api.deleteInventoryItem(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const isLowStock = (item) =>
    parseFloat(item.reorder_point) > 0 &&
    parseInt(item.count_ending) < parseFloat(item.reorder_point);
  const isNegative = (item) => parseInt(item.count_ending) < 0;

  const calculateToPurchase = (item) => {
    return isLowStock(item)
      ? Math.max(
          0,
          parseFloat(item.reorder_point) - parseInt(item.count_ending),
        )
      : 0;
  };
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Inventory
          </h1>
          <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
            {total} items tracked
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm sm:btn-md gap-2"
          onClick={() => setModal("add")}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add Item</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="relative mb-4">
        {/* <Search
          size={15}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40"
        />*/}
        <input
          type="text"
          placeholder="Search inventory..."
          value={search}
          className="input input-bordered input-sm sm:input-md bg-base-200 w-full pl-10 focus:border-primary"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-base-content/40 mb-4 font-mono">
        Click any row to see calculated metrics (Avg Daily Usage, Max Sales,
        Safety Stock, Reorder Point)
      </p>

      {/* ── Desktop Table ── */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-300/50 text-base-content/60 text-xs uppercase tracking-wider font-semibold">
                <th>Item</th>
                <th className="text-right">Price</th>
                <th className="text-right">Beginning</th>
                <th className="text-right">Lead Time</th>
                <th className="text-right text-success">Purchased</th>
                <th className="text-right text-secondary">Sold</th>
                <th className="text-right">Ending</th>
                <th className="text-right text-primary">Reorder Pt.</th>
                <th>Status</th>
                <th className="text-right text-error">To Purchase</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <span className="loading loading-spinner loading-md text-primary" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-base-content/30"
                  >
                    <Package size={36} className="mx-auto mb-3 opacity-30" />
                    <p>No items found</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const low = isLowStock(item);
                  const neg = isNegative(item);
                  const open = expanded === item.id;
                  return [
                    <tr
                      key={item.id}
                      className={`hover cursor-pointer ${open ? "bg-base-300/30" : ""}`}
                      onClick={() => setExpanded(open ? null : item.id)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${neg ? "bg-error/30" : low ? "bg-warning/20" : "bg-primary/10"}`}
                          >
                            {neg || low ? (
                              <AlertTriangle
                                size={13}
                                className={neg ? "text-error" : "text-warning"}
                              />
                            ) : (
                              <Package size={13} className="text-primary" />
                            )}
                          </div>
                          <span className="font-semibold text-sm">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right font-mono text-sm text-base-content/70">
                        {parseFloat(item.price)}
                      </td>
                      <td className="text-right font-mono text-sm text-base-content/70">
                        {parseInt(item.count_beginning)}
                      </td>
                      <td className="text-right font-mono text-sm text-base-content/60">
                        {item.lead_time}d
                      </td>
                      <td className="text-right font-mono text-sm text-success">
                        +{parseInt(item.total_purchased)}
                      </td>
                      <td className="text-right font-mono text-sm text-secondary">
                        -{parseInt(item.total_sold)}
                      </td>
                      <td
                        className={`text-right font-mono font-bold text-sm ${neg ? "text-error" : low ? "text-warning" : ""}`}
                      >
                        {parseInt(item.count_ending)}
                        {neg && (
                          <span className="ml-1 text-error text-xs">⚠</span>
                        )}
                      </td>
                      <td className="text-right font-mono text-sm text-primary">
                        {parseFloat(item.reorder_point).toFixed(0)}
                      </td>
                      <td>
                        {neg ? (
                          <span className="badge badge-error badge-sm">
                            NEG
                          </span>
                        ) : low ? (
                          <span className="badge badge-warning badge-sm">
                            LOW
                          </span>
                        ) : (
                          <span className="badge badge-success badge-sm">
                            OK
                          </span>
                        )}
                      </td>
                      <td
                        className="text-right font-mono text-sm text-error"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {calculateToPurchase(item)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs btn-circle hover:text-primary"
                            onClick={() => setModal(item)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs btn-circle hover:text-error"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>,
                    open && <DetailRow key={`detail-${item.id}`} item={item} />,
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-base-content/30">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p>No items found</p>
          </div>
        ) : (
          items.map((item) => {
            const low = isLowStock(item);
            const neg = isNegative(item);
            const open = expanded === item.id;
            return (
              <div
                key={item.id}
                className={`glass-card p-4 border ${neg ? "border-error/40" : low ? "border-warning/30" : "border-base-300/50"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${neg ? "bg-error/20" : low ? "bg-warning/20" : "bg-primary/10"}`}
                    >
                      {neg || low ? (
                        <AlertTriangle
                          size={14}
                          className={neg ? "text-error" : "text-warning"}
                        />
                      ) : (
                        <Package size={14} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-xs text-base-content/40 font-mono">
                        Lead time: {item.lead_time}d
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {neg ? (
                      <span className="badge badge-error badge-sm font-mono">
                        NEG
                      </span>
                    ) : low ? (
                      <span className="badge badge-warning badge-sm font-mono">
                        LOW
                      </span>
                    ) : (
                      <span className="badge badge-success badge-sm font-mono">
                        OK
                      </span>
                    )}
                    <button
                      className="btn btn-ghost btn-xs btn-circle hover:text-primary"
                      onClick={() => setModal(item)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs btn-circle hover:text-error"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Stock numbers */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    {
                      label: "Beginning",
                      value: parseInt(item.count_beginning),
                      cls: "text-base-content/70",
                    },
                    {
                      label: "Purchased",
                      value: `+${parseInt(item.total_purchased)}`,
                      cls: "text-success",
                    },
                    {
                      label: "Sold",
                      value: `-${parseInt(item.total_sold)}`,
                      cls: "text-secondary",
                    },
                    {
                      label: "Ending",
                      value: parseInt(item.count_ending),
                      cls: neg
                        ? "text-error font-bold"
                        : low
                          ? "text-warning font-bold"
                          : "font-bold",
                    },
                    {
                      label: "Reorder Pt",
                      value: parseFloat(item.reorder_point).toFixed(0),
                      cls: "text-primary",
                    },
                    {
                      label: "Lead Time",
                      value: `${item.lead_time}d`,
                      cls: "text-base-content/60",
                    },
                  ].map(({ label, value, cls }) => (
                    <div
                      key={label}
                      className="bg-base-300/40 rounded-lg p-2 text-center"
                    >
                      <div className="text-xs text-base-content/40 mb-0.5">
                        {label}
                      </div>
                      <div className={`font-mono font-semibold text-sm ${cls}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculated metrics toggle */}
                <button
                  className="w-full text-xs text-base-content/40 hover:text-base-content/60 flex items-center justify-center gap-1 py-1"
                  onClick={() => setExpanded(open ? null : item.id)}
                >
                  <Info size={11} /> {open ? "Hide" : "Show"} calculated metrics
                </button>

                {open && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <CalcField
                      label="Avg Daily Usage"
                      value={parseFloat(item.avg_daily_usage)}
                      formula="Total sold ÷ distinct sale days"
                      color="text-info"
                    />
                    <CalcField
                      label="Max Sales"
                      value={parseInt(item.max_sales)}
                      formula="Highest single-transaction qty sold"
                      color="text-warning"
                    />
                    <CalcField
                      label="Safety Stock"
                      value={parseFloat(item.safety_stock)}
                      formula="Lead time × (Max Sales − Avg Daily Usage)"
                      color="text-success"
                    />
                    <CalcField
                      label="Reorder Point"
                      value={parseFloat(item.reorder_point)}
                      formula="(Avg Daily Usage × Lead Time) + Safety Stock"
                      color="text-primary"
                    />
                    {neg && (
                      <div className="col-span-2 flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                        <TrendingDown size={12} />
                        <span>
                          Ending stock is negative — check your transactions.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-base-content/50 font-mono">
            Page {page} of {pages}
          </span>
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

      {modal && (
        <InventoryModal
          item={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchItems}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Item"
          message={`Delete "${deleteTarget.name}"? All related transactions will also be permanently removed.`}
          confirmLabel="Delete Item"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
