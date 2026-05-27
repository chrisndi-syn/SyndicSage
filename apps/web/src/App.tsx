import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './shared/auth/AuthContext'
import { AuthGuard }   from './shared/auth/AuthGuard'
import LoginPage       from './features/auth/LoginPage'
import OnboardingPage  from './features/onboarding/OnboardingPage'
import DashboardPage   from './features/dashboard/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"      element={<LoginPage />} />

          {/* Semi-public — requires auth, but no full app shell */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected app — catches all other routes */}
          <Route path="/*" element={
            <AuthGuard><DashboardPage /></AuthGuard>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
