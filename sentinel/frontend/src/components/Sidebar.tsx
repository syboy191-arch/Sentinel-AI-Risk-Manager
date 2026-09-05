import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  Zap,
  FileText,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: List },
  { path: '/simulator', label: 'Simulator', icon: Zap },
  { path: '/audit-log', label: 'Audit Log', icon: FileText },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Sentinel</h2>
        <p className="text-sm text-slate-400">Risk Command Center</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        v1.0.0 · Powered by Claude
      </div>
    </aside>
  )
}
