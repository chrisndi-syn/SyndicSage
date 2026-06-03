import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface Props {
  children: ReactNode
}

// DEV BYPASS — remove before production
const DEV_BYPASS = import.meta.env.DEV

// Redirects unauthenticated users to /login, preserving the intended destination.
// Shows nothing while session is loading to avoid flash of login page.
export function AuthGuard({ children }: Props) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (DEV_BYPASS) return <>{children}</>

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
