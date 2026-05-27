import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface Props {
  children: ReactNode
}

// Redirects unauthenticated users to /login, preserving the intended destination.
// Shows nothing while session is loading to avoid flash of login page.
export function AuthGuard({ children }: Props) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
