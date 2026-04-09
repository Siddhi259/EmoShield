// frontend/src/App.jsx — EmoShield
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'

import LoginPage      from './pages/LoginPage'
import AuthCallback   from './pages/AuthCallback'
import DashboardPage  from './pages/DashboardPage'
import ScanPage       from './pages/ScanPage'
import GmailPage      from './pages/GmailPage'
import PlatformsPage  from './pages/PlatformsPage'
import HistoryPage    from './pages/HistoryPage'
import AnalyticsPage  from './pages/AnalyticsPage'
import SettingsPage   from './pages/SettingsPage'
import Layout         from './components/common/Layout'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent
                        rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading EmoShield…</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index                element={<DashboardPage />} />
        <Route path="scan"          element={<ScanPage />} />
        <Route path="gmail"         element={<GmailPage />} />
        <Route path="platforms"     element={<PlatformsPage />} />
        <Route path="history"       element={<HistoryPage />} />
        <Route path="analytics"     element={<AnalyticsPage />} />
        <Route path="settings"      element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color:      '#f1f5f9',
              border:     '1px solid #334155',
              borderRadius: '12px',
              fontSize: '14px',
            },
            duration: 4000,
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
