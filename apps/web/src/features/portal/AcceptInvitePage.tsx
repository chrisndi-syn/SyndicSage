// ── Accept Invitation page ──────────────────────────────────────
// Public route: /invite/accept?token=xxx
// Validates token, prompts sign-in if needed, then accepts.

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { supabase }    from '../../lib/supabase'
import { apiValidateInviteToken, apiAcceptInvitation } from '../invitations/invitations.api'

type State = 'loading' | 'valid' | 'accepting' | 'done' | 'error'

export default function AcceptInvitePage() {
  const { t }  = useTranslation()
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const [state,    setState]    = useState<State>('loading')
  const [info,     setInfo]     = useState<{ email: string; role: string; building_name: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg(t('invitations.invalidToken')); return }

    apiValidateInviteToken(token)
      .then(data => { setInfo(data); setState('valid') })
      .catch(err => { setState('error'); setErrorMsg(err.message ?? t('invitations.invalidToken')) })
  }, [token])

  async function handleAccept() {
    setState('accepting')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Redirect to login, return here after
        navigate(`/login?return=/invite/accept?token=${encodeURIComponent(token)}`)
        return
      }
      await apiAcceptInvitation(session.access_token, token)
      setState('done')
      setTimeout(() => navigate('/portal'), 2000)
    } catch (err: unknown) {
      setState('error')
      setErrorMsg((err as Error).message ?? t('common.error'))
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    co_owner: t('invitations.role_co_owner'),
    renter:   t('invitations.role_renter'),
    co_syndic: t('invitations.role_co_syndic'),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1E3A5F', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="14" width="24" height="14" rx="2" stroke="#F59E0B" strokeWidth="2"/>
                <rect x="12" y="20" width="8" height="8" rx="1" fill="#F59E0B"/>
                <path d="M2 14L16 4L30 14" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, color: '#1E3A5F', lineHeight: 1 }}>
              Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
            </span>
          </div>
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', color: '#6E6E73', fontSize: 15 }}>{t('common.loading')}</div>
        )}

        {state === 'valid' && info && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 8, textAlign: 'center' }}>
              {t('invitations.youreInvited')}
            </h1>
            <p style={{ fontSize: 14, color: '#6E6E73', textAlign: 'center', marginBottom: 24 }}>
              {t('invitations.inviteDetails', {
                building: info.building_name,
                role: ROLE_LABELS[info.role] ?? info.role,
              })}
            </p>
            <div style={{ background: '#F5F5F7', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#3C3C43' }}>
              <div><strong>{t('common.email')}:</strong> {info.email}</div>
              <div style={{ marginTop: 4 }}><strong>{t('invitations.role')}:</strong> {ROLE_LABELS[info.role] ?? info.role}</div>
            </div>
            <button
              onClick={handleAccept}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              {t('invitations.accept')}
            </button>
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
              {t('invitations.signInNote', { email: info.email })}
            </p>
          </>
        )}

        {state === 'accepting' && (
          <div style={{ textAlign: 'center', color: '#6E6E73', fontSize: 15 }}>{t('invitations.accepting')}</div>
        )}

        {state === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} color="#15803D" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>{t('invitations.accepted')}</h2>
            <p style={{ fontSize: 14, color: '#6E6E73' }}>{t('invitations.redirecting')}</p>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={48} color="#DC2626" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>{t('invitations.invalidToken')}</h2>
            <p style={{ fontSize: 14, color: '#6E6E73', marginBottom: 20 }}>{errorMsg}</p>
            <button onClick={() => navigate('/login')}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
              {t('auth.signIn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
