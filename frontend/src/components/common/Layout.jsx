// frontend/src/components/common/Layout.jsx — EmoShield
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  ShieldCheck, LayoutDashboard, ScanLine, Mail,
  Layers, History, BarChart2, Settings, LogOut, Bell
} from 'lucide-react'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { to: '/scan',      icon: ScanLine,        label: 'Scan Message'       },
  { to: '/gmail',     icon: Mail,            label: 'Gmail Monitor'      },
  { to: '/platforms', icon: Layers,          label: 'Platforms'          },
  { to: '/history',   icon: History,         label: 'History'            },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics'          },
  { to: '/settings',  icon: Settings,        label: 'Settings'           },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex bg-gray-950">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800
                        flex flex-col flex-shrink-0 sticky top-0 h-screen">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-teal-500 rounded-lg
                          flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">EmoShield</p>
            <p className="text-slate-500 text-xs mt-0.5">v1.0</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm
                 font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                   : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                 }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                          bg-slate-800/50">
            {user?.picture
              ? <img src={user.picture} alt=""
                     className="w-7 h-7 rounded-full ring-2 ring-teal-500/30 flex-shrink-0" />
              : <div className="w-7 h-7 rounded-full bg-teal-500/20 flex-shrink-0
                                flex items-center justify-center
                                text-teal-400 font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-semibold truncate">
                {user?.name}
              </p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                       text-slate-400 hover:text-red-400 hover:bg-red-500/5
                       text-sm font-medium transition-all duration-150">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-slate-900/60 border-b border-slate-800
                           flex items-center justify-between px-6
                           sticky top-0 backdrop-blur-sm z-10">
          <p className="text-slate-500 text-xs">
            🛡 EmoShield — Cyber Threat Detection
          </p>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center
                               text-slate-400 hover:text-slate-200
                               hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            {user?.picture
              ? <img src={user.picture} alt=""
                     className="w-7 h-7 rounded-full ring-2 ring-slate-700" />
              : <div className="w-7 h-7 rounded-full bg-teal-500/20
                                flex items-center justify-center
                                text-teal-400 font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
            }
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
