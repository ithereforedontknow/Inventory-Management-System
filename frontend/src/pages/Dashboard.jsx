import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  DollarSign,
} from "lucide-react";
import { api } from "../api";
import { format } from "date-fns";

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

function formatCurrency(val) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
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

  const stats = [
    {
      label: "Total Items",
      value: data?.total_items ?? 0,
      display: (data?.total_items ?? 0).toLocaleString(),
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "Stock Value",
      value: data?.stock_value ?? 0,
      display: formatCurrency(data?.stock_value ?? 0),
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
    {
      label: "Low Stock Alerts",
      value: data?.low_stock_count ?? 0,
      display: (data?.low_stock_count ?? 0).toLocaleString(),
      icon: AlertTriangle,
      color: "text-error",
      bg: "bg-error/10",
      border: "border-error/20",
      glow: (data?.low_stock_count ?? 0) > 0,
    },
    {
      label: "Total Purchased",
      value: data?.total_purchased ?? 0,
      display: (data?.total_purchased ?? 0).toLocaleString(),
      icon: ArrowUpRight,
      color: "text-info",
      bg: "bg-info/10",
      border: "border-info/20",
    },
    {
      label: "Total Sold",
      value: data?.total_sold ?? 0,
      display: (data?.total_sold ?? 0).toLocaleString(),
      icon: ArrowDownRight,
      color: "text-secondary",
      bg: "bg-secondary/10",
      border: "border-secondary/20",
    },
  ];

  const lowStockItems = data?.low_stock_items ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Dashboard
        </h1>
        <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">
          {format(new Date(), "EEEE, MMMM d, yyyy")} · Real-time overview
        </p>
      </div>

      {/* Stats Grid — 2 cols mobile, 3 cols md, 5 cols xl */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {stats.map(
          ({ label, display, icon: Icon, color, bg, border, glow }) => (
            <div
              key={label}
              className={`stat-card border ${border} ${glow ? "glow-error" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-base-content/50 text-xs sm:text-sm font-medium mb-1 truncate">
                    {label}
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-black num ${color}`}
                  >
                    {display}
                  </div>
                </div>
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0 ml-2`}
                >
                  <Icon size={16} className={`sm:w-5 sm:h-5 ${color}`} />
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-6 mb-4">
        <div className="xl:col-span-3 glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold">Monthly Activity</h2>
            <span className="badge badge-outline badge-sm font-mono">
              Last 6 months
            </span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
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
                <Bar dataKey="Purchased" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sold" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-base-content/30">
              <div className="text-center">
                <Package size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity data yet</p>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 glass-card p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold mb-4">
            Recent Activity
          </h2>
          <div className="space-y-2 overflow-y-auto max-h-64 xl:max-h-72">
            {data?.recent_transactions?.length > 0 ? (
              data.recent_transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-2 sm:p-3 bg-base-300/50 rounded-xl hover:bg-base-300 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.transaction_type === "Purchased" ? "bg-primary/20" : "bg-secondary/20"}`}
                  >
                    {tx.transaction_type === "Purchased" ? (
                      <ArrowUpRight size={14} className="text-primary" />
                    ) : (
                      <ArrowDownRight size={14} className="text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {tx.inventory_name}
                    </div>
                    <div className="text-xs text-base-content/50 font-mono">
                      {tx.date?.substring(0, 10)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-black num flex-shrink-0 ${tx.transaction_type === "Purchased" ? "text-primary" : "text-secondary"}`}
                  >
                    {tx.transaction_type === "Purchased" ? "+" : "-"}
                    {tx.quantity}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-base-content/30 py-8">
                <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock quick list */}
      {lowStockItems.length > 0 && (
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              Low Stock Alert
            </h2>
            <a
              href="/reports"
              className="text-xs text-primary font-mono hover:underline"
            >
              View all in Reports →
            </a>
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => {
              const isNeg = parseInt(item.count_ending) < 0;
              const pct =
                parseFloat(item.reorder_point) > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (parseInt(item.count_ending) /
                          parseFloat(item.reorder_point)) *
                          100,
                      ),
                    )
                  : 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 sm:p-3 bg-base-300/40 rounded-xl"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isNeg ? "bg-error/20" : "bg-warning/20"}`}
                  >
                    <AlertTriangle
                      size={13}
                      className={isNeg ? "text-error" : "text-warning"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold truncate">
                        {item.name}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ml-2 flex-shrink-0 ${isNeg ? "text-error" : "text-warning"}`}
                      >
                        {parseInt(item.count_ending)} /{" "}
                        {parseFloat(item.reorder_point).toFixed(0)}
                      </span>
                    </div>
                    {/* Stock level bar */}
                    <div className="w-full bg-base-300 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isNeg ? "bg-error" : "bg-warning"}`}
                        style={{ width: `${isNeg ? 0 : pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-base-content/40 font-mono flex-shrink-0">
                    {item.lead_time}d
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
