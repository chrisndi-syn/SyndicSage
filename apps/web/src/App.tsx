import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './shared/auth/AuthContext'
import { AuthGuard }   from './shared/auth/AuthGuard'
import LoginPage        from './features/auth/LoginPage'
import AuthCallbackPage from './features/auth/AuthCallbackPage'
import OnboardingPage   from './features/onboarding/OnboardingPage'
import DashboardPage    from './features/dashboard/DashboardPage'
import SettingsPage     from './features/settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Semi-public — requires auth, but no full app shell */}
          <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

          {/* Protected app */}
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          <Route path="/*" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
