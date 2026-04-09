// frontend/src/pages/GmailPage.jsx — EmoShield
import { useState } from 'react'
import { gmailAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { Mail, RefreshCw, Loader, Shield, Tag,
         AlertOctagon, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const RS = {
  HIGH:   { border:'border-red-500/30',     bg:'bg-red-500/5',    text:'text-red-400',    b:'badge-high'   },
  MEDIUM: { border:'border-amber-500/30',   bg:'bg-amber-500/5',  text:'text-amber-400',  b:'badge-medium' },
  LOW:    { border:'border-slate-700',      bg:'',                text:'text-slate-400',  b:'badge-low'    },
}
const EMOJI = { HIGH:'🔴', MEDIUM:'🟡', LOW:'🟢' }

function EmailCard({ email, onAction }) {
  const [open,   setOpen]   = useState(false)
  const [acting, setActing] = useState(false)
  const s = RS[email.risk_level] || RS.LOW

  const act = async (action) => {
    setActing(true)
    try {
      await gmailAPI.action(email.message_id, action)
      toast.success(`Done: ${action}`)
      onAction(email.message_id)
    } catch { toast.error('Action failed') }
    finally { setActing(false) }
  }

  return (
    <div className={`card-sm border ${s.border} space-y-2`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                        flex-shrink-0 ${s.bg} border ${s.border}`}>
          <Mail className={`w-4 h-4 ${s.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-slate-200 text-sm font-semibold truncate">{email.subject}</p>
              <p className="text-slate-500 text-xs truncate">From: {email.sender}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`badge ${s.b}`}>{EMOJI[email.risk_level]} {email.risk_level}</span>
              <button onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-300">
                {open ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
              </button>
            </div>
          </div>

          {email.active_emotions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {email.active_emotions.map(e => (
                <span key={e} className="text-xs bg-slate-800 text-slate-400
                                         border border-slate-700 rounded-full px-2 py-0.5">
                  {e}
                </span>
              ))}
            </div>
          )}

          {open && (
            <div className="mt-3 space-y-2">
              <p className="text-slate-300 text-sm p-3 bg-slate-800/50 rounded-lg">
                {email.snippet}
              </p>
              <p className="text-slate-400 text-xs">{email.explanation}</p>
            </div>
          )}

          {email.risk_level !== 'LOW' && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {[
                { action:'label_high', Icon:Tag, label:'Label', cls:'bg-teal-500/10 text-teal-400 border-teal-500/20' },
                { action:'spam', Icon:AlertOctagon, label:'Spam', cls:'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                email.risk_level === 'HIGH' && { action:'trash', Icon:Trash2, label:'Delete', cls:'bg-red-500/10 text-red-400 border-red-500/20' },
              ].filter(Boolean).map(({ action, Icon, label, cls }) => (
                <button key={action} onClick={() => act(action)} disabled={acting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                             border transition-colors hover:opacity-80 ${cls}`}>
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
              {acting && <Loader className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GmailPage() {
  const [emails,    setEmails]    = useState([])
  const [scanning,  setScanning]  = useState(false)
  const [scanned,   setScanned]   = useState(false)
  const [max,       setMax]       = useState(20)
  const [unread,    setUnread]    = useState(true)
  const [filter,    setFilter]    = useState('ALL')

  const scan = async () => {
    setScanning(true)
    try {
      const { data } = await gmailAPI.scan({ max_results: max, unread_only: unread })
      setEmails(data.emails || [])
      setScanned(true)
      const h = data.summary?.HIGH || 0
      if (h > 0) toast.error(`⚠️ ${h} HIGH risk emails detected!`)
      else toast.success(`Scanned ${data.total} emails — all clear`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Gmail scan failed')
    } finally { setScanning(false) }
  }

  const remove = (id) => setEmails(p => p.filter(e => e.message_id !== id))
  const filtered = filter === 'ALL' ? emails : emails.filter(e => e.risk_level === filter)
  const counts   = emails.reduce((a, e) => {a[e.risk_level]=(a[e.risk_level]||0)+1;return a},{})

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Gmail Monitor</h1>
        <p className="text-slate-400 text-sm mt-1">
          Scan your inbox for phishing and social engineering attacks
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <p className="text-slate-500 text-xs mb-1">Emails to scan</p>
          <select value={max} onChange={e => setMax(+e.target.value)} className="input w-28 text-sm">
            {[10,20,30,50].map(n => <option key={n} value={n}>{n} emails</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={unread} onChange={e => setUnread(e.target.checked)}
            className="accent-teal-500 w-4 h-4" />
          <span className="text-slate-300 text-sm">Unread only</span>
        </label>
        <button onClick={scan} disabled={scanning} className="btn-primary ml-auto">
          {scanning ? <><Loader className="w-4 h-4 animate-spin"/> Scanning…</> : <><RefreshCw className="w-4 h-4"/> Scan Gmail</>}
        </button>
      </div>

      {scanned && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[['HIGH','text-red-400','bg-red-500/10'],['MEDIUM','text-amber-400','bg-amber-500/10'],['LOW','text-emerald-400','bg-emerald-500/10']].map(([l,tc,bg]) => (
              <div key={l} className="card-sm text-center">
                <p className={`text-2xl font-bold ${tc}`}>{counts[l]||0}</p>
                <p className="text-slate-500 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {['ALL','HIGH','MEDIUM','LOW'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${filter===f ? 'bg-teal-500/15 text-teal-400 border border-teal-500/25' :
                                 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                {f}{f!=='ALL'&&` (${counts[f]||0})`}
              </button>
            ))}
          </div>

          {filtered.length === 0
            ? <div className="card text-center py-12">
                <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
                <p className="text-slate-400">No emails for this filter</p>
              </div>
            : <div className="space-y-3">
                {filtered.map(e => <EmailCard key={e.message_id} email={e} onAction={remove}/>)}
              </div>
          }
        </>
      )}

      {!scanned && !scanning && (
        <div className="card text-center py-16">
          <Mail className="w-12 h-12 text-slate-700 mx-auto mb-4"/>
          <h3 className="text-slate-300 font-semibold">Ready to scan Gmail</h3>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            EmoShield will analyze your emails and flag any suspicious messages
          </p>
          <button onClick={scan} className="btn-primary mx-auto">Start Gmail Scan</button>
        </div>
      )}
    </div>
  )
}
