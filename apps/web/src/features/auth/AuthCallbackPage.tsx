import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Landing page for OAuth redirects (Google, Microsoft, Apple).
// Exchanges the auth code from the URL for a session, then redirects.
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error('[auth/callback] exchangeCodeForSession failed:', error)
            navigate('/login', { replace: true })
          } else {
            navigate('/', { replace: true })
          }
        })
        .catch((err: unknown) => {
          console.error('[auth/callback] unexpected error:', err)
          navigate('/login', { replace: true })
        })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return null
}
