import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../shared/auth/AuthContext'

type Step = 'idle' | 'loading' | 'verify' | 'verifying' | 'error'

export default function LoginPage() {
  const { t } = useTranslation()
  const { session, loading } = useAuth()

  const [email, setEmail]       = useState('')
  const [step, setStep]         = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([])

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStep('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser:  true,
        emailRedirectTo:   `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStep('error')
      setErrorMsg(t('auth.otpError'))
      return
    }

    setStep('verify')
    setDigits(['', '', '', '', '', ''])
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) return

    setStep('verifying')
    setErrorMsg('')

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type:  'email',
    })

    if (error) {
      setStep('verify')
      setErrorMsg(t('auth.invalidCode'))
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }
    // session will be set by onAuthStateChange — Navigate handles redirect
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleApple() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{
      minHeight:          '100vh',
      display:            'flex',
      alignItems:         'center',
      justifyContent:     'center',
      fontFamily:         "'Inter', -apple-system, sans-serif",
      backgroundImage:    'url(https://images.unsplash.com/photo-1754444215892-b50d00eedf41?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
      backgroundSize:     'cover',
      backgroundPosition: 'center',
      position:           'relative' as const,
    }}>
      {/* Dark overlay */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'rgba(15,30,55,0.55)',
      }} />

      {/* ── Centered login card ─────────────────────────── */}
      <div style={{
        position:     'relative' as const,
        zIndex:       1,
        width:        '100%',
        maxWidth:     400,
        margin:       '24px',
        background:   '#FFFFFF',
        borderRadius: 16,
        padding:      '40px 36px',
        boxShadow:    '0 24px 64px rgba(0,0,0,0.30)',
      }}>
        <div style={{ width: '100%' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize:   26,
            fontWeight: 700,
            color:      '#1E3A5F',
            margin:     '0 0 4px',
          }}>
            Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
          </h2>
          <p style={{ color: '#6E6E73', fontSize: 13, margin: 0 }}>
            {t('auth.tagline')}
          </p>
        </div>

        {(step === 'verify' || step === 'verifying') ? (
          // ── OTP code entry ───────────────────────────────────
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width:          48,
                height:         48,
                borderRadius:   '50%',
                background:     '#FEF3C7',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                margin:         '0 auto 12px',
                fontSize:       22,
              }}>
                ✉️
              </div>
              <p style={{ fontWeight: 600, color: '#1E3A5F', fontSize: 15, marginBottom: 4 }}>
                {t('auth.checkEmail')}
              </p>
              <p style={{ color: '#6E6E73', fontSize: 13 }}>
                {t('auth.codeSentTo')} <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerify}>
              {/* 6-digit input */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    onPaste={i === 0 ? handleDigitPaste : undefined}
                    disabled={step === 'verifying'}
                    style={{
                      width:        44,
                      height:       52,
                      textAlign:    'center',
                      fontSize:     22,
                      fontWeight:   600,
                      color:        '#1E3A5F',
                      border:       `2px solid ${d ? '#1E3A5F' : 'rgba(60,60,67,0.18)'}`,
                      borderRadius: 8,
                      outline:      'none',
                      background:   '#FFFFFF',
                      transition:   'border-color 0.15s',
                    }}
                  />
                ))}
              </div>

              {errorMsg && (
                <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{errorMsg}</p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={step === 'verifying' || digits.join('').length < 6}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {step === 'verifying' ? t('auth.verifying') : t('auth.verifyCode')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                style={{ background: 'none', border: 'none', color: '#6E6E73', fontSize: 12, cursor: 'pointer' }}
              >
                {t('auth.resendCode')}
              </button>
              <button
                onClick={() => { setStep('idle'); setEmail('') }}
                style={{ background: 'none', border: 'none', color: '#6E6E73', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t('auth.useDifferentEmail')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Email form ─────────────────────────────────── */}
            <form onSubmit={handleSendCode}>
              <label htmlFor="email-input" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1E3A5F', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('auth.emailLabel')}
              </label>
              <input
                id="email-input"
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoFocus
                disabled={step === 'loading'}
              />

              {step === 'error' && (
                <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errorMsg}</p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={step === 'loading' || !email.trim()}
                style={{ width: '100%', marginTop: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {step === 'loading' ? t('auth.sending') : t('auth.sendCode')}
              </button>
            </form>

            {/* ── Divider ────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(60,60,67,0.10)' }} />
              <span style={{ color: '#6E6E73', fontSize: 12 }}>{t('auth.orContinueWith')}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(60,60,67,0.10)' }} />
            </div>

            {/* ── OAuth buttons ──────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <OAuthButton onClick={handleGoogle}    icon={<GoogleIcon />}    label={t('auth.continueGoogle')} />
              <OAuthButton onClick={handleMicrosoft} icon={<MicrosoftIcon />} label={t('auth.continueMicrosoft')} />
              <OAuthButton onClick={handleApple}     icon={<AppleIcon />}     label={t('auth.continueApple')} />
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

function OAuthButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            10,
        width:          '100%',
        padding:        '9px 16px',
        background:     '#FFFFFF',
        border:         '1px solid rgba(60,60,67,0.18)',
        borderRadius:   6,
        fontSize:       13,
        fontWeight:     500,
        color:          '#1E3A5F',
        cursor:         'pointer',
        transition:     'background 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = '#F2F2F7')}
      onMouseOut={e  => (e.currentTarget.style.background = '#FFFFFF')}
    >
      {icon}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1E3A5F">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
