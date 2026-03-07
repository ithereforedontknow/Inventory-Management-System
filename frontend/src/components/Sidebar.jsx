import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ArrowLeftRight, TrendingUp, Boxes, X } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/reports', icon: TrendingUp, label: 'Reports' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30
      w-64 min-h-screen bg-base-200 border-r border-base-300
      flex flex-col
      transform transition-transform duration-200 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Logo */}
      <div className="p-6 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Boxes size={20} className="text-primary" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight logo-gradient">StockPilot</div>
            <div className="text-xs text-base-content/40 font-mono -mt-1">Inventory OS</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button className="lg:hidden btn btn-ghost btn-sm btn-circle" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex flex-col gap-1 flex-1">
        <div className="text-xs font-semibold text-base-content/30 uppercase tracking-widest mb-2 px-4">Menu</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-base-300">
        <div className="text-xs text-base-content/30 font-mono text-center">v2.0.0 · StockPilot</div>
      </div>
    </aside>
  )
}
