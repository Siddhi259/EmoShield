// frontend/src/pages/DashboardPage.jsx — EmoShield
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { scanAPI } from '../utils/api'
import { ShieldCheck, AlertTriangle, CheckCircle, Mail,
         MessageSquare, Instagram, Phone, TrendingUp,
         ScanLine, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
         Tooltip, ResponsiveContainer } from 'recharts'

const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }

function Stat({ icon: Icon, label, value, sub, accent = 'teal' }) {
  const map = {
    teal:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
    red:   'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${map[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-slate-500 text-xs">{sub}</p>}
      </div>
    </div>
  )
}

function RiskBadge({ level }) {
  const map   = { HIGH:'badge-high', MEDIUM:'badge-medium', LOW:'badge-low' }
  const emoji = { HIGH:'🔴', MEDIUM:'🟡', LOW:'🟢' }
  return (
    <span className={`badge ${map[level]}`}>
      {emoji[level]} {level}
    </span>
  )
}

const PLATFORM_ICONS = {
  gmail: Mail, whatsapp: MessageSquare,
  instagram: Instagram, sms: Phone, manual: ScanLine,
}

export default function DashboardPage() {
  const { user }                    = useAuth()
  const [stats,   setStats]         = useState(null)
  const [history, setHistory]       = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([scanAPI.getStats(), scanAPI.getHistory({ limit: 5 })])
      .then(([s, h]) => { setStats(s.data); setHistory(h.data.scans || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pieData = stats ? [
    { name: 'HIGH',   value: stats.by_risk?.HIGH   || 0 },
    { name: 'MEDIUM', value: stats.by_risk?.MEDIUM || 0 },
    { name: 'LOW',    value: stats.by_risk?.LOW    || 0 },
  ] : []

  const emoData = (stats?.top_emotions || []).map(([n, c]) => ({
    name: n.charAt(0).toUpperCase() + n.slice(1, 3), count: c
  }))

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hey {user?.name?.split(' ')[0]}, welcome back 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here's your EmoShield protection overview
        </p>
      </div>

      {/* Platform status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Gmail',     on: user?.gmail_connected,     icon: Mail,            cls:'platform-gmail'     },
          { label:'WhatsApp',  on: user?.whatsapp_connected,  icon: MessageSquare,   cls:'platform-whatsapp'  },
          { label:'Instagram', on: user?.instagram_connected, icon: Instagram,       cls:'platform-instagram' },
          { label:'SMS',       on: user?.sms_monitoring,      icon: Phone,           cls:'platform-sms'       },
        ].map(({ label, on, icon: Icon, cls }) => (
          <div key={label}
            className={`card-sm flex items-center gap-3
              ${on ? 'border-emerald-500/30' : 'border-slate-800'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                            border ${on ? cls : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-200 text-sm font-medium">{label}</p>
              <p className={`text-xs ${on ? 'text-emerald-400' : 'text-slate-600'}`}>
                {on ? '● Connected' : '○ Not connected'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      {loading
        ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) =>
              <div key={i} className="h-24 card animate-shimmer rounded-2xl" />)}
          </div>
        : <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={ShieldCheck}   label="Total Scanned" value={stats?.total || 0}               accent="teal" />
            <Stat icon={AlertTriangle} label="HIGH Threats"  value={stats?.by_risk?.HIGH || 0}       accent="red"  sub="Attacks blocked" />
            <Stat icon={TrendingUp}    label="Avg Score"     value={`${stats?.avg_score || 0}/20`}   accent="amber"/>
            <Stat icon={CheckCircle}   label="Safe Messages" value={stats?.by_risk?.LOW || 0}        accent="green"/>
          </div>
      }

      {/* Charts + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Pie */}
        <div className="card">
          <h3 className="text-slate-200 font-semibold mb-4">Risk Distribution</h3>
          {pieData.some(d => d.value > 0)
            ? <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50}
                       outerRadius={75} dataKey="value" paddingAngle={4}>
                    {pieData.map(e => <Cell key={e.name} fill={RISK_COLORS[e.name]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155',
                                           borderRadius:'10px', color:'#f1f5f9', fontSize:'13px' }} />
                </PieChart>
              </ResponsiveContainer>
            : <div className="h-[190px] flex items-center justify-center
                              text-slate-600 text-sm">No data yet</div>
          }
          <div className="flex justify-around mt-1">
            {Object.entries(RISK_COLORS).map(([n, c]) => (
              <div key={n} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="text-slate-500 text-xs">{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emotion bar */}
        <div className="card">
          <h3 className="text-slate-200 font-semibold mb-4">Top Emotions</h3>
          {emoData.length > 0
            ? <ResponsiveContainer width="100%" height={190}>
                <BarChart data={emoData} barSize={24}>
                  <XAxis dataKey="name" tick={{ fill:'#94a3b8', fontSize:11 }}
                         axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155',
                                           borderRadius:'10px', color:'#f1f5f9', fontSize:'13px' }} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            : <div className="h-[190px] flex items-center justify-center
                              text-slate-600 text-sm">Scan messages to see emotions</div>
          }
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="text-slate-200 font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-1">
            {[
              { to:'/scan',      icon:ScanLine,   label:'Scan a Message',   sub:'Text + face analysis' },
              { to:'/gmail',     icon:Mail,        label:'Scan Gmail',       sub:'Check your inbox'     },
              { to:'/platforms', icon:Layers,      label:'Connect Platforms',sub:'WhatsApp, Instagram'  },
              { to:'/analytics', icon:TrendingUp,  label:'View Analytics',   sub:'Charts + insights'    },
            ].map(({ to, icon: Icon, label, sub }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3 rounded-xl
                           hover:bg-slate-800 transition-colors group">
                <div className="w-8 h-8 bg-slate-800 group-hover:bg-teal-500/10
                                rounded-lg flex items-center justify-center
                                text-slate-400 group-hover:text-teal-400 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-200 text-sm font-medium">{label}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700
                                         group-hover:text-slate-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent scans */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-200 font-semibold">Recent Scans</h3>
          <Link to="/history" className="text-teal-400 text-sm hover:text-teal-300">
            View all →
          </Link>
        </div>
        {history.length === 0
          ? <div className="text-center py-12">
              <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No scans yet</p>
              <p className="text-slate-600 text-xs mt-1">Start by scanning a message</p>
              <Link to="/scan" className="btn-primary inline-flex mt-4 text-sm py-2 px-4">
                Scan your first message
              </Link>
            </div>
          : <div className="space-y-2">
              {history.map(s => {
                const PIcon = PLATFORM_ICONS[s.platform] || ScanLine
                return (
                  <div key={s._id}
                    className="flex items-center gap-4 p-3 rounded-xl
                               bg-slate-800/40 hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 bg-slate-700 rounded-lg
                                    flex items-center justify-center flex-shrink-0">
                      <PIcon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm truncate">{s.message}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {s.platform} · {s.sender || 'Manual'}
                      </p>
                    </div>
                    <RiskBadge level={s.risk_level} />
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}
