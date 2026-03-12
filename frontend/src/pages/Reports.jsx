import { useEffect, useState } from "react";
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
      if (!r.ok) throw new Error("Export failed");
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

export default function Reports() {
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getInventory({ limit: 100 })])
      .then(([dash, inv]) => {
        setData(dash);
        setInventory(inv.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );

  const chartData = (() => {
    if (!data?.monthly_stats?.length) return [];
    const map = {};
    for (const s of data.monthly_stats) {
      if (!map[s.month]) map[s.month] = { month: s.month };
      map[s.month][s.transaction_type] = parseInt(s.total);
    }
    return Object.values(map);
  })();

  // Top selling items — by total_sold descending
  const topSelling = [...inventory]
    .filter((i) => parseInt(i.total_sold) > 0)
    .sort((a, b) => parseInt(b.total_sold) - parseInt(a.total_sold))
    .slice(0, 8)
    .map((i) => ({
      name: i.name,
      sold: parseInt(i.total_sold),
      purchased: parseInt(i.total_purchased),
    }));

  // Pie chart — current stock distribution (ending count, positive only)
  const pieData = inventory
    .filter((i) => parseInt(i.count_ending) > 0)
    .map((i) => ({ name: i.name, value: parseInt(i.count_ending) }));

  // Low stock items needing reorder
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
        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() =>
              downloadCSV(
                "/api/export/inventory",
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
                "/api/export/transactions",
                `transactions_${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          >
            <Download size={13} />
            <span className="hidden sm:inline">Transactions CSV</span>
            <span className="sm:hidden">Tx.</span>
          </button>
        </div>
      </div>

      {/* Negative stock alert */}
      {negStock.length > 0 && (
        <div className="alert alert-error mb-4 text-sm">
          <AlertTriangle size={16} />
          <span>
            <strong>
              {negStock.length} item{negStock.length > 1 ? "s have" : " has"}{" "}
              negative stock:
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
            Monthly Trend
          </h2>
          <span className="badge badge-outline badge-sm font-mono">
            Last 6 months
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
              <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 12 }} />
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
              <p className="text-sm">No data yet</p>
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
              <p className="text-sm">No sales recorded yet</p>
            </div>
          )}
        </div>

        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
            <Package size={16} className="text-primary" />
            Current Stock Distribution
          </h2>
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
        <h2 className="text-base sm:text-lg font-bold mb-1 flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          Reorder Suggestions
        </h2>
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
                  <th className="text-right text-warning">Suggested Order</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className="hover">
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center">
                          <AlertTriangle size={11} className="text-warning" />
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
    </div>
  );
}
