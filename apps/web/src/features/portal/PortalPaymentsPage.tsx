// ── Portal — payment transaction history for co_owners ───────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { Receipt, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface PaymentTxn {
  id:         string
  amount:     number
  status:     string
  provider:   string
  created_at: string
  updated_at: string
  charge_id:  string
  charges:    { title: string; due_date: string } | null
}

const DEMO_TXNS: PaymentTxn[] = [
  {
    id: '1', amount: 320, status: 'paid',     provider: 'mollie', created_at: '2026-06-15T10:23:00Z', updated_at: '2026-06-15T10:24:00Z',
    charge_id: 'c1', charges: { title: 'Charges communes Q2 2026', due_date: '2026-07-01' },
  },
  {
    id: '2', amount: 310, status: 'paid',     provider: 'mollie', created_at: '2026-03-10T09:05:00Z', updated_at: '2026-03-10T09:06:00Z',
    charge_id: 'c2', charges: { title: 'Charges communes Q1 2026', due_date: '2026-04-01' },
  },
  {
    id: '3', amount: 150, status: 'paid',     provider: 'mollie', created_at: '2026-01-08T14:12:00Z', updated_at: '2026-01-08T14:13:00Z',
    charge_id: 'c3', charges: { title: 'Fonds de réserve 2026', due_date: '2026-01-01' },
  },
  {
    id: '4', amount: 310, status: 'failed',   provider: 'mollie', created_at: '2025-12-28T11:40:00Z', updated_at: '2025-12-28T11:41:00Z',
    charge_id: 'c4', charges: { title: 'Charges communes Q4 2025', due_date: '2026-01-01' },
  },
  {
    id: '5', amount: 305, status: 'paid',     provider: 'mollie', created_at: '2025-10-02T08:55:00Z', updated_at: '2025-10-02T08:56:00Z',
    charge_id: 'c5', charges: { title: 'Charges communes Q3 2025', due_date: '2025-10-01' },
  },
]

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  paid:      { bg: 'rgba(34,197,94,0.10)',  color: '#15803D', icon: <CheckCircle size={14} /> },
  open:      { bg: 'rgba(59,130,246,0.10)', color: '#2563EB', icon: <Clock size={14} /> },
  pending:   { bg: 'rgba(245,158,11,0.10)', color: '#B45309', icon: <Clock size={14} /> },
  failed:    { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626', icon: <XCircle size={14} /> },
  expired:   { bg: 'rgba(107,114,128,0.10)',color: '#6B7280', icon: <XCircle size={14} /> },
  cancelled: { bg: 'rgba(107,114,128,0.10)',color: '#6B7280', icon: <XCircle size={14} /> },
}

export default function PortalPaymentsPage() {
  const { t }    = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const [txns,    setTxns]    = useState<PaymentTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (isDemoMode) { setTxns(DEMO_TXNS); setLoading(false); return }
    if (!building) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/v1/portal/payments?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then((data: PaymentTxn[]) => { setTxns(data); setLoading(false) })
        .catch((err: unknown) => { console.error('[portal/payments]', err); setError(true); setLoading(false) })
    })
  }, [building?.id, isDemoMode])

  if (myRole === 'renter') {
    return (
      <Shell>
        <Topbar title={t('portal.paymentHistory')} subtitle={building?.name} />
        <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          {t('portal.notAvailableForRenters')}
        </div>
      </Shell>
    )
  }

  const totalPaid = txns.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0)
  const countPaid = txns.filter(t => t.status === 'paid').length

  return (
    <Shell>
      <Topbar title={t('portal.paymentHistory')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={20} color="#15803D" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.paymentHistory')}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{t('portal.paymentHistorySub')}</div>
          </div>
        </div>

        {/* KPI cards */}
        {!loading && txns.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>{t('portal.paymentHistoryTotal')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#15803D' }}>€{totalPaid.toLocaleString()}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>{t('portal.paymentHistoryCount')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F' }}>{countPaid}</div>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, color: '#9CA3AF', fontSize: 13 }}>{t('common.loading')}</div>}
          {!loading && error && (
            <div style={{ padding: 24, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>{t('common.error')}</div>
          )}
          {!loading && !error && txns.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              {t('portal.paymentHistoryEmpty')}
            </div>
          )}

          {txns.map((txn, i) => {
            const cfg = STATUS_CONFIG[txn.status] ?? STATUS_CONFIG['pending']!
            const date = new Date(txn.created_at).toLocaleDateString('fr-BE', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
            const time = new Date(txn.created_at).toLocaleTimeString('fr-BE', {
              hour: '2-digit', minute: '2-digit',
            })

            return (
              <div key={txn.id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px',
                borderBottom: i < txns.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}>
                {/* Status icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: cfg.bg, color: cfg.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {cfg.icon}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {txn.charges?.title ?? t('portal.paymentHistoryUnknownCharge')}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {date} · {time}
                    {txn.charges?.due_date && (
                      <span> · {t('charges.dueDate')}: {txn.charges.due_date}</span>
                    )}
                  </div>
                </div>

                {/* Amount + status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                    €{txn.amount.toLocaleString()}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: cfg.bg, color: cfg.color,
                  }}>
                    {cfg.icon}
                    {t(`portal.txnStatus_${txn.status}`, { defaultValue: txn.status })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </Shell>
  )
}
