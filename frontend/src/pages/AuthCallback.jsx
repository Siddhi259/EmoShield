// frontend/src/pages/AuthCallback.jsx — EmoShield
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'

export default function AuthCallback() {
  const [params]  = useSearchParams()
  const { login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    const access  = params.get('access_token')
    const refresh = params.get('refresh_token')
    const isNew   = params.get('is_new') === 'true'

    if (!access) {
      toast.error('Login failed — no token received')
      navigate('/login', { replace: true })
      return
    }

    login(access, refresh)
      .then(user => {
        toast.success(
          isNew ? `Welcome to EmoShield, ${user.name}! 🛡` : `Welcome back, ${user.name}!`
        )
        navigate('/', { replace: true })
      })
      .catch(() => {
        toast.error('Failed to load your profile')
        navigate('/login', { replace: true })
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 bg-teal-500/15 rounded-2xl
                          flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-teal-400" />
          </div>
          <div className="absolute inset-0 border-2 border-teal-500
                          border-t-transparent rounded-2xl animate-spin opacity-30" />
        </div>
        <div>
          <p className="text-white font-semibold">Signing you in to EmoShield…</p>
          <p className="text-slate-500 text-sm mt-1">Setting up your account</p>
        </div>
      </div>
    </div>
  )
}
