import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Shell }  from '../../components/layout/Shell'
import { Topbar } from '../../components/layout/Topbar'
import { useAuth } from '../../shared/auth/AuthContext'

const API_URL = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001'

interface CustomerRow {
  id:                     string
  name:                   string
  plan:                   string
  vat_number:             string | null
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  created_at:             string
  member_count:           number
  building_count:         number
}

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  free:       { bg: '#F2F2F7', color: '#6E6E73' },
  starter:    { bg: '#EFF6FF', color: '#1D4ED8' },
  pro:        { bg: '#F0FDF4', color: '#15803D' },
  enterprise: { bg: '#FFF7ED', color: '#C2410C' },
}

export default function CustomersPage() {
  const { t }       = useTranslation()
  const { session } = useAuth()
  const [rows,    setRows]    = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!session) return
    fetch(`${API_URL}/api/v1/billing/customers`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(res => {
        if (res.status === 403) throw new Error('forbidden')
        return res.json()
      })
      .then(data => { setRows(data as CustomerRow[]); setLoading(false) })
      .catch(err => {
        setError(err.message === 'forbidden' ? t('admin.notAuthorized') : t('common.error'))
        setLoading(false)
      })
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  function fmt(d: string) {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalRevenue = rows.filter(r => r.plan !== 'free').length
  const paidRows     = rows.filter(r => r.plan !== 'free')

  return (
    <Shell>
      <Topbar title={t('admin.customers')} />
      <div style={{ padding: 24, maxWidth: 1000 }}>

        {/* KPI row */}
        {!loading && !error && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              [t('admin.totalOrgs'),   String(rows.length)],
              [t('admin.paidOrgs'),    String(paidRows.length)],
              [t('admin.freeOrgs'),    String(rows.filter(r => r.plan === 'free').length)],
              [t('admin.proOrgs'),     String(rows.filter(r => r.plan === 'pro').length)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', padding: '16px 20px', minWidth: 140 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1E3A5F' }}>{val}</div>
              </div>
            ))}
            <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', padding: '16px 20px', minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('admin.estimatedMRR')}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
                €{rows.reduce((acc, r) => acc + (r.plan === 'pro' ? 99 : r.plan === 'starter' ? 49 : 0), 0)}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('admin.customers')}</h3>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>
          ) : error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626', fontSize: 13 }}>{error}</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6E6E73', fontSize: 13 }}>{t('common.noData')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9F9' }}>
                  {[t('admin.org'), t('admin.plan'), t('admin.buildings'), t('admin.members'), t('admin.stripe'), t('admin.signedUp')].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(60,60,67,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const planStyle = PLAN_COLORS[row.plan] ?? PLAN_COLORS['free']!
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>{row.name}</div>
                        {row.vat_number && <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{row.vat_number}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: planStyle.bg, color: planStyle.color }}>
                          {row.plan}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#3C3C43', textAlign: 'center' }}>{row.building_count}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#3C3C43', textAlign: 'center' }}>{row.member_count}</td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#6E6E73', fontFamily: 'monospace' }}>
                        {row.stripe_customer_id ? row.stripe_customer_id.slice(0, 14) + '…' : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap' }}>
                        {fmt(row.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Shell>
  )
}
