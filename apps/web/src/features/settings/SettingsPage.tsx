import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/layout/Shell'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../shared/auth/AuthContext'
import { useBuilding } from '../../shared/building/BuildingContext'

// ── Types ─────────────────────────────────────────────────────

interface SessionRow {
  id:         string
  created_at: string
  updated_at: string
  not_after:  string | null
  is_current: boolean
}

interface OrgData {
  id:         string
  name:       string
  vat_number: string | null
  plan:       string
  created_at: string
}

interface MemberRow {
  id:           string
  user_id:      string
  building_id:  string
  building_name: string
  role:         string
  joined_at:    string | null
  profile:      { full_name: string; email: string } | null
}

interface FeatureFlag {
  key:         string
  enabled:     boolean
  description: string | null
}

interface AuditEntry {
  id:            string
  user_id:       string
  user_name:     string
  building_id:   string | null
  action:        string
  resource_type: string
  resource_id:   string | null
  created_at:    string
}

interface GdprRequest {
  id:          string
  user_id:     string
  type:        string
  status:      string
  notes:       string | null
  deadline_at: string
  created_at:  string
  profile:     { full_name: string; email: string } | null
}

// ── API helpers ───────────────────────────────────────────────

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

// ── Tab names ─────────────────────────────────────────────────

type Tab = 'sessions' | 'team' | 'org' | 'audit' | 'flags' | 'gdpr'

// ── Role badge colors ─────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  syndic:    { bg: '#EFF6FF', color: '#1D4ED8' },
  co_syndic: { bg: '#F0FDF4', color: '#15803D' },
  co_owner:  { bg: '#FFF7ED', color: '#C2410C' },
  renter:    { bg: '#F5F3FF', color: '#6D28D9' },
}

const GDPR_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:    { bg: '#FFF7ED', color: '#C2410C' },
  processing: { bg: '#EFF6FF', color: '#1D4ED8' },
  completed:  { bg: '#F0FDF4', color: '#15803D' },
  denied:     { bg: '#FEF2F2', color: '#DC2626' },
}

