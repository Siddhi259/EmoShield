// frontend/src/pages/AnalyticsPage.jsx — EmoShield
import { useState, useEffect } from 'react'
import { scanAPI } from '../utils/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
         Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

const RISK_C = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#10b981' }
const EMO_C  = ['#14b8a6','#0d9488','#0f766e','#22d3ee','#5eead4']
const PLT_C  = '#14b8a6'

const TT_STYLE = {
  contentStyle: { background:'#1e293b', border:'1px solid #334155',
                  borderRadius:'10px', color:'#f1f5f9', fontSize:'13px' }
}

export default function AnalyticsPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    scanAPI.getStats().then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const pieData = [
    { name:'HIGH',   value: stats?.by_risk?.HIGH   || 0 },
    { name:'MEDIUM', value: stats?.by_risk?.MEDIUM || 0 },
    { name:'LOW',    value: stats?.by_risk?.LOW    || 0 },
  ]

  const emoData = (stats?.top_emotions || []).map(([n, c]) => ({
    name: n.charAt(0).toUpperCase() + n.slice(1), count: c
  }))

  const pltData = Object.entries(stats?.by_platform || {}).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase()+k.slice(1), value: v
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">EmoShield threat protection insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Scans',   value: stats?.total || 0            },
          { label:'HIGH Threats',  value: stats?.by_risk?.HIGH || 0   },
          { label:'Avg Score',     value: stats?.avg_score || 0       },
          { label:'Safe Messages', value: stats?.by_risk?.LOW || 0    },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {stats?.total === 0
        ? <div className="card text-center py-16">
            <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
            <p className="text-slate-400">No scan data yet. Scan some messages first!</p>
          </div>
        : <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Pie */}
            <div className="card">
              <h3 className="text-slate-200 font-semibold mb-4">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                       innerRadius={60} outerRadius={90}
                       dataKey="value" paddingAngle={4}
                       label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                       labelLine={false}>
                    {pieData.map(e => <Cell key={e.name} fill={RISK_C[e.name]}/>)}
                  </Pie>
                  <Tooltip {...TT_STYLE}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Emotion bar */}
            <div className="card">
              <h3 className="text-slate-200 font-semibold mb-4">Top Detected Emotions</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={emoData} barSize={30}>
                  <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:12}}
                         axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip {...TT_STYLE}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {emoData.map((_,i) => <Cell key={i} fill={EMO_C[i%EMO_C.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Platform horizontal bar */}
            <div className="card lg:col-span-2">
              <h3 className="text-slate-200 font-semibold mb-4">Scans by Platform</h3>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={pltData} layout="vertical" barSize={16}>
                  <XAxis type="number" tick={{fill:'#94a3b8',fontSize:11}}
                         axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={90}
                         tick={{fill:'#94a3b8',fontSize:12}} axisLine={false} tickLine={false}/>
                  <Tooltip {...TT_STYLE}/>
                  <Bar dataKey="value" fill={PLT_C} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
      }
    </div>
  )
}
