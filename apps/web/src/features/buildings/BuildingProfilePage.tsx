// ── Building profile page ──────────────────────────────────────

import { useState }        from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation }  from 'react-i18next'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Shell }           from '../../components/layout/Shell'
import { Topbar }          from '../../components/layout/Topbar'
import { useBuildings }    from './useBuildings'
import { BuildingModal }   from './BuildingModal'
import type { Building }   from '@syndicsage/types'

export default function BuildingProfilePage() {
  const { id }                             = useParams<{ id: string }>()
  const { t }                              = useTranslation()
  const navigate                           = useNavigate()
  const { data: buildings = [], isLoading } = useBuildings()
  const [showModal, setShowModal]          = useState(false)

  const building = buildings.find(b => b.id === id)

  if (isLoading) {
    return (
      <Shell>
        <Topbar title="…" />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('common.error')} />
        <div style={{ padding: 24, color: '#DC2626', fontSize: 14 }}>{t('errors.notFound')}</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Topbar title={building.name} subtitle={`${building.address}, ${building.city}`} />
      <div style={{ padding: 24, maxWidth: 800 }}>

        {/* Back + Edit header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={() => navigate('/buildings')} style={backBtnStyle}>
            <ArrowLeft size={14} />
            {t('common.back')}
          </button>
          <button onClick={() => setShowModal(true)} style={editBtnStyle}>
            <Pencil size={13} />
            {t('common.edit')}
          </button>
        </div>

        {/* Basic card */}
        <ProfileCard title={t('buildings.basicSection')}>
          <Row label={t('buildings.name')}      value={building.name} />
          <Row label={t('buildings.address')}   value={building.address} />
          <Row label={t('buildings.city')}      value={building.city} />
          <Row label={t('buildings.unitCount')} value={building.unit_count.toString()} />
          {building.vme_number && <Row label="KBO / VME" value={building.vme_number} />}
        </ProfileCard>

        {/* Details card */}
        <ProfileCard title={t('buildings.detailsSection')}>
          {building.building_type && (
            <Row label={t('buildings.buildingType')} value={t(`buildings.buildingTypes.${building.building_type}`)} />
          )}
          {building.year_built && <Row label={t('buildings.yearBuilt')} value={building.year_built.toString()} />}
          {building.floors      && <Row label={t('buildings.floors')}   value={building.floors.toString()} />}
          {building.ag_date && (
            <Row label={t('buildings.agDate')} value={formatDate(building.ag_date)} />
          )}
          {(building.mandate_start || building.mandate_expiry) && (
            <>
              {building.mandate_start  && <Row label={t('buildings.mandateStart')}  value={formatDate(building.mandate_start)} />}
              {building.mandate_expiry && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(60,60,67,0.06)' }}>
                  <span style={rowLabelStyle}>{t('buildings.mandateExpiry')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={rowValueStyle}>{formatDate(building.mandate_expiry)}</span>
                    <MandateBadge expiryDate={building.mandate_expiry} t={t} />
                  </div>
                </div>
              )}
            </>
          )}
        </ProfileCard>

        {/* Financial card */}
        <ProfileCard title={t('buildings.financialSection')}>
          {building.annual_budget != null && (
            <Row label={t('buildings.annualBudget')} value={formatCurrency(building.annual_budget)} />
          )}
          {building.reserve_fund_balance != null && (
            <>
              <Row label={t('buildings.reserveFund')} value={formatCurrency(building.reserve_fund_balance)} />
              {building.annual_budget != null && building.annual_budget > 0 && (
                <ReserveFundBar
                  reserve={building.reserve_fund_balance}
                  budget={building.annual_budget}
                  t={t}
                />
              )}
            </>
          )}
          {building.bank_iban && <Row label={t('buildings.bankIban')} value={building.bank_iban} mono />}
          {building.bank_name && <Row label={t('buildings.bankName')} value={building.bank_name} />}
          <Row
            label={t('buildings.autoReminders')}
            value={
              building.auto_remind_enabled
                ? `✓  ${building.auto_remind_days ?? 7} ${t('buildings.autoReminderDays')}`
                : '—'
            }
          />
        </ProfileCard>

      </div>

      {showModal && (
        <BuildingModal
          building={building}
          onClose={() => setShowModal(false)}
        />
      )}
    </Shell>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12,
      border: '1px solid rgba(60,60,67,0.10)',
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(60,60,67,0.08)',
        background: '#F9F9FB',
      }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 600, color: '#6E6E73',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{title}</p>
      </div>
      <div style={{ padding: '0 20px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid rgba(60,60,67,0.06)',
    }}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={{ ...rowValueStyle, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

function MandateBadge({ expiryDate, t }: { expiryDate: string; t: (k: string, o?: Record<string, unknown>) => string }) {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#FEE2E2', color: '#DC2626' }}>
        {t('buildings.mandateExpired')}
      </span>
    )
  }
  const color = days <= 30 ? '#DC2626' : days <= 90 ? '#D97706' : '#16A34A'
  const bg    = days <= 30 ? '#FEE2E2' : days <= 90 ? '#FEF3C7' : '#DCFCE7'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: bg, color }}>
      {t('buildings.daysRemaining', { days })}
    </span>
  )
}

function ReserveFundBar({ reserve, budget, t }: {
  reserve: number; budget: number
  t: (k: string) => string
}) {
  const pct     = Math.min((reserve / budget) * 100, 100)
  const legal   = 5
  const rec     = 10
  const isOk    = pct >= rec
  const isWarn  = pct >= legal && pct < rec
  const barColor = isOk ? '#16A34A' : isWarn ? '#D97706' : '#DC2626'

  return (
    <div style={{ padding: '8px 0 12px' }}>
      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        {/* Legal minimum marker */}
        <div style={{
          position: 'absolute', left: `${legal}%`, top: 0, bottom: 0,
          width: 1, background: 'rgba(220,38,38,0.4)',
        }} />
        {/* Recommended marker */}
        <div style={{
          position: 'absolute', left: `${rec}%`, top: 0, bottom: 0,
          width: 1, background: 'rgba(217,119,6,0.4)',
        }} />
        <div style={{
          height: '100%', width: `${pct}%`,
          background: barColor, borderRadius: 3, transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
          {pct.toFixed(1)}%
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(220,38,38,0.7)' }}>{t('buildings.reserveLegal')}</span>
          <span style={{ fontSize: 10, color: 'rgba(217,119,6,0.7)' }}>{t('buildings.reserveRecommended')}</span>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(n: number): string {
  return `€ ${n.toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const rowLabelStyle: React.CSSProperties = { fontSize: 13, color: '#6E6E73' }
const rowValueStyle:  React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#1E3A5F', textAlign: 'right', maxWidth: '55%' }

const backBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', background: 'transparent',
  border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7,
  fontSize: 13, color: '#6E6E73', cursor: 'pointer', fontFamily: 'inherit',
}
const editBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', background: '#1E3A5F',
  border: 'none', borderRadius: 7,
  fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
}
