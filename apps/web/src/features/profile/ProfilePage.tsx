import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../lib/i18n'
import { Shell }   from '../../components/layout/Shell'
import { Topbar }  from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useAuth }  from '../../shared/auth/AuthContext'

// ── Types ─────────────────────────────────────────────────────

interface ProfileData {
  full_name:          string
  email:              string
  preferred_language: 'en' | 'fr' | 'nl'
  avatar_url:         string | null
}

// ── API helper ────────────────────────────────────────────────

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

// ── Mock data (dev only) ──────────────────────────────────────

const MOCK_PROFILE: ProfileData = {
  full_name:          'Chris Ndiyalama',
  email:              'chris@syndicsage.com',
  preferred_language: 'fr',
  avatar_url:         null,
}

// ── Component ─────────────────────────────────────────────────

export default function ProfilePage() {
  const { t }       = useTranslation()
  const { session } = useAuth()

  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Avatar section
  const fileInputRef             = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError,     setAvatarError]     = useState('')

  // Name section
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue,   setNameValue]   = useState('')
  const [nameSaving,  setNameSaving]  = useState(false)

  // Language section
  const [langSaving,  setLangSaving]  = useState(false)

  // Password section
  const [pwNew,     setPwNew]     = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError,   setPwError]   = useState('')

  // ── Load profile ───────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!session) {
      setProfile(MOCK_PROFILE)
      setNameValue(MOCK_PROFILE.full_name)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/api/v1/profile', session.access_token) as ProfileData
      setProfile(data)
      setNameValue(data.full_name)
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [session, t])

  useEffect(() => { loadProfile() }, [loadProfile])

  // ── Save name ──────────────────────────────────────────────

  async function handleSaveName() {
    if (!profile) return
    if (!session) { setProfile({ ...profile, full_name: nameValue }); setNameEditing(false); return }
    setNameSaving(true)
    setErrorMsg('')
    try {
      const updated = await apiFetch('/api/v1/profile', session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ full_name: nameValue }),
      }) as ProfileData
      setProfile(updated)
      setNameEditing(false)
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setNameSaving(false)
    }
  }

  // ── Save language ──────────────────────────────────────────

  async function handleSaveLang(lang: 'en' | 'fr' | 'nl') {
    if (!profile || lang === profile.preferred_language) return
    if (!session) { setProfile({ ...profile, preferred_language: lang }); void i18n.changeLanguage(lang); return }
    setLangSaving(true)
    setErrorMsg('')
    try {
      const updated = await apiFetch('/api/v1/profile', session.access_token, {
        method: 'PATCH',
        body:   JSON.stringify({ preferred_language: lang }),
      }) as ProfileData
      setProfile(updated)
      void i18n.changeLanguage(lang)
    } catch {
      setErrorMsg(t('common.error'))
    } finally {
      setLangSaving(false)
    }
  }

  // ── Upload avatar ──────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!allowed.has(file.type)) { setAvatarError(t('profile.avatarBadType')); return }
    if (file.size > 2 * 1024 * 1024) { setAvatarError(t('profile.avatarTooLarge')); return }

    setAvatarError('')

    // Dev mode: show preview locally without calling the API
    if (!session) {
      const url = URL.createObjectURL(file)
      setProfile({ ...profile, avatar_url: url })
      return
    }

    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await fetch(`${API_URL}/api/v1/profile/avatar`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body:    form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const updated = await res.json() as ProfileData
      setProfile(updated)
    } catch {
      setAvatarError(t('common.error'))
    } finally {
      setAvatarUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Change password ────────────────────────────────────────

  async function handleChangePassword() {
    if (!session) return
    setPwError('')
    setPwSuccess(false)

    if (pwNew.length < 8) {
      setPwError(t('profile.pwTooShort'))
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError(t('profile.pwMismatch'))
      return
    }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwSaving(false)

    if (error) {
      setPwError(t('common.error'))
    } else {
      setPwNew('')
      setPwConfirm('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 4000)
    }
  }

  // ── Styles ─────────────────────────────────────────────────

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

  const input: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid rgba(60,60,67,0.25)',
    borderRadius: 7, fontSize: 13, color: '#1E3A5F', outline: 'none', boxSizing: 'border-box',
  }

  const LANGUAGES: { code: 'en' | 'fr' | 'nl'; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'nl', label: 'Nederlands' },
  ]

  // ─────────────────────────────────────────────────────────────
  return (
    <Shell>
      <Topbar title={t('profile.title')} />
      <div style={{ padding: 24, maxWidth: 560 }}>

        {/* Error banner */}
        {errorMsg && (
          <div style={{ padding: '10px 16px', background: '#FEF2F2', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(220,38,38,0.15)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{errorMsg}</p>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>
        ) : profile && (
          <>
            {/* ── Avatar ───────────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('profile.avatar')}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('profile.avatarSubtitle')}</p>
                </div>
              </div>
              <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Avatar circle */}
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

                {/* Upload controls */}
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

            {/* ── Name & Email ─────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('profile.personalInfo')}</h3>
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
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t('profile.fullName')}</div>
                      <div style={{ fontSize: 14, color: '#1E3A5F' }}>{profile.full_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t('common.email')}</div>
                      <div style={{ fontSize: 14, color: '#1E3A5F' }}>{profile.email}</div>
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
                        style={input}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label style={label}>{t('common.email')}</label>
                      <input type="text" value={profile.email} disabled style={{ ...input, background: '#F2F2F7', color: '#6E6E73', cursor: 'not-allowed' }} />
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

            {/* ── Language ─────────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('profile.language')}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('profile.languageSubtitle')}</p>
                </div>
              </div>
              <div style={{ padding: 20, display: 'flex', gap: 10 }}>
                {LANGUAGES.map(lang => {
                  const isSelected = profile.preferred_language === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSaveLang(lang.code)}
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
            </div>

            {/* ── Password ──────────────────────────────────── */}
            <div style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('profile.changePassword')}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E6E73' }}>{t('profile.changePasswordSubtitle')}</p>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
                  <div>
                    <label style={label}>{t('profile.newPassword')}</label>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={e => { setPwNew(e.target.value); setPwError('') }}
                      style={input}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label style={label}>{t('profile.confirmPassword')}</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={e => { setPwConfirm(e.target.value); setPwError('') }}
                      style={input}
                      placeholder="••••••••"
                    />
                  </div>

                  {pwError && (
                    <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{pwError}</p>
                  )}
                  {pwSuccess && (
                    <p style={{ margin: 0, fontSize: 12, color: '#15803D' }}>{t('profile.pwSuccess')}</p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving || !pwNew || !pwConfirm}
                      style={{ padding: '7px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (pwSaving || !pwNew || !pwConfirm) ? 0.6 : 1 }}
                    >
                      {pwSaving ? t('common.saving') : t('profile.changePasswordBtn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Shell>
  )
}
