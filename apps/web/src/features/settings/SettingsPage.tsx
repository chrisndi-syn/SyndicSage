import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/layout/Shell'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../shared/auth/AuthContext'

interface SessionRow {
  id:         string
  created_at: string
  updated_at: string
  not_after:  string | null
  is_current: boolean
}

type Status = 'idle' | 'loading' | 'error'

const API_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001'

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Request failed')
  }
  return res.json()
}

export default function SettingsPage() {
  const { t }     = useTranslation()
  const { session } = useAuth()

  const [sessions,        setSessions]        = useState<SessionRow[]>([])
  const [status,          setStatus]          = useState<Status>('idle')
  const [revokingId,      setRevokingId]      = useState<string | null>(null)
  const [revokingOthers,  setRevokingOthers]  = useState(false)
  const [errorMsg,        setErrorMsg]        = useState('')

  const loadSessions = useCallback(async () => {
    if (!session) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const data = await apiFetch('/api/v1/sessions', session.access_token) as SessionRow[]
      setSessions(data)
      setStatus('idle')
    } catch {
      setStatus('error')
      setErrorMsg(t('common.error'))
    }
  }, [session, t])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function handleRevoke(sessionId: string) {
    if (!session) return
    setRevokingId(sessionId)
    try {
      await apiFetch(`/api/v1/sessions/${sessionId}`, session.access_token, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setRevokingId(null)
    }
  }

  async function handleRevokeOthers() {
    if (!session) return
    setRevokingOthers(true)
    try {
      await apiFetch('/api/v1/sessions/others', session.access_token, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.is_current))
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setRevokingOthers(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const otherSessions = sessions.filter(s => !s.is_current)
  const currentSession = sessions.find(s => s.is_current)

  return (
    <Shell>
      <Topbar title={t('settings.title')} />
      <div style={{ padding: 24, maxWidth: 640 }}>

        {/* Sessions card */}
        <div style={{
          background:   '#FFFFFF',
          borderRadius: 10,
          border:       '1px solid rgba(60,60,67,0.10)',
          overflow:     'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:        '16px 20px',
            borderBottom:   '1px solid rgba(60,60,67,0.08)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>
                {t('settings.sessions.title')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>
                {t('settings.sessions.subtitle')}
              </p>
            </div>
            {otherSessions.length > 0 && (
              <button
                onClick={handleRevokeOthers}
                disabled={revokingOthers}
                style={{
                  padding:      '6px 12px',
                  background:   'transparent',
                  border:       '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 6,
                  color:        '#DC2626',
                  fontSize:     12,
                  fontWeight:   500,
                  cursor:       'pointer',
                  whiteSpace:   'nowrap',
                  opacity:      revokingOthers ? 0.6 : 1,
                }}
              >
                {revokingOthers ? t('common.loading') : t('settings.sessions.revokeOthers')}
              </button>
            )}
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{ padding: '10px 20px', background: '#FEF2F2', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{errorMsg}</p>
            </div>
          )}

          {/* Sessions list */}
          {status === 'loading' && sessions.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>
              {t('common.loading')}
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {/* Current session always first */}
              {currentSession && (
                <SessionItem
                  session={currentSession}
                  isCurrent={true}
                  isRevoking={false}
                  onRevoke={() => {}}
                  onSignOut={handleSignOut}
                  t={t}
                />
              )}
              {otherSessions.map(s => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isCurrent={false}
                  isRevoking={revokingId === s.id}
                  onRevoke={() => handleRevoke(s.id)}
                  onSignOut={() => {}}
                  t={t}
                />
              ))}
              {sessions.length === 0 && status === 'idle' && (
                <li style={{ padding: '20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>
                  {t('common.noData')}
                </li>
              )}
            </ul>
          )}
        </div>

      </div>
    </Shell>
  )
}

function SessionItem({
  session, isCurrent, isRevoking, onRevoke, onSignOut, t,
}: {
  session:    SessionRow
  isCurrent:  boolean
  isRevoking: boolean
  onRevoke:   () => void
  onSignOut:  () => void
  t:          (key: string) => string
}) {
  const signedIn = new Date(session.created_at)
  const lastSeen = new Date(session.updated_at)

  function fmt(d: Date) {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <li style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '14px 20px',
      borderBottom:   '1px solid rgba(60,60,67,0.06)',
      gap:            12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>
            {t('settings.sessions.signedIn')} {fmt(signedIn)}
          </span>
          {isCurrent && (
            <span style={{
              fontSize:     11,
              fontWeight:   600,
              color:        '#FFFFFF',
              background:   '#1E3A5F',
              borderRadius: 4,
              padding:      '1px 6px',
              letterSpacing: '0.02em',
            }}>
              {t('settings.sessions.current')}
            </span>
          )}
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>
          {t('settings.sessions.lastActive')} {fmt(lastSeen)}
          {session.not_after && (
            <> · {t('settings.sessions.expiresOn')} {fmt(new Date(session.not_after))}</>
          )}
        </p>
      </div>

      {isCurrent ? (
        <button
          onClick={onSignOut}
          style={{
            padding:      '5px 10px',
            background:   'transparent',
            border:       '1px solid rgba(60,60,67,0.18)',
            borderRadius: 6,
            color:        '#6E6E73',
            fontSize:     12,
            cursor:       'pointer',
            whiteSpace:   'nowrap',
          }}
        >
          {t('auth.signOut')}
        </button>
      ) : (
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          style={{
            padding:      '5px 10px',
            background:   'transparent',
            border:       '1px solid rgba(220,38,38,0.3)',
            borderRadius: 6,
            color:        '#DC2626',
            fontSize:     12,
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            opacity:      isRevoking ? 0.5 : 1,
          }}
        >
          {isRevoking ? '…' : t('settings.sessions.revokeSession')}
        </button>
      )}
    </li>
  )
}
