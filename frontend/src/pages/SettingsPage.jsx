// frontend/src/pages/SettingsPage.jsx — EmoShield
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { ShieldCheck, Save, Trash2, AlertTriangle, Mail, Phone, CheckCircle } from 'lucide-react'

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-4
                    border-b border-slate-800 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        {desc && <p className="text-slate-500 text-xs mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-teal-500' : 'bg-slate-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                        shadow transition-transform duration-200
                        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth()

  const [settings, setSettings] = useState({
    auto_scan:       user?.auto_scan       ?? true,
    block_high_risk: user?.block_high_risk ?? false,
    notify_medium:   user?.notify_medium   ?? true,
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = key => val => setSettings(p => ({...p, [key]: val}))

  const save = async () => {
    setSaving(true)
    try {
      await authAPI.updateSettings(settings)
      await refreshUser()
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    const ok = window.confirm(
      'Delete your EmoShield account?\n\nThis permanently removes ALL your data including scan history, connected platforms, and preferences.\n\nThis cannot be undone.'
    )
    if (!ok) return
    setDeleting(true)
    try {
      await authAPI.deleteAccount()
      toast.success('Account deleted')
      logout()
    } catch {
      toast.error('Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your EmoShield preferences and account
        </p>
      </div>

      {/* Profile card */}
      <div className="card">
        <h3 className="text-slate-200 font-semibold mb-4">Profile</h3>
        <div className="flex items-center gap-4">
          {user?.picture
            ? <img src={user.picture} alt=""
                   className="w-14 h-14 rounded-full ring-2 ring-slate-700 flex-shrink-0" />
            : <div className="w-14 h-14 rounded-full bg-teal-500/20 flex-shrink-0
                              flex items-center justify-center
                              text-teal-400 font-bold text-xl">
                {user?.name?.[0]?.toUpperCase()}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-slate-400 text-sm truncate">{user?.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user?.gmail_connected && (
                <span className="flex items-center gap-1 text-xs
                                 bg-red-500/10 text-red-400 border border-red-500/20
                                 px-2 py-0.5 rounded-full">
                  <Mail className="w-3 h-3" /> Gmail
                </span>
              )}
              {user?.phone_verified && (
                <span className="flex items-center gap-1 text-xs
                                 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                                 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Phone verified
                </span>
              )}
              {user?.instagram_connected && (
                <span className="flex items-center gap-1 text-xs
                                 bg-pink-500/10 text-pink-400 border border-pink-500/20
                                 px-2 py-0.5 rounded-full">
                  Instagram
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scan settings */}
      <div className="card">
        <h3 className="text-slate-200 font-semibold mb-2">Scan Settings</h3>

        <Toggle
          label="Auto Scan Gmail"
          desc="Automatically scan Gmail inbox every hour for new threats"
          checked={settings.auto_scan}
          onChange={set('auto_scan')}
        />
        <Toggle
          label="Auto-Block HIGH Risk"
          desc="Automatically move HIGH risk emails to spam folder"
          checked={settings.block_high_risk}
          onChange={set('block_high_risk')}
        />
        <Toggle
          label="Alerts for MEDIUM Risk"
          desc="Show notifications for MEDIUM risk messages"
          checked={settings.notify_medium}
          onChange={set('notify_medium')}
        />

        <div className="mt-5">
          <button onClick={save} disabled={saving}
            className="btn-primary text-sm py-2.5">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-teal-500 rounded-xl
                          flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold">EmoShield</p>
            <p className="text-slate-500 text-xs">v1.0 · Final Year Project · CSE 2025–26</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          Centralized Emotion-Aware Multi-Platform Cyber Threat Detection System
          using AI, NLP, and Computer Vision. Detects social engineering attacks
          across Gmail, WhatsApp, Instagram, and SMS with dual-channel
          text + face emotion analysis.
        </p>

        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { v: '93.3%', l: 'ML Accuracy'   },
              { v: '5',     l: 'Emotion Types'  },
              { v: '4+',    l: 'Platforms'      },
            ].map(({ v, l }) => (
              <div key={l}>
                <p className="text-teal-400 font-bold">{v}</p>
                <p className="text-slate-600 text-xs">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border border-red-500/25">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-red-400 font-semibold">Danger Zone</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          Permanently delete your EmoShield account and all associated data —
          scan history, platform connections, and preferences.
          <strong className="text-slate-300"> This cannot be undone.</strong>
        </p>
        <button onClick={deleteAccount} disabled={deleting} className="btn-danger text-sm py-2.5">
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting account…' : 'Delete My Account'}
        </button>
      </div>

    </div>
  )
}
