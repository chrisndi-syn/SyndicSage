import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider }     from './shared/auth/AuthContext'
import { BuildingProvider } from './shared/building/BuildingContext'
import { AuthGuard }        from './shared/auth/AuthGuard'
import LoginPage            from './features/auth/LoginPage'
import AuthCallbackPage     from './features/auth/AuthCallbackPage'
import OnboardingPage       from './features/onboarding/OnboardingPage'
import DashboardPage        from './features/dashboard/DashboardPage'
import BuildingsPage        from './features/buildings/BuildingsPage'
import OwnersPage           from './features/owners/OwnersPage'
import ChargesPage          from './features/charges/ChargesPage'
import SettingsPage         from './features/settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <BuildingProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Semi-public — requires auth, no app shell */}
            <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

            {/* Protected app */}
            <Route path="/"          element={<AuthGuard><DashboardPage /></AuthGuard>} />
            <Route path="/buildings" element={<AuthGuard><BuildingsPage /></AuthGuard>} />
            <Route path="/owners"    element={<AuthGuard><OwnersPage /></AuthGuard>} />
            <Route path="/charges"   element={<AuthGuard><ChargesPage /></AuthGuard>} />
            <Route path="/settings"  element={<AuthGuard><SettingsPage /></AuthGuard>} />
          </Routes>
        </BuildingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
