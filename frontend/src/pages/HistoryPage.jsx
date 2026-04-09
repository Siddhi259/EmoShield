// frontend/src/pages/HistoryPage.jsx — EmoShield
import { useState, useEffect } from 'react'
import { scanAPI } from '../utils/api'
import { History, Search, Shield } from 'lucide-react'

const PLT = { gmail:'Gmail', whatsapp:'WhatsApp',
              instagram:'Instagram', sms:'SMS', manual:'Manual' }
const EB  = { HIGH:'badge-high', MEDIUM:'badge-medium', LOW:'badge-low' }
const EM  = { HIGH:'🔴', MEDIUM:'🟡', LOW:'🟢' }

export default function HistoryPage() {
  const [scans,   setScans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [plt,     setPlt]     = useState('all')
  const [risk,    setRisk]    = useState('all')

  useEffect(() => {
    scanAPI.getHistory({ limit: 100 })
      .then(r  => setScans(r.data.scans || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = scans.filter(s => {
    if (plt  !== 'all' && s.platform   !== plt)  return false
    if (risk !== 'all' && s.risk_level !== risk)  return false
    if (search && !s.message?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Scan History</h1>
        <p className="text-slate-400 text-sm mt-1">All past EmoShield threat scans</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/>
          <input placeholder="Search messages…" value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm"/>
        </div>
        <select value={plt} onChange={e => setPlt(e.target.value)} className="input w-36 text-sm">
          <option value="all">All Platforms</option>
          {Object.entries(PLT).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={risk} onChange={e => setRisk(e.target.value)} className="input w-32 text-sm">
          <option value="all">All Risk</option>
          {['HIGH','MEDIUM','LOW'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <p className="text-slate-600 text-sm">{filtered.length} results</p>

      {loading
        ? <div className="space-y-2">{[...Array(6)].map((_,i) =>
            <div key={i} className="h-16 rounded-xl animate-shimmer"/>)}</div>
        : filtered.length === 0
          ? <div className="card text-center py-16">
              <History className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-400">No scans found</p>
            </div>
          : <div className="space-y-2">
              {filtered.map(s => (
                <div key={s._id}
                  className="card-sm flex items-center gap-4
                             hover:border-slate-700 transition-colors">
                  <span className={`badge ${EB[s.risk_level]} flex-shrink-0`}>
                    {EM[s.risk_level]} {s.risk_level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm truncate">{s.message}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {PLT[s.platform]||s.platform}
                      {s.sender ? ` · ${s.sender}` : ''}
                      {' · '}{new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-slate-200 text-sm font-bold">{s.risk_score}/20</p>
                    {s.face_detected && <p className="text-teal-500 text-xs">🧬 Dual</p>}
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
