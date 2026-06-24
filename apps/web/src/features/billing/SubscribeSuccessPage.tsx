import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBuilding } from '../../shared/building/BuildingContext'

export default function SubscribeSuccessPage() {
  const { t }             = useTranslation()
  const navigate          = useNavigate()
  const [params]          = useSearchParams()
  const { refetch }       = useBuilding()

  // Re-fetch org plan so BuildingContext reflects the new paid plan
  useEffect(() => {
    refetch()
    const timer = setTimeout(() => navigate('/', { replace: true }), 5000)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const plan = params.get('plan') ?? 'starter'

  return (
    <div style={{
      minHeight:      '100vh',
      background:     'linear-gradient(135deg, #0F2444 0%, #1E3A5F 60%, #2A5298 100%)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '40px 24px',
      textAlign:      'center',
    }}>

      {/* Checkmark */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
        border: '1.5px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', marginBottom: 24,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
        {t('billing.successTitle')}
      </h1>
      <p style={{ margin: '0 0 8px', fontSize: 16, color: 'rgba(255,255,255,0.7)', maxWidth: 400, lineHeight: 1.5 }}>
        {t('billing.successSubtitle')}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
        {t('billing.successRedirect')}
      </p>

      <button
        onClick={() => navigate('/', { replace: true })}
        style={{
          marginTop:    32,
          padding:      '12px 28px',
          background:   '#F59E0B',
          border:       'none',
          borderRadius: 10,
          color:        '#FFFFFF',
          fontSize:     14,
          fontWeight:   600,
          cursor:       'pointer',
        }}
      >
        {t('billing.goToDashboard')}
      </button>
    </div>
  )
}
