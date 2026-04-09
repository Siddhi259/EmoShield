// frontend/src/hooks/useAuth.jsx — EmoShield
// Global authentication context

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../utils/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('es_access_token')
    if (token) {
      authAPI.getMe()
        .then(r  => setUser(r.data))
        .catch(() => { localStorage.clear(); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback((access, refresh) => {
    localStorage.setItem('es_access_token',  access)
    localStorage.setItem('es_refresh_token', refresh)
    return authAPI.getMe().then(r => { setUser(r.data); return r.data })
  }, [])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }, [])

  const refreshUser = useCallback(() =>
    authAPI.getMe().then(r => { setUser(r.data); return r.data }), [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