// ── Component ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { t }     = useTranslation()
  const { session } = useAuth()
  const { myRole }  = useBuilding()

  const [activeTab, setActiveTab] = useState<Tab>('sessions')

  // Sessions state
  const [sessions,       setSessions]       = useState<SessionRow[]>([])
  const [sessionStatus,  setSessionStatus]  = useState<'idle' | 'loading' | 'error'>('idle')
  const [revokingId,     setRevokingId]     = useState<string | null>(null)
  const [revokingOthers, setRevokingOthers] = useState(false)

  // Org state
  const [org,         setOrg]         = useState<OrgData | null>(null)
  const [orgEditing,  setOrgEditing]  = useState(false)
  const [orgName,     setOrgName]     = useState('')
  const [orgVat,      setOrgVat]      = useState('')
  const [orgSaving,   setOrgSaving]   = useState(false)

  // Members state
  const [members,       setMembers]       = useState<MemberRow[]>([])
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  // Feature flags state
  const [flags,        setFlags]        = useState<FeatureFlag[]>([])
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null)

  // Audit log state
  const [auditRows,  setAuditRows]  = useState<AuditEntry[]>([])
  const [auditPage,  setAuditPage]  = useState(1)

  // GDPR state
  const [gdprRows,    setGdprRows]    = useState<GdprRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Shared error
  const [errorMsg, setErrorMsg] = useState('')

  // ── Load sessions ──────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    if (!session) return
    setSessionStatus('loading')
    setErrorMsg('')
    try {
      const data = await apiFetch('/api/v1/sessions', session.access_token) as SessionRow[]
      setSessions(data)
      setSessionStatus('idle')
    } catch {
      setSessionStatus('error')
      setErrorMsg(t('common.error'))
    }
  }, [session, t])

  useEffect(() => { loadSessions() }, [loadSessions])

  // ── Load org ───────────────────────────────────────────────

  const loadOrg = useCallback(async () => {
    if (!session) return
    try {
      const data = await apiFetch('/api/v1/settings/org', session.access_token) as OrgData
      setOrg(data)
      setOrgName(data.name)
      setOrgVat(data.vat_number ?? '')
    } catch { /* silent */ }
  }, [session])

  // ── Load members ───────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    if (!session) return
    try {
      const data = await apiFetch('/api/v1/settings/members', session.access_token) as MemberRow[]
      setMembers(data)
    } catch { /* silent */ }
  }, [session])

  // ── Load feature flags ─────────────────────────────────────

  const loadFlags = useCallback(async () => {
    if (!session) return
    try {
      const data = await apiFetch('/api/v1/settings/feature-flags', session.access_token) as FeatureFlag[]
      setFlags(data)
    } catch { /* silent */ }
  }, [session])

  // ── Load audit log ─────────────────────────────────────────

  const loadAudit = useCallback(async (page: number) => {
    if (!session) return
    try {
      const res = await apiFetch(`/api/v1/settings/audit-log?page=${page}&limit=50`, session.access_token) as { rows: AuditEntry[] }
      setAuditRows(res.rows)
    } catch { /* silent */ }
  }, [session])

  // ── Load GDPR ──────────────────────────────────────────────

  const loadGdpr = useCallback(async () => {
    if (!session) return
    try {
      const data = await apiFetch('/api/v1/settings/gdpr', session.access_token) as GdprRequest[]
      setGdprRows(data)
    } catch { /* silent */ }
  }, [session])

  // ── Tab change loader ──────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'org')   loadOrg()
    if (activeTab === 'team')  loadMembers()
    if (activeTab === 'flags') loadFlags()
    if (activeTab === 'audit') loadAudit(auditPage)
    if (activeTab === 'gdpr')  loadGdpr()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session handlers ───────────────────────────────────────

  async function handleRevoke(sessionId: string) {
    if (!session) return
    setRevokingId(sessionId)
    try {
      await apiFetch(`/api/v1/sessions/${sessionId}`, session.access_token, { method: 'DELETE' })
      await loadSessions()
    } catch { setErrorMsg(t('common.error')) }
    finally { setRevokingId(null) }
  }

  async function handleRevokeOthers() {
    if (!session) return
    setRevokingOthers(true)
    try {
      await apiFetch('/api/v1/sessions/others', session.access_token, { method: 'DELETE' })
      await loadSessions()
    } catch { setErrorMsg(t('common.error')) }
    finally { setRevokingOthers(false) }
  }

  async function handleSignOut() { await supabase.auth.signOut() }

  // ── Org handler ────────────────────────────────────────────

  async function handleSaveOrg() {
    if (!session) return
    setOrgSaving(true)
    try {
      const updated = await apiFetch('/api/v1/settings/org', session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ name: orgName, vat_number: orgVat || undefined }),
      }) as OrgData
      setOrg(updated)
      setOrgEditing(false)
    } catch { setErrorMsg(t('common.error')) }
    finally { setOrgSaving(false) }
  }

  // ── Member handler ─────────────────────────────────────────

  async function handleRemoveMember(userId: string, buildingId: string) {
    if (!session) return
    const key = `${userId}:${buildingId}`
    setRemovingMember(key)
    try {
      await apiFetch(`/api/v1/settings/members/${userId}/${buildingId}`, session.access_token, { method: 'DELETE' })
      await loadMembers()
    } catch { setErrorMsg(t('common.error')) }
    finally { setRemovingMember(null) }
  }

  // ── Flag handler ───────────────────────────────────────────

  async function handleToggleFlag(key: string, current: boolean) {
    if (!session) return
    setTogglingFlag(key)
    try {
      await apiFetch(`/api/v1/settings/feature-flags/${key}`, session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ enabled: !current }),
      })
      await loadFlags()
    } catch { setErrorMsg(t('common.error')) }
    finally { setTogglingFlag(null) }
  }

  // ── GDPR handler ───────────────────────────────────────────

  async function handleGdprStatus(id: string, status: string) {
    if (!session) return
    setProcessingId(id)
    try {
      await apiFetch(`/api/v1/settings/gdpr/${id}`, session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
      })
      await loadGdpr()
    } catch { setErrorMsg(t('common.error')) }
    finally { setProcessingId(null) }
  }

  // ── Derived ────────────────────────────────────────────────

  const otherSessions  = sessions.filter(s => !s.is_current)
  const currentSession = sessions.find(s => s.is_current)
  const isSyndic       = myRole === 'syndic'

  const TABS: { key: Tab; label: string; syndicOnly?: boolean }[] = [
    { key: 'sessions', label: t('settings.sessions.title') },
    { key: 'team',     label: t('settings.team')           },
    { key: 'org',      label: t('settings.organization'),  syndicOnly: true },
    { key: 'audit',    label: t('settings.auditLog'),      syndicOnly: true },
    { key: 'flags',    label: t('settings.featureFlags'),  syndicOnly: true },
    { key: 'gdpr',     label: t('settings.gdpr.title'),    syndicOnly: true },
  ]

  function fmt(d: Date) {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ── Shared card style ──────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
  }

  const cardHeader: React.CSSProperties = {
    padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <Shell>
      <Topbar title={t('settings.title')} />
      <div style={{ padding: 24, maxWidth: 860 }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: '#F2F2F7', borderRadius: 10, padding: 4,
          width: 'fit-content',
        }}>
          {TABS.filter(tab => !tab.syndicOnly || isSyndic).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setErrorMsg('') }}
              style={{
                padding:      '6px 14px',
                borderRadius: 7,
                border:       'none',
                background:   activeTab === tab.key ? '#FFFFFF' : 'transparent',
                boxShadow:    activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                color:        activeTab === tab.key ? '#1E3A5F' : '#6E6E73',
                fontSize:     13,
                fontWeight:   activeTab === tab.key ? 600 : 400,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div style={{ padding: '10px 16px', background: '#FEF2F2', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(220,38,38,0.15)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{errorMsg}</p>
          </div>
        )}

        {/* ── Sessions tab ────────────────────────────────── */}
        {activeTab === 'sessions' && (
          <div style={card}>
            <div style={cardHeader}>
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
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', opacity: revokingOthers ? 0.6 : 1 }}
                >
                  {revokingOthers ? t('common.loading') : t('settings.sessions.revokeOthers')}
                </button>
              )}
            </div>

            {sessionStatus === 'loading' && sessions.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {currentSession && (
                  <SessionItem session={currentSession} isCurrent={true} isRevoking={false} onRevoke={() => {}} onSignOut={handleSignOut} t={t} />
                )}
                {otherSessions.map(s => (
                  <SessionItem key={s.id} session={s} isCurrent={false} isRevoking={revokingId === s.id} onRevoke={() => handleRevoke(s.id)} onSignOut={() => {}} t={t} />
                ))}
                {sessions.length === 0 && sessionStatus === 'idle' && (
                  <li style={{ padding: '20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* ── Team tab ────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div style={card}>
            <div style={cardHeader}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('settings.team')}</h3>
              <span style={{ fontSize: 12, color: '#6E6E73' }}>{members.length} {t('settings.members')}</span>
            </div>
            {members.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9F9F9' }}>
                    {[t('settings.memberName'), t('settings.building'), t('settings.role'), t('settings.joinedAt'), ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(60,60,67,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const roleStyle = ROLE_COLORS[m.role] ?? { bg: '#F2F2F7', color: '#3C3C43' }
                    const key = `${m.user_id}:${m.building_id}`
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>{m.profile?.full_name ?? '—'}</div>
                          <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{m.profile?.email ?? ''}</div>
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: '#3C3C43' }}>{m.building_name}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: roleStyle.bg, color: roleStyle.color }}>
                            {t(`roles.${m.role}`)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: '#6E6E73' }}>
                          {m.joined_at ? fmt(new Date(m.joined_at)) : '—'}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          {isSyndic && m.role !== 'syndic' && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id, m.building_id)}
                              disabled={removingMember === key}
                              style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 11, cursor: 'pointer', opacity: removingMember === key ? 0.5 : 1 }}
                            >
                              {removingMember === key ? '…' : t('settings.removeMember')}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Organisation tab ────────────────────────────── */}
        {activeTab === 'org' && (
          <div style={card}>
            <div style={cardHeader}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('settings.organization')}</h3>
              {!orgEditing && (
                <button
                  onClick={() => { setOrgName(org?.name ?? ''); setOrgVat(org?.vat_number ?? ''); setOrgEditing(true) }}
                  style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(30,58,95,0.25)', borderRadius: 6, color: '#1E3A5F', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                >
                  {t('common.edit')}
                </button>
              )}
            </div>

            {!org ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>
            ) : (
              <div style={{ padding: 20 }}>
                {!orgEditing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                      [t('settings.orgName'),   org.name],
                      [t('settings.vatNumber'), org.vat_number ?? '—'],
                      [t('settings.plan'),      org.plan.charAt(0).toUpperCase() + org.plan.slice(1)],
                      [t('settings.createdAt'), fmt(new Date(org.created_at))],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 14, color: '#1E3A5F' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                    {[
                      { label: t('settings.orgName'),   value: orgName, setter: setOrgName,   type: 'text' as const },
                      { label: t('settings.vatNumber'), value: orgVat,  setter: setOrgVat,    type: 'text' as const },
                    ].map(({ label, value, setter, type }) => (
                      <div key={label}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 6 }}>{label}</label>
                        <input
                          type={type}
                          value={value}
                          onChange={e => setter(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(60,60,67,0.25)', borderRadius: 7, fontSize: 13, color: '#1E3A5F', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setOrgEditing(false)}
                        style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7, color: '#6E6E73', fontSize: 13, cursor: 'pointer' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveOrg}
                        disabled={orgSaving}
                        style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: orgSaving ? 0.7 : 1 }}
                      >
                        {orgSaving ? t('common.loading') : t('common.save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Audit Log tab ────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div style={card}>
            <div style={cardHeader}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('settings.auditLog')}</h3>
            </div>
            {auditRows.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9F9F9' }}>
                      {[t('settings.when'), t('settings.who'), t('settings.action'), t('settings.resource')].map((h, i) => (
                        <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(60,60,67,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap' }}>
                          {fmt(new Date(row.created_at))}
                        </td>
                        <td style={{ padding: '10px 20px', fontSize: 13, color: '#1E3A5F' }}>{row.user_name}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <code style={{ fontSize: 11, background: '#F2F2F7', padding: '2px 6px', borderRadius: 4, color: '#3C3C43' }}>{row.action}</code>
                        </td>
                        <td style={{ padding: '10px 20px', fontSize: 12, color: '#6E6E73' }}>
                          {row.resource_type}{row.resource_id ? ` · ${row.resource_id.slice(0, 8)}…` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(60,60,67,0.06)' }}>
                  <button
                    onClick={() => { const p = Math.max(1, auditPage - 1); setAuditPage(p); loadAudit(p) }}
                    disabled={auditPage === 1}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 5, fontSize: 12, cursor: 'pointer', opacity: auditPage === 1 ? 0.4 : 1 }}
                  >←</button>
                  <span style={{ fontSize: 12, color: '#6E6E73' }}>{t('settings.page')} {auditPage}</span>
                  <button
                    onClick={() => { const p = auditPage + 1; setAuditPage(p); loadAudit(p) }}
                    disabled={auditRows.length < 50}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 5, fontSize: 12, cursor: 'pointer', opacity: auditRows.length < 50 ? 0.4 : 1 }}
                  >→</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Feature Flags tab ────────────────────────────── */}
        {activeTab === 'flags' && (
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('settings.featureFlags')}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('settings.featureFlagsSubtitle')}</p>
              </div>
            </div>
            {flags.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {flags.map(flag => (
                  <li key={flag.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(60,60,67,0.06)', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F', fontFamily: 'monospace' }}>{flag.key}</div>
                      {flag.description && <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>{flag.description}</div>}
                    </div>
                    <button
                      onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                      disabled={togglingFlag === flag.key}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: flag.enabled ? '#F59E0B' : '#D1D1D6',
                        opacity: togglingFlag === flag.key ? 0.6 : 1,
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                      title={flag.enabled ? t('common.disable') : t('common.enable')}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: flag.enabled ? 22 : 2,
                        width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                      }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── GDPR tab ─────────────────────────────────────── */}
        {activeTab === 'gdpr' && (
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('settings.gdpr.title')}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('settings.gdpr.subtitle')}</p>
              </div>
            </div>
            {gdprRows.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {gdprRows.map(req => {
                  const statusStyle = GDPR_STATUS_COLORS[req.status] ?? { bg: '#F2F2F7', color: '#3C3C43' }
                  const isOverdue   = req.status === 'pending' && new Date(req.deadline_at) < new Date()
                  return (
                    <li key={req.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>
                              {req.profile?.full_name ?? req.user_id}
                            </span>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8' }}>
                              {t(`settings.gdpr.type_${req.type}`)}
                            </span>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                              {t(`settings.gdpr.status_${req.status}`)}
                            </span>
                            {isOverdue && (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#FEF2F2', color: '#DC2626' }}>
                                {t('settings.gdpr.overdue')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 4 }}>
                            {req.profile?.email} · {t('settings.gdpr.deadline')}: {fmt(new Date(req.deadline_at))}
                          </div>
                          {req.notes && <div style={{ fontSize: 12, color: '#3C3C43', marginTop: 4 }}>{req.notes}</div>}
                        </div>

                        {req.status !== 'completed' && req.status !== 'denied' && (
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {req.status === 'pending' && (
                              <button
                                onClick={() => handleGdprStatus(req.id, 'processing')}
                                disabled={processingId === req.id}
                                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(29,78,216,0.3)', borderRadius: 6, color: '#1D4ED8', fontSize: 11, cursor: 'pointer' }}
                              >
                                {t('settings.gdpr.markProcessing')}
                              </button>
                            )}
                            <button
                              onClick={() => handleGdprStatus(req.id, 'completed')}
                              disabled={processingId === req.id}
                              style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(21,128,61,0.3)', borderRadius: 6, color: '#15803D', fontSize: 11, cursor: 'pointer' }}
                            >
                              {t('settings.gdpr.markDone')}
                            </button>
                            <button
                              onClick={() => handleGdprStatus(req.id, 'denied')}
                              disabled={processingId === req.id}
                              style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 11, cursor: 'pointer' }}
                            >
                              {t('settings.gdpr.deny')}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

      </div>
    </Shell>
  )
}

// ── SessionItem ───────────────────────────────────────────────

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
    <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(60,60,67,0.06)', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>
            {t('settings.sessions.signedIn')} {fmt(signedIn)}
          </span>
          {isCurrent && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: '#1E3A5F', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.02em' }}>
              {t('settings.sessions.current')}
            </span>
          )}
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>
          {t('settings.sessions.lastActive')} {fmt(lastSeen)}
          {session.not_after && <> · {t('settings.sessions.expiresOn')} {fmt(new Date(session.not_after))}</>}
        </p>
      </div>

      {isCurrent ? (
        <button onClick={onSignOut} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6, color: '#6E6E73', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {t('auth.signOut')}
        </button>
      ) : (
        <button onClick={onRevoke} disabled={isRevoking} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: isRevoking ? 0.5 : 1 }}>
          {isRevoking ? '…' : t('settings.sessions.revokeSession')}
        </button>
      )}
    </li>
  )
}
