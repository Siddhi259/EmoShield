// frontend/src/pages/LoginPage.jsx — EmoShield
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { ShieldCheck, Mail, Eye, Phone, Lock, Loader } from 'lucide-react'

const FEATURES = [
  { icon: Mail,       label: 'Gmail Scanner',    desc: 'Auto-detect phishing in your inbox' },
  { icon: Eye,        label: 'Face Emotion AI',  desc: 'Dual-channel reaction analysis'     },
  { icon: Phone,      label: 'SMS + WhatsApp',   desc: 'Multi-platform threat monitoring'   },
  { icon: ShieldCheck,label: 'Auto-Block',       desc: 'Block HIGH risk messages instantly' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate        = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const { data } = await authAPI.getGoogleUrl()
      window.location.href = data.url
    } catch {
      toast.error('Could not get Google login URL')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Left panel ─────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] flex-col justify-between p-14
                      bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950
                      border-r border-slate-800">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 rounded-xl
                          flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">EmoShield</p>
            <p className="text-teal-400/70 text-xs">Cyber Threat Detection</p>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-6">
          <div>
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Final Year Project · CSE 2025–26
            </p>
            <h1 className="text-5xl font-black text-white leading-tight">
              Emotion-Aware<br />
              <span className="text-teal-400">Threat</span><br />
              Detection
            </h1>
            <p className="text-slate-400 text-lg mt-4 leading-relaxed">
              AI-powered protection across Gmail, WhatsApp,
              Instagram and SMS — with real-time face emotion analysis.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="w-8 h-8 bg-teal-500/10 border border-teal-500/20
                                rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex gap-8">
          {[
            { v: '93.3%', l: 'ML Accuracy'  },
            { v: '5',     l: 'Emotion Types' },
            { v: '4+',    l: 'Platforms'     },
          ].map(({ v, l }) => (
            <div key={l}>
              <p className="text-2xl font-bold text-teal-400">{v}</p>
              <p className="text-slate-500 text-xs">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login ─────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-teal-500 rounded-lg
                            flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-bold">EmoShield</p>
          </div>

          <div className="card space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Sign in</h2>
              <p className="text-slate-400 text-sm mt-1">
                to EmoShield — protect your digital communications
              </p>
            </div>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3
                         bg-white hover:bg-gray-50 text-gray-900 font-semibold
                         py-3 px-5 rounded-xl transition-all active:scale-95
                         disabled:opacity-60">
              {loading
                ? <Loader className="w-5 h-5 animate-spin text-gray-500" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* What you get */}
            <div>
              <p className="text-slate-600 text-xs text-center mb-3">
                What you get
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['Gmail scan','WhatsApp alerts','Face emotion AI',
                  'Auto-block','Hindi support','Real-time threats'].map(f => (
                  <span key={f}
                    className="text-xs bg-slate-800 text-slate-300
                               border border-slate-700 rounded-full px-2.5 py-1">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl
                            bg-slate-800/50 border border-slate-700/50">
              <Lock className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 text-xs leading-relaxed">
                <strong className="text-slate-300">Your data is safe.</strong>{' '}
                All tokens are encrypted with AES-256. We never store your
                messages. Delete all data anytime from Settings.
              </p>
            </div>
          </div>

          <p className="text-center text-slate-700 text-xs mt-5">
            EmoShield v1.0 · Final Year Project · CSE 2025–26
          </p>
        </div>
      </div>
    </div>
  )
}
