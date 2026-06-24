// ── Portal — full charge history for co_owner / renter ──────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { CreditCard, CheckCircle } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface Charge {
  id:         string
  title:      string
  amount:     number
  status:     string
  due_date:   string
  paid_date:  string | null
  period:     string
}

const DEMO_CHARGES: Charge[] = [
  { id: '1', title: 'Charges communes Q2 2025', amount: 320, status: 'overdue',  due_date: '2025-04-01', paid_date: null,         period: 'quarterly' },
  { id: '2', title: 'Charges communes Q3 2025', amount: 320, status: 'pending',  due_date: '2025-07-01', paid_date: null,         period: 'quarterly' },
  { id: '3', title: 'Charges communes Q1 2025', amount: 310, status: 'paid',     due_date: '2025-01-01', paid_date: '2025-01-08', period: 'quarterly' },
  { id: '4', title: 'Fonds de réserve 2025',    amount: 150, status: 'paid',     due_date: '2025-01-01', paid_date: '2025-01-08', period: 'annual'    },
  { id: '5', title: 'Charges communes Q4 2024', amount: 305, status: 'paid',     due_date: '2024-10-01', paid_date: '2024-10-05', period: 'quarterly' },
]

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)', color: '#B45309' },
  paid:     { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
  overdue:  { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626' },
}

type Filter = 'all' | 'pending' | 'overdue' | 'paid'

export default function PortalChargesPage() {
  const { t }    = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const [charges,   setCharges]   = useState<Charge[]>([])
  const [loading,   setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [filter,    setFilter]    = useState<Filter>('all')
  const [payingId,  setPayingId]  = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) { setCharges(DEMO_CHARGES); setLoading(false); return }
    if (!building) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/v1/portal/me?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then((data: { charges?: Charge[] }) => {
          setCharges(data.charges ?? [])
          setLoading(false)
        })
        .catch((err: unknown) => { console.error('[portal/charges]', err); setFetchError(true); setLoading(false) })
    })
  }, [building, isDemoMode])

  async function handlePayNow(chargeId: string) {
    if (isDemoMode || !building) return
    setPayingId(chargeId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/v1/payments?building_id=${building.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ charge_id: chargeId }),
      })
      const json = await res.json() as { checkout_url?: string }
      if (json.checkout_url && /^https:\/\//.test(json.checkout_url)) window.location.href = json.checkout_url
    } finally {
      setPayingId(null)
    }
  }

  if (myRole === 'renter') {
    return (
      <Shell>
        <Topbar title={t('portal.chargesTitle')} subtitle={building?.name} />
        <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>{t('portal.notAvailableForRenters')}</div>
      </Shell>
    )
  }

  if (!building && !isDemoMode) {
    return (
      <Shell>
        <Topbar title={t('portal.chargesTitle')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  const filtered = filter === 'all' ? charges : charges.filter(c => c.status === filter)

  const totalOutstanding = charges
    .filter(c => c.status === 'pending' || c.status === 'overdue')
    .reduce((s, c) => s + c.amount, 0)

  const overdueTotal = charges
    .filter(c => c.status === 'overdue')
    .reduce((s, c) => s + c.amount, 0)

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',     label: t('portal.filterAll') },
    { key: 'pending', label: t('charges.pending') },
    { key: 'overdue', label: t('charges.overdue') },
    { key: 'paid',    label: t('charges.paid') },
  ]

  return (
    <Shell>
      <Topbar title={t('portal.chargesTitle')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ padding: 24 }}>



        {/* KPI summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ color: '#6E6E73', marginBottom: 6 }}><CreditCard size={16} /></div>
            <div style={{ fontSize: 11, color: '#6E6E73', marginBottom: 3 }}>{t('portal.totalOutstanding')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: totalOutstanding > 0 ? '#DC2626' : '#15803D' }}>
              €{totalOutstanding.toLocaleString()}
            </div>
          </div>
          {overdueTotal > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ color: '#DC2626', marginBottom: 6 }}><CreditCard size={16} /></div>
              <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 3 }}>{t('charges.overdue')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>€{overdueTotal.toLocaleString()}</div>
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 11, color: '#6E6E73', marginBottom: 3 }}>{t('charges.paid')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F' }}>
              {charges.filter(c => c.status === 'paid').length}
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                border: filter === f.key ? 'none' : '1px solid rgba(0,0,0,0.12)',
                background: filter === f.key ? '#1E3A5F' : '#fff',
                color: filter === f.key ? '#fff' : '#6E6E73',
                cursor: 'pointer',
              }}
            >
              {f.label}
              <span style={{ marginLeft: 5, opacity: 0.7, fontSize: 11 }}>
                ({f.key === 'all' ? charges.length : charges.filter(c => c.status === f.key).length})
              </span>
            </button>
          ))}
        </div>

        {/* Charge list */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>}
          {!loading && fetchError && (
            <div style={{ padding: 24, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>{t('common.error')}</div>
          )}
          {!loading && !fetchError && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>{t('common.noData')}</div>
          )}
          {filtered.map((charge, idx) => {
            const cs     = STATUS_COLORS[charge.status] ?? STATUS_COLORS['pending']!
            const canPay = charge.status === 'pending' || charge.status === 'overdue'
            return (
              <div
                key={charge.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', marginBottom: 3 }}>{charge.title}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {t(`charges.${charge.period}`)}
                      &nbsp;·&nbsp;{t('charges.dueDate')}: {charge.due_date}
                      {charge.paid_date && (
                        <span style={{ marginLeft: 6, color: '#15803D' }}>
                          · <CheckCircle size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('portal.paidOn', { date: charge.paid_date })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>€{charge.amount.toLocaleString()}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, ...cs }}>
                      {t(`charges.${charge.status}`)}
                    </span>
                  </div>
                </div>
                {canPay && (
                  <button
                    onClick={() => handlePayNow(charge.id)}
                    disabled={payingId === charge.id}
                    style={{
                      marginTop: 10, padding: '7px 18px', borderRadius: 8,
                      border: 'none',
                      background: charge.status === 'overdue' ? '#DC2626' : '#1E3A5F',
                      color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      opacity: payingId === charge.id ? 0.6 : 1,
                    }}
                  >
                    {payingId === charge.id ? t('portal.paymentProcessing') : t('portal.payNow')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
