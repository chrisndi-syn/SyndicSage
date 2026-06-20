import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// Landing page for OAuth and magic link redirects.
// - OAuth (Google/Microsoft/Apple): arrives with ?code= query param
// - Magic link email: arrives with #access_token=... hash fragment
// Supabase JS v2 auto-parses the hash on init; we just wait for the session.
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      // OAuth PKCE flow
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
    } else if (window.location.hash.includes('access_token')) {
      // Magic link flow — Supabase client auto-parses the hash.
      // Wait for onAuthStateChange to fire with the session.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        subscription.unsubscribe()
        if (session) {
          navigate('/', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return null
}
