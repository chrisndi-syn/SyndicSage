import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth }     from './AuthContext'
import { useBuilding } from '../building/BuildingContext'

interface Props {
  children: ReactNode
}

// Redirects unauthenticated users to /login, preserving the intended destination.
// Redirects free-plan users (post-onboarding) to /subscribe until they pay.
// Shows nothing while session is loading to avoid flash of login page.
export function AuthGuard({ children }: Props) {
  const { session, loading } = useAuth()
  const { orgPlan }          = useBuilding()
  const location             = useLocation()

  // Dev bypass — remove before going live
  if (import.meta.env.DEV) return <>{children}</>

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Paywall gate: if onboarding complete but still on free plan → /subscribe
  const onboardingDone  = session.user.user_metadata?.['onboarding_complete'] === true
  const onSubscribePage = location.pathname.startsWith('/subscribe')

  if (onboardingDone && orgPlan === 'free' && !onSubscribePage) {
    return <Navigate to="/subscribe" replace />
  }

  return <>{children}</>
}
