import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../lib/i18n'
import { Shell }      from '../../components/layout/Shell'
import { Topbar }     from '../../components/layout/Topbar'
import { useAuth }    from '../../shared/auth/AuthContext'
import { useBuilding } from '../../shared/building/BuildingContext'

// ── Types ─────────────────────────────────────────────────────

interface PortalProfile {
  full_name:          string
  email:              string
  preferred_language: 'en' | 'fr' | 'nl'
  avatar_url:         string | null
  role:               'co_owner' | 'renter'
  unit_number:        string | null
  joined_at:          string | null
  left_at:            string | null
  occupant_count:     number | null
  mailing_address:    string | null
  building_name:      string | null
  building_address:   string | null
}

// ── Helpers ───────────────────────────────────────────────────

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(path, {
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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────

export default function PortalProfilePage() {
  const { t }          = useTranslation()
  const { session }    = useAuth()
  const { selected: building } = useBuilding()

  const [profile,  setProfile]  = useState<PortalProfile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Avatar
  const fileInputRef                          = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError,     setAvatarError]     = useState('')

  // Name section
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue,   setNameValue]   = useState('')
  const [nameSaving,  setNameSaving]  = useState(false)

  // Address + occupants section
  const [residentEditing,   setResidentEditing]   = useState(false)
  const [addressValue,      setAddressValue]       = useState('')
  const [occupantsValue,    setOccupantsValue]     = useState('')
  const [leftAtValue,       setLeftAtValue]        = useState('')
  const [residentSaving,    setResidentSaving]     = useState(false)

  // Language section
  const [selectedLang, setSelectedLang] = useState<'en' | 'fr' | 'nl' | null>(null)
  const [langSaving,   setLangSaving]   = useState(false)

  const [successMsg, setSuccessMsg] = useState('')

  // ── Load ──────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!session) { setLoading(false); return }
    if (!building) return  // wait for building to load
    setLoading(true)
    try {
      const data = await apiFetch(`/api/v1/portal/profile?building_id=${building.id}`, session.access_token) as PortalProfile
      setProfile(data)
      setNameValue(data.full_name)
      setAddressValue(data.mailing_address ?? '')
      setOccupantsValue(data.occupant_count != null ? String(data.occupant_count) : '')
      setLeftAtValue(data.left_at ? data.left_at.slice(0, 10) : '')
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [session, building, t])

  useEffect(() => { loadProfile() }, [loadProfile])

  function flashSuccess() {
    setSuccessMsg(t('portal.profileSaved'))
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  // ── Save name ─────────────────────────────────────────────

  async function handleSaveName() {
    if (!profile || !session) return
    setNameSaving(true)
    setErrorMsg('')
    try {
      await apiFetch('/api/v1/profile', session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ full_name: nameValue }),
      })
      setProfile(p => p ? { ...p, full_name: nameValue } : p)
      setNameEditing(false)
      flashSuccess()
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setNameSaving(false)
    }
  }

  // ── Save resident fields ───────────────────────────────────

  async function handleSaveResident() {
    if (!profile || !session) return
    setResidentSaving(true)
    setErrorMsg('')
    try {
      const occupants = occupantsValue.trim() === '' ? null : parseInt(occupantsValue, 10)
      const leftAt    = leftAtValue.trim() === '' ? null : new Date(leftAtValue).toISOString()

      await apiFetch(`/api/v1/portal/profile?building_id=${building!.id}`, session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({
          mailing_address: addressValue.trim() || null,
          occupant_count:  occupants,
          left_at:         leftAt,
        }),
      })
      setProfile(p => p ? {
        ...p,
        mailing_address: addressValue.trim() || null,
        occupant_count:  occupants,
        left_at:         leftAt,
      } : p)
      setResidentEditing(false)
      flashSuccess()
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setResidentSaving(false)
    }
  }

  // ── Save language ─────────────────────────────────────────

  async function handleSaveLang() {
    const lang = selectedLang
    if (!profile || !lang || lang === profile.preferred_language || !session) return
    setLangSaving(true)
    setErrorMsg('')
    try {
      await apiFetch('/api/v1/profile', session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ preferred_language: lang }),
      })
      setProfile(p => p ? { ...p, preferred_language: lang } : p)
      setSelectedLang(null)
      void i18n.changeLanguage(lang)
      flashSuccess()
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setLangSaving(false)
    }
  }

  // ── Avatar upload ─────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile || !session) return

    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!allowed.has(file.type)) { setAvatarError(t('profile.avatarBadType')); return }
    if (file.size > 2 * 1024 * 1024) { setAvatarError(t('profile.avatarTooLarge')); return }

    setAvatarError('')
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await fetch('/api/v1/profile/avatar', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body:    form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const updated = await res.json() as { avatar_url: string | null }
      setProfile(p => p ? { ...p, avatar_url: updated.avatar_url } : p)
    } catch {
      setAvatarError(t('common.error'))
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Styles ────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden', marginBottom: 16,
  }
  const cardHeader: React.CSSProperties = {
    padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid rgba(60,60,67,0.25)',
    borderRadius: 7, fontSize: 13, color: '#1E3A5F', outline: 'none', boxSizing: 'border-box',
  }
  const readOnlyChip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', background: '#F2F2F7', borderRadius: 20,
    fontSize: 10, color: '#6E6E73', fontWeight: 500,
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
  }
  const fieldValue: React.CSSProperties = {
    fontSize: 14, color: '#1E3A5F',
  }

  const LANGUAGES: { code: 'en' | 'fr' | 'nl'; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'nl', label: 'Nederlands' },
  ]

  const roleLabel = profile?.role === 'renter' ? t('portal.profileRoleRenter') : t('portal.profileRoleCo_owner')

  // ─────────────────────────────────────────────────────────────

  return (
    <Shell>
      <Topbar title={t('portal.profileTitle')} subtitle={profile?.building_name ?? undefined} />
      <div style={{ padding: 24, maxWidth: 560 }}>

        {/* Error banner */}
        {errorMsg && (
          <div style={{ padding: '10px 16px', background: '#FEF2F2', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(220,38,38,0.15)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{errorMsg}</p>
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div style={{ padding: '10px 16px', background: '#F0FDF4', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(22,163,74,0.18)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#15803D' }}>{successMsg}</p>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>
        ) : profile && (
          <>
            {/* ── Avatar ──────────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('portal.profileAvatar')}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('portal.profileAvatarSubtitle')}</p>
                </div>
              </div>
              <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, color: '#1E3A5F',
                    }}>
                      {profile.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {avatarUploading && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: avatarUploading ? 0.6 : 1 }}
                  >
                    {avatarUploading ? t('common.loading') : t('profile.avatarUpload')}
                  </button>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6E6E73' }}>{t('profile.avatarHint')}</p>
                  {avatarError && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#DC2626' }}>{avatarError}</p>}
                </div>
              </div>
            </div>

            {/* ── Personal info ────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('portal.profilePersonalInfo')}</h3>
                {!nameEditing && (
                  <button
                    onClick={() => { setNameValue(profile.full_name); setNameEditing(true) }}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(30,58,95,0.25)', borderRadius: 6, color: '#1E3A5F', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {t('common.edit')}
                  </button>
                )}
              </div>
              <div style={{ padding: 20 }}>
                {!nameEditing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={fieldLabel}>{t('profile.fullName')}</div>
                      <div style={fieldValue}>{profile.full_name}</div>
                    </div>
                    <div>
                      <div style={fieldLabel}>{t('common.email')}</div>
                      <div style={fieldValue}>{profile.email}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
                    <div>
                      <label style={label}>{t('profile.fullName')}</label>
                      <input
                        type="text"
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        style={inputStyle}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={label}>{t('common.email')}</label>
                      <input type="text" value={profile.email} disabled style={{ ...inputStyle, background: '#F2F2F7', color: '#6E6E73', cursor: 'not-allowed' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setNameEditing(false)}
                        style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7, color: '#6E6E73', fontSize: 13, cursor: 'pointer' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveName}
                        disabled={nameSaving || nameValue.trim().length === 0}
                        style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: nameSaving ? 0.7 : 1 }}
                      >
                        {nameSaving ? t('common.saving') : t('common.save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Apartment info ───────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('portal.profileApartment')}</h3>
                {!residentEditing && (
                  <button
                    onClick={() => {
                      setAddressValue(profile.mailing_address ?? '')
                      setOccupantsValue(profile.occupant_count != null ? String(profile.occupant_count) : '')
                      setLeftAtValue(profile.left_at ? profile.left_at.slice(0, 10) : '')
                      setResidentEditing(true)
                    }}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(30,58,95,0.25)', borderRadius: 6, color: '#1E3A5F', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {t('common.edit')}
                  </button>
                )}
              </div>
              <div style={{ padding: 20 }}>
                {!residentEditing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Building */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={fieldLabel}>{t('portal.profileBuilding')}</div>
                      <div style={fieldValue}>{profile.building_name ?? '—'}</div>
                      {profile.building_address && (
                        <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>{profile.building_address}</div>
                      )}
                    </div>

                    {/* Unit number — read-only */}
                    <div>
                      <div style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t('portal.profileUnitNumber')}
                        <span style={readOnlyChip}>{t('portal.profileReadOnly')}</span>
                      </div>
                      <div style={fieldValue}>{profile.unit_number ?? t('portal.profileNoUnit')}</div>
                    </div>

                    {/* Role — read-only */}
                    <div>
                      <div style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t('portal.profileRole')}
                        <span style={readOnlyChip}>{t('portal.profileReadOnly')}</span>
                      </div>
                      <div style={fieldValue}>{roleLabel}</div>
                    </div>

                    {/* Joined at — read-only */}
                    <div>
                      <div style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t('portal.profileJoinedAt')}
                        <span style={readOnlyChip}>{t('portal.profileReadOnly')}</span>
                      </div>
                      <div style={fieldValue}>{formatDate(profile.joined_at)}</div>
                    </div>

                    {/* Left at */}
                    <div>
                      <div style={fieldLabel}>{t('portal.profileLeftAt')}</div>
                      <div style={fieldValue}>{formatDate(profile.left_at)}</div>
                    </div>

                    {/* Mailing address */}
                    <div>
                      <div style={fieldLabel}>{t('portal.profileAddress')}</div>
                      <div style={fieldValue}>{profile.mailing_address || '—'}</div>
                    </div>

                    {/* Occupants */}
                    <div>
                      <div style={fieldLabel}>{t('portal.profileOccupants')}</div>
                      <div style={fieldValue}>{profile.occupant_count ?? '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>

                    {/* Read-only fields shown as disabled */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={label}>
                          {t('portal.profileUnitNumber')}
                          <span style={{ ...readOnlyChip, marginLeft: 6 }}>{t('portal.profileReadOnly')}</span>
                        </label>
                        <input type="text" value={profile.unit_number ?? ''} disabled style={{ ...inputStyle, background: '#F2F2F7', color: '#6E6E73', cursor: 'not-allowed' }} />
                      </div>
                      <div>
                        <label style={label}>
                          {t('portal.profileJoinedAt')}
                          <span style={{ ...readOnlyChip, marginLeft: 6 }}>{t('portal.profileReadOnly')}</span>
                        </label>
                        <input type="text" value={formatDate(profile.joined_at)} disabled style={{ ...inputStyle, background: '#F2F2F7', color: '#6E6E73', cursor: 'not-allowed' }} />
                      </div>
                    </div>

                    {/* Mailing address */}
                    <div>
                      <label style={label}>{t('portal.profileAddress')}</label>
                      <input
                        type="text"
                        value={addressValue}
                        onChange={e => setAddressValue(e.target.value)}
                        placeholder={t('portal.profileAddressPlaceholder')}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Occupants */}
                      <div>
                        <label style={label}>{t('portal.profileOccupants')}</label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={occupantsValue}
                          onChange={e => setOccupantsValue(e.target.value)}
                          placeholder="1"
                          style={inputStyle}
                        />
                      </div>

                      {/* Left at */}
                      <div>
                        <label style={label}>
                          {t('portal.profileLeftAt')}
                          <span style={{ fontSize: 10, color: '#6E6E73', marginLeft: 6 }}>{t('portal.profileLeftAtHint')}</span>
                        </label>
                        <input
                          type="date"
                          value={leftAtValue}
                          onChange={e => setLeftAtValue(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setResidentEditing(false)}
                        style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7, color: '#6E6E73', fontSize: 13, cursor: 'pointer' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveResident}
                        disabled={residentSaving}
                        style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: residentSaving ? 0.7 : 1 }}
                      >
                        {residentSaving ? t('common.saving') : t('common.save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Language ─────────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('profile.language')}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('profile.languageSubtitle')}</p>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  {LANGUAGES.map(lang => {
                    const activeLang = selectedLang ?? profile.preferred_language
                    const isSelected = activeLang === lang.code
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLang(lang.code)}
                        disabled={langSaving}
                        style={{
                          padding:      '8px 20px',
                          borderRadius: 8,
                          border:       isSelected ? '2px solid #F59E0B' : '1px solid rgba(60,60,67,0.2)',
                          background:   isSelected ? 'rgba(245,158,11,0.08)' : '#FFFFFF',
                          color:        isSelected ? '#B45309' : '#3C3C43',
                          fontSize:     13,
                          fontWeight:   isSelected ? 600 : 400,
                          cursor:       langSaving ? 'not-allowed' : 'pointer',
                          opacity:      langSaving ? 0.6 : 1,
                          transition:   'all 0.15s',
                        }}
                      >
                        {lang.label}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={handleSaveLang}
                  disabled={langSaving || !selectedLang || selectedLang === profile.preferred_language}
                  style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (langSaving || !selectedLang || selectedLang === profile.preferred_language) ? 0.4 : 1 }}
                >
                  {langSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Shell>
  )
}
