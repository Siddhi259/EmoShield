// frontend/src/pages/ScanPage.jsx — EmoShield
// Text + Face dual-channel threat scanner
import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { scanAPI } from '../utils/api'
import toast from 'react-hot-toast'
import { ScanLine, Camera, CameraOff, Loader, Info, RotateCcw } from 'lucide-react'

const SAMPLES = [
  { label:'🔴 Bank Scam',    text:'Your bank account is blocked. Act immediately or face legal action.' },
  { label:'🟡 Prize Scam',   text:'Congratulations! You won ₹50,000 prize. Claim your reward now!' },
  { label:'🔴 Govt Fraud',   text:'URGENT: Government flagged your account. Respond NOW to avoid arrest.' },
  { label:'🟢 Safe Message', text:'Meeting rescheduled to Friday 3pm. Please confirm attendance.' },
]

const RISK_STYLE = {
  HIGH:   { border:'border-red-500/40',     bg:'bg-red-500/8',     text:'text-red-400',     badge:'🔴' },
  MEDIUM: { border:'border-amber-500/40',   bg:'bg-amber-500/8',   text:'text-amber-400',   badge:'🟡' },
  LOW:    { border:'border-emerald-500/40', bg:'bg-emerald-500/8', text:'text-emerald-400', badge:'🟢' },
}
const FACE_EMOJI = {
  fear:'😨', angry:'😠', disgust:'🤢', surprise:'😲',
  sad:'😢',  contempt:'😒', neutral:'😐', happy:'😊',
}

