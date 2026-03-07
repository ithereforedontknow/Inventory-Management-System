import { useEffect, useState } from "react";
import { api } from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Package, AlertTriangle } from "lucide-react";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#f38ba8", "#89dceb"];

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

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getInventory({ limit: 100 })])
      .then(([d, inv]) => {
        setDashboard(d);
        setInventory(inv.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );

  // Monthly chart data
  const monthlyData = (() => {
    if (!dashboard?.monthly_stats?.length) return [];
    const map = {};
    for (const s of dashboard.monthly_stats) {
      if (!map[s.month]) map[s.month] = { month: s.month };
      map[s.month][s.transaction_type] = parseInt(s.total);
    }
    return Object.values(map);
  })();

  // Top items by sales
  const topSales = [...inventory]
    .filter((i) => parseInt(i.total_sold) > 0)
    .sort((a, b) => parseInt(b.total_sold) - parseInt(a.total_sold))
    .slice(0, 8);

  // Pie: purchased vs sold
  const pieData = [
    {
      name: "In Stock",
      value: inventory.reduce(
        (s, i) => s + Math.max(0, parseInt(i.count_ending || 0)),
        0,
      ),
    },
    { name: "Sold", value: parseInt(dashboard?.total_sold || 0) },
  ];

  // Low stock items
  const lowStockItems = inventory.filter(
    (i) =>
      i.reorder_point > 0 &&
      parseInt(i.count_ending) <= parseInt(i.reorder_point),
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Reports</h1>
        <p className="text-base-content/50 mt-1 font-mono text-sm">
          Analytics & inventory insights
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-1">Monthly Trend</h2>
          <p className="text-sm text-base-content/40 mb-5">
            Purchases vs Sales over time
          </p>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gpurch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gsold" x1="0" y1="0" x2="0" y2="1">
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Purchased"
                  stroke="#6366f1"
                  fill="url(#gpurch)"
                  strokeWidth={2}
                  name="Purchased"
                />
                <Area
                  type="monotone"
                  dataKey="Sold"
                  stroke="#f59e0b"
                  fill="url(#gsold)"
                  strokeWidth={2}
                  name="Sold"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-base-content/30 text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Stock Distribution Pie */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-1">Stock Distribution</h2>
          <p className="text-sm text-base-content/40 mb-5">
            Current stock vs total sold
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              {/* <Tooltip
                formatter={(v) => v.toLocaleString()}
                contentStyle={{
                  background: "#232338",
                  border: "1px solid #2a2a40",
                  borderRadius: 12,
                }}
              />*/}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Top Selling Items
          </h2>
          {topSales.length > 0 ? (
            <div className="space-y-3">
              {topSales.map((item, idx) => {
                const maxSold = parseInt(topSales[0]?.total_sold || 1);
                const pct = (parseInt(item.total_sold) / maxSold) * 100;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-base-content/30 w-5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="font-mono text-secondary font-bold">
                          {item.total_sold}
                        </span>
                      </div>
                      <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-base-content/30 py-8 text-sm">
              No sales data yet
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-error" />
            Low Stock Alerts
            {lowStockItems.length > 0 && (
              <span className="badge badge-error badge-sm ml-1">
                {lowStockItems.length}
              </span>
            )}
          </h2>
          {lowStockItems.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-error/10 border border-error/20 rounded-xl"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-base-content/50 font-mono">
                      Reorder at: {item.reorder_point}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-error num">
                      {parseInt(item.count_ending || 0)}
                    </div>
                    <div className="text-xs text-base-content/50">in stock</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-base-content/30 py-8">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">All items are well-stocked</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
