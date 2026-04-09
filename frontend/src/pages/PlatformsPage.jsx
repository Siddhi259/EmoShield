// frontend/src/pages/PlatformsPage.jsx — EmoShield
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authAPI, instagramAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { Mail, MessageSquare, Instagram, Phone,
         CheckCircle, ExternalLink, ShieldCheck, Loader, Lock } from 'lucide-react'

function OTPSection({ user, refreshUser }) {
  const [phone,   setPhone]   = useState(user?.phone || '')
  const [code,    setCode]    = useState('')
  const [step,    setStep]    = useState(user?.phone_verified ? 'done' : 'phone')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!/^\+\d{10,15}$/.test(phone)) {
      toast.error('Use format: +919876543210'); return
    }
    setLoading(true)
    try {
      await authAPI.sendOTP(phone)
      setStep('otp'); toast.success('OTP sent via SMS!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'SMS failed')
    } finally { setLoading(false) }
  }

  const verify = async () => {
    if (code.length !== 6) { toast.error('Enter 6-digit OTP'); return }
    setLoading(true)
    try {
      await authAPI.verifyOTP(phone, code)
      setStep('done'); await refreshUser()
      toast.success('Phone verified! ✅')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Wrong OTP')
    } finally { setLoading(false) }
  }

  if (step === 'done') return (
    <div className="flex items-center gap-2 p-3 bg-emerald-500/10
                    border border-emerald-500/25 rounded-xl">
      <CheckCircle className="w-4 h-4 text-emerald-400"/>
      <p className="text-emerald-300 text-sm">Verified: {user.phone}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {step === 'phone' && <>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="+919876543210" className="input text-sm"/>
        <p className="text-slate-600 text-xs">Include country code: India +91 · US +1</p>
        <button onClick={send} disabled={loading} className="btn-primary text-sm py-2">
          {loading ? <Loader className="w-4 h-4 animate-spin"/> : <Phone className="w-4 h-4"/>}
          Send OTP via SMS
        </button>
      </>}
      {step === 'otp' && <>
        <p className="text-slate-400 text-sm">
          OTP sent to <strong className="text-slate-200">{phone}</strong>
        </p>
        <input type="text" maxLength={6} value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g,''))}
          placeholder="000000"
          className="input text-center text-2xl tracking-widest font-mono py-3"/>
        <div className="flex gap-2">
          <button onClick={verify} disabled={loading} className="btn-primary flex-1 text-sm py-2">
            {loading && <Loader className="w-4 h-4 animate-spin"/>} Verify OTP
          </button>
          <button onClick={() => {setStep('phone');setCode('')}} className="btn-secondary text-sm py-2 px-4">
            Change
          </button>
        </div>
        <p className="text-slate-600 text-xs">Valid 10 minutes · Max 3 attempts</p>
      </>}
    </div>
  )
}

export default function PlatformsPage() {
  const { user, refreshUser } = useAuth()
  const [igLoading, setIgLoading] = useState(false)

  const connectGmail = async () => {
    try {
      const { data } = await authAPI.getGoogleUrl()
      window.location.href = data.url
    } catch { toast.error('Failed') }
  }

  const connectInstagram = async () => {
    setIgLoading(true)
    try {
      const { data } = await instagramAPI.getAuthUrl()
      window.location.href = data.url
    } catch { toast.error('Failed') }
    finally { setIgLoading(false) }
  }

  const platforms = [
    {
      icon: Mail, name: 'Gmail', color: 'bg-red-500/10 text-red-400 border-red-500/20',
      connected: user?.gmail_connected,
      desc: 'Scan inbox for phishing. Auto-label or block HIGH risk emails.',
      action: connectGmail, btnLabel: 'Connect Gmail',
    },
    {
      icon: MessageSquare, name: 'WhatsApp', color: 'bg-green-500/10 text-green-400 border-green-500/20',
      connected: user?.whatsapp_connected,
      desc: 'Real-time alerts for HIGH risk WhatsApp messages via Business API.',
      custom: (
        <div className="space-y-2">
          <a href="https://developers.facebook.com" target="_blank" rel="noreferrer"
            className="btn-secondary inline-flex text-sm py-2 px-4">
            <ExternalLink className="w-4 h-4"/> Setup Guide
          </a>
          <p className="text-slate-600 text-xs">Requires Meta Business account approval.</p>
        </div>
      )
    },
    {
      icon: Instagram, name: 'Instagram', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      connected: user?.instagram_connected,
      desc: 'Scan DMs and comments for romance scams and fake giveaways.',
      action: connectInstagram,
      btnLabel: igLoading ? 'Connecting…' : 'Connect Instagram',
    },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Connected Platforms</h1>
        <p className="text-slate-400 text-sm mt-1">
          Connect accounts to enable real-time threat monitoring
        </p>
      </div>

      {/* Privacy */}
      <div className="flex items-start gap-3 p-4 bg-teal-500/5
                      border border-teal-500/20 rounded-xl">
        <Lock className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5"/>
        <p className="text-slate-400 text-sm">
          <strong className="text-slate-200">Privacy first.</strong> All OAuth tokens are
          encrypted with AES-256 before storage. EmoShield reads messages only to scan
          for threats. Disconnect anytime from Settings.
        </p>
      </div>

      {/* Platform cards */}
      {platforms.map(({ icon:Icon, name, color, connected, desc, action, btnLabel, custom }) => (
        <div key={name} className={`card border transition-all
          ${connected ? 'border-emerald-500/30' : 'border-slate-800'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-6 h-6"/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-semibold">{name}</h3>
                {connected && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400
                                   bg-emerald-500/10 border border-emerald-500/20
                                   px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3"/> Connected
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mb-4">{desc}</p>
              {custom || (
                <button onClick={action} disabled={connected}
                  className={connected ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}>
                  {btnLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Phone OTP */}
      <div className={`card border ${user?.phone_verified ? 'border-emerald-500/30' : 'border-slate-800'}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl border bg-blue-500/10 text-blue-400
                          border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-6 h-6"/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold">Phone / SMS</h3>
              {user?.phone_verified && (
                <span className="flex items-center gap-1 text-xs text-emerald-400
                                 bg-emerald-500/10 border border-emerald-500/20
                                 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3"/> Verified
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Verify phone to receive SMS alerts for HIGH risk detections.
            </p>
            <OTPSection user={user} refreshUser={refreshUser}/>
          </div>
        </div>
      </div>

      {/* Telegram Bot */}
      <div className="card border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400
                          border border-teal-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6"/>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Telegram Bot</h3>
            <p className="text-slate-400 text-sm mb-4">
              Forward any suspicious message to our bot for instant EmoShield analysis.
              Works for WhatsApp screenshots, SMS forwards, any text.
            </p>
            <a href="https://t.me/emoshield_bot" target="_blank" rel="noreferrer"
              className="btn-secondary inline-flex text-sm py-2">
              <ExternalLink className="w-4 h-4"/> Open EmoShield Bot
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