export default function ScanPage() {
  const camRef                       = useRef(null)
  const [message,   setMessage]      = useState('')
  const [useCam,    setUseCam]       = useState(false)
  const [camReady,  setCamReady]     = useState(false)
  const [captured,  setCaptured]     = useState(null)
  const [result,    setResult]       = useState(null)
  const [loading,   setLoading]      = useState(false)

  const capture = useCallback(() => {
    const img = camRef.current?.getScreenshot()
    if (img) { setCaptured(img); toast.success('Face captured!') }
  }, [camRef])

  const scan = async () => {
    if (!message.trim()) { toast.error('Enter a message first'); return }
    setLoading(true); setResult(null)
    try {
      const { data } = await scanAPI.scan({
        message,
        platform:   'manual',
        face_image: captured || undefined,
      })
      setResult(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setMessage(''); setResult(null); setCaptured(null) }

  const displayRisk = result?.dual_channel?.final_risk_level || result?.risk_level
  const s           = RISK_STYLE[displayRisk] || RISK_STYLE.LOW

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scan Message</h1>
        <p className="text-slate-400 text-sm mt-1">
          Paste any suspicious message. Enable camera for dual-channel face + text analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Left — Input ──────────────────────── */}
        <div className="space-y-4">

          {/* Samples */}
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
              Quick Samples
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => setMessage(s.text)}
                  className="text-left p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700
                             border border-slate-700 text-slate-300 text-xs
                             transition-colors truncate">
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
              Message to Analyze
            </p>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Paste any suspicious message here…"
              rows={6} className="input resize-none" />
            <p className="text-slate-700 text-xs text-right mt-1">
              {message.length} characters
            </p>
          </div>

          {/* Camera toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl
                          bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                ${useCam ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-700 text-slate-500'}`}>
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-200 text-sm font-medium">Face Emotion Analysis</p>
                <p className="text-slate-500 text-xs">Dual-channel detection</p>
              </div>
            </div>
            <button onClick={() => { setUseCam(!useCam); setCaptured(null) }}
              className={`relative w-10 h-5 rounded-full transition-colors
                ${useCam ? 'bg-teal-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                              shadow transition-transform
                              ${useCam ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={scan} disabled={loading || !message.trim()}
              className="btn-primary flex-1 py-3">
              {loading
                ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing…</>
                : <><ScanLine className="w-4 h-4" /> Analyze Message</>
              }
            </button>
            {result && (
              <button onClick={reset} className="btn-secondary py-3 px-4">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Right — Camera ────────────────────── */}
        <div>
          {useCam ? (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                Camera — Read the message, then capture your reaction
              </p>
              <div className="relative rounded-2xl overflow-hidden
                              border border-slate-700 bg-slate-800 aspect-video">
                {!captured
                  ? <Webcam ref={camRef} screenshotFormat="image/jpeg"
                            screenshotQuality={0.85} mirrored
                            onUserMedia={() => setCamReady(true)}
                            onUserMediaError={() => toast.error('Camera access denied')}
                            className="w-full h-full object-cover" />
                  : <img src={captured} alt="captured"
                         className="w-full h-full object-cover" />
                }
                {!captured && camReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-28 h-36 border-2 border-teal-400/50
                                    rounded-full border-dashed" />
                  </div>
                )}
                {captured && (
                  <div className="absolute top-3 right-3 bg-emerald-500/90
                                  text-white text-xs px-2.5 py-1 rounded-full font-medium">
                    ✓ Captured
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={capture} disabled={!camReady}
                  className="btn-primary flex-1 text-sm py-2.5">
                  <Camera className="w-4 h-4" />
                  {captured ? 'Recapture' : 'Capture Face'}
                </button>
                {captured && (
                  <button onClick={() => setCaptured(null)}
                    className="btn-secondary text-sm py-2.5 px-4">
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl
                              bg-teal-500/5 border border-teal-500/20">
                <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-400 text-xs">
                  Read the message naturally, let your face react, then capture.
                  EmoShield combines your facial emotion with text analysis for higher accuracy.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center border-2 border-dashed
                            border-slate-800 rounded-2xl min-h-[300px]">
              <div className="text-center">
                <CameraOff className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Camera off</p>
                <p className="text-slate-700 text-xs mt-1">
                  Toggle Face Analysis for dual-channel detection
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ───────────────────────────────── */}
      {result && (
        <div className={`card border ${s.border} animate-fade-in`}>

          {/* Risk headline */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className={`text-3xl font-black ${s.text}`}>
                {s.badge} {displayRisk} RISK
              </p>
              <p className="text-slate-400 text-sm mt-1">{result.explanation}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs">Score</p>
              <p className={`text-2xl font-bold ${s.text}`}>{result.total_score}/20</p>
            </div>
          </div>

          {/* Dual channel */}
          {result.dual_channel && (
            <div className="mb-5 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
              <p className="text-slate-300 text-xs font-semibold mb-3">
                🧬 Dual-Channel Analysis
              </p>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                {[
                  { label:'Text',       value: result.dual_channel.text_risk,
                    color: RISK_STYLE[result.dual_channel.text_risk]?.text || 'text-slate-300' },
                  { label:'Face',
                    value: `${FACE_EMOJI[result.dual_channel.face_emotion]||'😐'} ${result.dual_channel.face_emotion}`,
                    color: 'text-slate-200' },
                  { label:'Combined',   value: `${result.dual_channel.final_score?.toFixed(0)}%`,
                    color: s.text },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-slate-500 text-xs">{label}</p>
                    <p className={`font-bold text-sm mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-xs text-center">
                {result.dual_channel.correlation_desc}
              </p>
            </div>
          )}

          {/* Emotion tags */}
          <div className="mb-5">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
              Detected Emotions
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.emotions_detail || {}).map(([emo, info]) => (
                <span key={emo}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium
                    ${info.detected
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : 'bg-slate-800 text-slate-600 border-slate-700'
                    }`}>
                  {emo.charAt(0).toUpperCase()+emo.slice(1)}
                  {info.matched?.length > 0 && ` · ${info.matched.slice(0,2).join(', ')}`}
                </span>
              ))}
            </div>
          </div>

          {/* Score bars */}
          <div className="mb-5 space-y-2">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
              Score Breakdown
            </p>
            {Object.entries(result.breakdown || {}).map(([emo, pts]) => (
              <div key={emo} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-20 capitalize">{emo}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all
                    ${pts > 0 ? 'bg-teal-500' : 'bg-slate-700'}`}
                    style={{ width: `${Math.min((pts/8)*100, 100)}%` }} />
                </div>
                <span className={`text-xs w-4 text-right
                  ${pts > 0 ? 'text-teal-400' : 'text-slate-700'}`}>{pts}</span>
              </div>
            ))}
          </div>

          {/* ML opinion */}
          {result.ml && result.ml.ml_risk_level !== 'N/A' && (
            <div className="mb-5 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-slate-400 text-xs">
                🤖 <strong className="text-slate-200">ML Second Opinion:</strong>{' '}
                {result.ml.ml_risk_level} — {Math.round((result.ml.ml_confidence||0)*100)}% confidence
                {result.ml.ml_risk_level === displayRisk ? ' ✔ Agrees' : ' ⚠ Differs'}
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div className={`p-4 rounded-xl border ${s.border} ${s.bg}`}>
            <p className="text-slate-200 text-sm">
              <strong className={s.text}>🛡 EmoShield Recommendation:</strong>{' '}
              {result.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
