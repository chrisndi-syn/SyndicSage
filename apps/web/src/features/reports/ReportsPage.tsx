// ── Reports / Portfolio Dashboard ──────────────────────────────

import { useTranslation } from 'react-i18next'
import { BarChart2 }      from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'

interface ReportData {
  building: {
    name: string; unit_count: number; annual_budget: number;
    reserve_fund_balance: number; ag_date: string | null; mandate_expiry: string | null;
  }
  charges:    { total: number; paid: number; pending: number; count: number }
  accounting: { expenses: number; income: number; net: number; year: number }
  tickets:    { open: number; resolved: number; total: number }
  recentMeetings: Array<{ title: string; date: string; status: string }>
  unitCount: number
}

function useReport(buildingId: string | undefined): { data: ReportData | null; isLoading: boolean } {
  if (!buildingId) return { data: null, isLoading: false }
  // Real fetch would go here — use apiFetch
  return { data: null, isLoading: false }
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 12, color: '#6E6E73', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? '#1E3A5F', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  )
}

export default function ReportsPage() {
  const { t }  = useTranslation()
  const { selected: building } = useBuilding()
  const { data: report } = useReport(building?.id)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('reports.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  if (!report) {
    return (
      <Shell>
        <Topbar title={t('reports.title')} subtitle={building.name} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  const chargeCollectionRate = report.charges.total > 0
    ? Math.round(report.charges.paid / report.charges.total * 100)
    : 0
  const budgetUsed = report.building.annual_budget > 0
    ? Math.round(report.accounting.expenses / report.building.annual_budget * 100)
    : 0
  const reserveRatio = report.building.annual_budget > 0
    ? Math.round(report.building.reserve_fund_balance / report.building.annual_budget * 100)
    : 0

  const daysMandateLeft = report.building.mandate_expiry
    ? Math.max(0, Math.round((new Date(report.building.mandate_expiry).getTime() - Date.now()) / 86400000))
    : null

  return (
    <Shell>
      <Topbar title={t('reports.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard
            label={t('reports.chargeCollectionRate')}
            value={`${chargeCollectionRate}%`}
            sub={`€${report.charges.paid.toLocaleString()} / €${report.charges.total.toLocaleString()}`}
            accent={chargeCollectionRate >= 90 ? '#15803D' : chargeCollectionRate >= 70 ? '#B45309' : '#DC2626'}
          />
          <StatCard
            label={t('reports.budgetUsed')}
            value={`${budgetUsed}%`}
            sub={`€${report.accounting.expenses.toLocaleString()} / €${report.building.annual_budget.toLocaleString()}`}
            accent={budgetUsed <= 80 ? '#15803D' : budgetUsed <= 95 ? '#B45309' : '#DC2626'}
          />
          <StatCard
            label={t('reports.reserveFund')}
            value={`€${report.building.reserve_fund_balance.toLocaleString()}`}
            sub={`${reserveRatio}% ${t('reports.ofBudget')}`}
            accent={reserveRatio >= 10 ? '#15803D' : '#B45309'}
          />
          <StatCard
            label={t('reports.netResult', { year: report.accounting.year })}
            value={`€${report.accounting.net.toLocaleString()}`}
            accent={report.accounting.net >= 0 ? '#15803D' : '#DC2626'}
          />
          <StatCard
            label={t('reports.openTickets')}
            value={String(report.tickets.open)}
            sub={`${report.tickets.resolved} ${t('reports.resolved')}`}
            accent={report.tickets.open === 0 ? '#15803D' : report.tickets.open <= 3 ? '#B45309' : '#DC2626'}
          />
          {daysMandateLeft !== null && (
            <StatCard
              label={t('reports.mandateExpiry')}
              value={`${daysMandateLeft}d`}
              sub={report.building.mandate_expiry ?? undefined}
              accent={daysMandateLeft > 180 ? '#15803D' : daysMandateLeft > 60 ? '#B45309' : '#DC2626'}
            />
          )}
        </div>

        {/* Two-column detail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Charges panel */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 14 }}>{t('reports.chargesOverview')}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6E6E73' }}>{t('reports.paid')}</span>
              <span style={{ fontWeight: 600, color: '#15803D' }}>€{report.charges.paid.toLocaleString()}</span>
            </div>
            <ProgressBar value={report.charges.paid} max={report.charges.total} color="#15803D" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 12, marginBottom: 6 }}>
              <span style={{ color: '#6E6E73' }}>{t('reports.pending')}</span>
              <span style={{ fontWeight: 600, color: '#DC2626' }}>€{report.charges.pending.toLocaleString()}</span>
            </div>
            <ProgressBar value={report.charges.pending} max={report.charges.total} color="#DC2626" />
          </div>

          {/* Accounting panel */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 14 }}>{t('reports.accountingSummary')} {report.accounting.year}</div>
            {[
              { label: t('accounting.income'),   value: report.accounting.income,   color: '#15803D' },
              { label: t('accounting.expenses'),  value: report.accounting.expenses,  color: '#DC2626' },
              { label: t('reports.netResult', { year: '' }).trim(), value: report.accounting.net, color: report.accounting.net >= 0 ? '#15803D' : '#DC2626' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ color: '#6E6E73' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>
                  {row.value >= 0 ? '' : '-'}€{Math.abs(row.value).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent meetings */}
        {report.recentMeetings.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)', marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 12 }}>{t('reports.recentMeetings')}</div>
            {report.recentMeetings.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < report.recentMeetings.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <span style={{ fontSize: 13, color: '#1C1C1E' }}>{m.title}</span>
                <span style={{ fontSize: 12, color: '#6E6E73' }}>
                  {new Date(m.date).toLocaleDateString('fr-BE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
