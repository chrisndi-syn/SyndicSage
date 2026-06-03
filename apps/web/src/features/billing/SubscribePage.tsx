import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth }     from '../../shared/auth/AuthContext'
import { useBuilding } from '../../shared/building/BuildingContext'

const API_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001'

type Plan = 'starter' | 'pro'

interface PlanCard {
  key:      Plan
  price:    string
  period:   string
  tagline:  string
  features: string[]
  cta:      string
  accent:   boolean
}

export default function SubscribePage() {
  const { t }            = useTranslation()
  const navigate         = useNavigate()
  const { session }      = useAuth()
  const { orgPlan }      = useBuilding()
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError]     = useState('')

  // Already subscribed — go home
  if (orgPlan && orgPlan !== 'free') {
    navigate('/', { replace: true })
    return null
  }

  const plans: PlanCard[] = [
    {
      key:     'starter',
      price:   '€49',
      period:  t('billing.perMonth'),
      tagline: t('billing.starterTagline'),
      cta:     t('billing.getStarted'),
      accent:  false,
      features: [
        t('billing.feature_buildings3'),
        t('billing.feature_owners'),
        t('billing.feature_charges'),
        t('billing.feature_documents'),
        t('billing.feature_tickets'),
        t('billing.feature_messaging'),
      ],
    },
    {
      key:     'pro',
      price:   '€99',
      period:  t('billing.perMonth'),
      tagline: t('billing.proTagline'),
      cta:     t('billing.getStartedPro'),
      accent:  true,
      features: [
        t('billing.feature_buildingsUnlimited'),
        t('billing.feature_owners'),
        t('billing.feature_charges'),
        t('billing.feature_documents'),
        t('billing.feature_tickets'),
        t('billing.feature_messaging'),
        t('billing.feature_ai'),
        t('billing.feature_meetings'),
        t('billing.feature_reports'),
      ],
    },
  ]

  async function handleSelect(plan: Plan) {
    if (!session) return
    setLoading(plan)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch {
      setError(t('common.error'))
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      background:     'linear-gradient(135deg, #0F2444 0%, #1E3A5F 60%, #2A5298 100%)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '40px 24px',
    }}>

      {/* Logo mark */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" fill="#F59E0B" opacity="0.9" />
            <rect x="9" y="13" width="6" height="8" rx="1" fill="#FFFFFF" opacity="0.8" />
          </svg>
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          {t('billing.title')}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 420, lineHeight: 1.5 }}>
          {t('billing.subtitle')}
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 720, width: '100%' }}>
        {plans.map(plan => (
          <div key={plan.key} style={{
            flex:          '1 1 280px',
            maxWidth:      320,
            background:    plan.accent ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.06)',
            border:        plan.accent ? '1.5px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius:  16,
            padding:       28,
            position:      'relative',
          }}>

            {plan.accent && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: '#F59E0B', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                padding: '3px 12px', borderRadius: 20, letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {t('billing.popular')}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: plan.accent ? '#F59E0B' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {plan.key === 'starter' ? t('billing.starter') : t('billing.pro')}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.03em' }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{plan.period}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{plan.tagline}</p>
            </div>

            <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                  <span style={{ color: '#F59E0B', fontSize: 16, lineHeight: '18px', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelect(plan.key)}
              disabled={loading !== null}
              style={{
                width:        '100%',
                padding:      '12px 0',
                background:   plan.accent ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                border:       plan.accent ? 'none' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color:        plan.accent ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                fontSize:     14,
                fontWeight:   600,
                cursor:       loading !== null ? 'not-allowed' : 'pointer',
                opacity:      loading !== null && loading !== plan.key ? 0.5 : 1,
                transition:   'opacity 0.15s',
              }}
            >
              {loading === plan.key ? t('billing.redirecting') : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ marginTop: 20, fontSize: 13, color: '#FCA5A5' }}>{error}</p>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        {t('billing.cancelAnytime')}
      </p>
    </div>
  )
}
