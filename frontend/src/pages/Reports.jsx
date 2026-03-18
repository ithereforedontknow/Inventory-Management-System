import { useEffect, useState, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "../api";
import {
  TrendingUp,
  Package,
  Download,
  AlertTriangle,
  ShoppingCart,
  Filter,
  X,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-base-300 border border-base-content/10 rounded-xl p-3 text-sm">
        <p className="font-semibold mb-1 text-base-content/70">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function downloadCSV(url, filename) {
  const token = localStorage.getItem("sp_token");
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      toast.success("Download started");
    })
    .catch(() => toast.error("Export failed"));
}

// ── Print reorder suggestions ─────────────────────────────────────────────────
function printReorderSuggestions(lowStock) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows = lowStock
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td class="${parseInt(item.count_ending) < 0 ? "neg" : "warn"}">${parseInt(item.count_ending)}</td>
      <td>${parseFloat(item.reorder_point).toFixed(0)}</td>
      <td>${parseFloat(item.safety_stock).toFixed(0)}</td>
      <td>${item.lead_time}d</td>
      <td class="suggested">${item.suggested_order} units</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Reorder Suggestions — ${date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a2e; padding: 32px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
        .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; font-family: monospace; }
        .meta { text-align: right; font-size: 11px; color: #9ca3af; font-family: monospace; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #92400e; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f3f4f6; }
        th { padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
        th:not(:first-child) { text-align: right; }
        td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-family: monospace; }
        td:first-child { font-family: inherit; font-weight: 600; }
        td:not(:first-child) { text-align: right; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background: #f9fafb; }
        .warn { color: #d97706; font-weight: 700; }
        .neg { color: #dc2626; font-weight: 700; }
        .suggested { color: #d97706; font-weight: 700; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; font-family: monospace; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 16px; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">Reorder Suggestions</div>
          <div class="subtitle">Items where ending stock ≤ reorder point</div>
        </div>
        <div class="meta">
          <div>Generated: ${date}</div>
          <div>${lowStock.length} item${lowStock.length !== 1 ? "s" : ""} need reordering</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Current Stock</th>
            <th>Reorder Point</th>
            <th>Safety Stock</th>
            <th>Lead Time</th>
            <th>Suggested Order</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <span>StockPilot · Reorder Report</span>
        <span>${date}</span>
      </div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay so styles load before print dialog
  setTimeout(() => {
    win.print();
  }, 400);
}

export default function Reports() {
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = dateFrom || dateTo;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 1000, page: 1 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [inv, txRes] = await Promise.all([
        api.getInventory({ limit: 200 }),
        api.getTransactions(params),
      ]);
      setInventory(inv.data);
      setTransactions(txRes.data);
    } catch {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = (() => {
    const map = {};
    for (const tx of transactions) {
      const month = tx.date?.substring(0, 7);
      if (!month) continue;
      if (!map[month]) map[month] = { month };
      map[month][tx.transaction_type] =
        (map[month][tx.transaction_type] || 0) + parseInt(tx.quantity);
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  })();

  const topSellingMap = {};
  for (const tx of transactions) {
    if (tx.transaction_type !== "Sold") continue;
    if (!topSellingMap[tx.item_name]) topSellingMap[tx.item_name] = 0;
    topSellingMap[tx.item_name] += parseInt(tx.quantity);
  }
  const topSelling = Object.entries(topSellingMap)
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  const pieData = inventory
    .filter((i) => parseInt(i.count_ending) > 0)
    .map((i) => ({ name: i.name, value: parseInt(i.count_ending) }));

  const lowStock = inventory
    .filter(
      (i) =>
        parseFloat(i.reorder_point) > 0 &&
        parseInt(i.count_ending) <= parseFloat(i.reorder_point),
    )
    .map((i) => ({
      ...i,
      suggested_order: Math.max(
        0,
        Math.ceil(parseFloat(i.reorder_point) * 2 - parseInt(i.count_ending)),
      ),
    }))
    .sort((a, b) => parseInt(a.count_ending) - parseInt(b.count_ending));

  const negStock = inventory.filter((i) => parseInt(i.count_ending) < 0);

  const exportParams = new URLSearchParams();
  if (dateFrom) exportParams.set("date_from", dateFrom);
  if (dateTo) exportParams.set("date_to", dateTo);
  const exportQs = exportParams.toString();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Reports
          </h1>
          <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
            Analytics & exports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() =>
              downloadCSV(
                `/api/export/inventory`,
                `inventory_${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          >
            <Download size={13} />
            <span className="hidden sm:inline">Inventory CSV</span>
            <span className="sm:hidden">Inv.</span>
          </button>
          <button
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() =>
              downloadCSV(
                `/api/export/transactions${exportQs ? "?" + exportQs : ""}`,
                `transactions_${dateFrom || "all"}.csv`,
              )
            }
          >
            <Download size={13} />
            <span className="hidden sm:inline">Transactions CSV</span>
            <span className="sm:hidden">Tx.</span>
          </button>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-base-content/40" />
          <span className="text-xs text-base-content/40 font-mono">
            Date range:
          </span>
        </div>
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
              setDateFrom("");
              setDateTo("");
            }}
          >
            <X size={12} /> Clear
          </button>
        )}
        {hasFilters && (
          <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded-lg">
            Trend & top selling filtered · Stock distribution shows current
            levels
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <>
          {negStock.length > 0 && (
            <div className="alert alert-error mb-4 text-sm">
              <AlertTriangle size={16} />
              <span>
                <strong>
                  {negStock.length} item
                  {negStock.length > 1 ? "s have" : " has"} negative stock:
                </strong>{" "}
                {negStock.map((i) => i.name).join(", ")}. Check your transaction
                records.
              </span>
            </div>
          )}

          {/* Trend chart */}
          <div className="glass-card p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                {hasFilters ? "Filtered Trend" : "Monthly Trend"}
              </h2>
              <span className="badge badge-outline badge-sm font-mono">
                {hasFilters
                  ? `${dateFrom || "start"} → ${dateTo || "now"}`
                  : "Last 6 months"}
              </span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gPurchased" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "#6c7086",
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: "#6c7086",
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Purchased"
                    stroke="#6366f1"
                    fill="url(#gPurchased)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Sold"
                    stroke="#f59e0b"
                    fill="url(#gSold)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-base-content/30">
                <div className="text-center">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No data for this range</p>
                </div>
              </div>
            )}
          </div>

          {/* Top selling + Pie */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-secondary" />
                Top Selling Items
                {hasFilters && (
                  <span className="badge badge-sm badge-outline font-mono">
                    filtered
                  </span>
                )}
              </h2>
              {topSelling.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topSelling} layout="vertical" barGap={2}>
                    <XAxis
                      type="number"
                      tick={{ fill: "#6c7086", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#6c7086", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="sold"
                      name="Sold"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-base-content/30">
                  <p className="text-sm">No sales in this range</p>
                </div>
              )}
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold mb-1 flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Current Stock Distribution
              </h2>
              <p className="text-xs text-base-content/40 font-mono mb-3">
                Always shows current levels
              </p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-base-content/30">
                  <p className="text-sm">No stock data</p>
                </div>
              )}
            </div>
          </div>

          {/* Reorder suggestions */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                Reorder Suggestions
              </h2>
              {lowStock.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm gap-1.5"
                  onClick={() => printReorderSuggestions(lowStock)}
                  title="Print / Save as PDF"
                >
                  <Printer size={14} />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
              )}
            </div>
            <p className="text-xs text-base-content/40 font-mono mb-4">
              Items where ending stock ≤ reorder point
            </p>

            {lowStock.length === 0 ? (
              <div className="text-center py-8 text-base-content/30">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">All items are sufficiently stocked</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr className="bg-base-300/50 text-base-content/60 text-xs uppercase tracking-wider">
                      <th>Item</th>
                      <th className="text-right">Current Stock</th>
                      <th className="text-right">Reorder Point</th>
                      <th className="text-right">Safety Stock</th>
                      <th className="text-right">Lead Time</th>
                      <th className="text-right text-warning">
                        Suggested Order
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item.id} className="hover">
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center">
                              <AlertTriangle
                                size={11}
                                className="text-warning"
                              />
                            </div>
                            <span className="font-semibold text-sm">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`text-right font-mono font-bold text-sm ${parseInt(item.count_ending) < 0 ? "text-error" : "text-warning"}`}
                        >
                          {parseInt(item.count_ending)}
                        </td>
                        <td className="text-right font-mono text-sm text-primary">
                          {parseFloat(item.reorder_point).toFixed(0)}
                        </td>
                        <td className="text-right font-mono text-sm text-base-content/60">
                          {parseFloat(item.safety_stock).toFixed(0)}
                        </td>
                        <td className="text-right font-mono text-sm text-base-content/60">
                          {item.lead_time}d
                        </td>
                        <td className="text-right font-mono font-bold text-sm text-warning">
                          {item.suggested_order} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
