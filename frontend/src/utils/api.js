// frontend/src/utils/api.js — EmoShield
// Axios client with auto token refresh and interceptors

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('es_access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const ref = localStorage.getItem('es_refresh_token')
      if (ref) {
        try {
          const { data } = await axios.post(`${BASE}/api/v1/auth/refresh`,
            { refresh_token: ref })
          localStorage.setItem('es_access_token', data.access_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  getGoogleUrl:    ()           => api.get('/auth/google/url'),
  sendOTP:         phone        => api.post('/auth/otp/send', { phone }),
  verifyOTP:       (phone,code) => api.post('/auth/otp/verify', { phone, code }),
  getMe:           ()           => api.get('/users/me'),
  updateSettings:  data         => api.put('/users/settings', data),
  deleteAccount:   ()           => api.delete('/users/me'),
}

// ── Scan ──────────────────────────────────────────────────────────────────────
export const scanAPI = {
  scan:       data         => api.post('/scan', data),
  scanBatch:  messages     => api.post('/scan/batch', { messages }),
  getHistory: (p = {})     => api.get('/scan/history', { params: p }),
  getStats:   ()           => api.get('/stats'),
}

// ── Gmail ─────────────────────────────────────────────────────────────────────
export const gmailAPI = {
  scan:   (p = {})         => api.get('/gmail/scan', { params: p }),
  action: (message_id, action) => api.post('/gmail/action', { message_id, action }),
}

// ── Instagram ─────────────────────────────────────────────────────────────────
export const instagramAPI = {
  getAuthUrl: () => api.get('/instagram/auth-url'),
  scan:       () => api.get('/instagram/scan'),
}

// ── SMS ───────────────────────────────────────────────────────────────────────
export const smsAPI = {
  scan: messages => api.post('/sms/scan', { messages }),
}

export default api
