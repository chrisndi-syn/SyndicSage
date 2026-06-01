// ── Building add/edit modal ───────────────────────────────────

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Building } from '@syndicsage/types'
import type { CreateBuildingBody, UpdateBuildingBody } from './buildings.api'
import { useCreateBuilding, useUpdateBuilding } from './useBuildings'

interface Props {
  building?: Building     // present = edit mode
  onClose:   () => void
}

type Tab = 'basic' | 'details' | 'financial'

const BUILDING_TYPES = ['apartment', 'mixed', 'commercial', 'other'] as const

export function BuildingModal({ building, onClose }: Props) {
  const { t } = useTranslation()
  const createMutation = useCreateBuilding()
  const updateMutation = useUpdateBuilding()

  const [tab, setTab] = useState<Tab>('basic')

  // Basic fields
  const [name,      setName]      = useState(building?.name      ?? '')
  const [address,   setAddress]   = useState(building?.address   ?? '')
  const [city,      setCity]      = useState(building?.city      ?? '')
  const [unitCount, setUnitCount] = useState(building?.unit_count?.toString() ?? '')
  const [vmeNumber, setVmeNumber] = useState(building?.vme_number ?? '')

  // Details fields
  const [buildingType,   setBuildingType]   = useState<typeof BUILDING_TYPES[number] | ''>(building?.building_type ?? '')
  const [yearBuilt,      setYearBuilt]      = useState(building?.year_built?.toString() ?? '')
  const [floors,         setFloors]         = useState(building?.floors?.toString() ?? '')
  const [agDate,         setAgDate]         = useState(building?.ag_date ?? '')
  const [mandateStart,   setMandateStart]   = useState(building?.mandate_start ?? '')
  const [mandateExpiry,  setMandateExpiry]  = useState(building?.mandate_expiry ?? '')

  // Financial fields
  const [annualBudget,      setAnnualBudget]      = useState(building?.annual_budget?.toString() ?? '')
  const [reserveFund,       setReserveFund]       = useState(building?.reserve_fund_balance?.toString() ?? '')
  const [bankIban,          setBankIban]          = useState(building?.bank_iban ?? '')
  const [bankName,          setBankName]          = useState(building?.bank_name ?? '')
  const [autoRemind,        setAutoRemind]        = useState(building?.auto_remind_enabled ?? false)
  const [autoRemindDays,    setAutoRemindDays]    = useState(building?.auto_remind_days?.toString() ?? '7')

  const [error,   setError]   = useState('')
  const isEdit    = !!building
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => { setError('') }, [name, address, city, unitCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const units = parseInt(unitCount, 10)
    if (isNaN(units) || units < 1) {
      setTab('basic')
      setError(t('buildings.unitCountError'))
      return
    }

    const shared = {
      name:                 name.trim(),
      address:              address.trim(),
      city:                 city.trim(),
      unit_count:           units,
      vme_number:           vmeNumber.trim() || undefined,
      building_type:        buildingType   || undefined,
      year_built:           yearBuilt      ? parseInt(yearBuilt, 10)    : undefined,
      floors:               floors         ? parseInt(floors, 10)       : undefined,
      ag_date:              agDate         || undefined,
      mandate_start:        mandateStart   || undefined,
      mandate_expiry:       mandateExpiry  || undefined,
      annual_budget:        annualBudget   ? parseFloat(annualBudget)   : undefined,
      reserve_fund_balance: reserveFund    ? parseFloat(reserveFund)    : undefined,
      bank_iban:            bankIban.trim() || undefined,
      bank_name:            bankName.trim() || undefined,
      auto_remind_enabled:  autoRemind,
      auto_remind_days:     Math.max(1, parseInt(autoRemindDays, 10) || 7),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: building.id, body: shared as UpdateBuildingBody })
      } else {
        await createMutation.mutateAsync(shared as CreateBuildingBody)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,30,55,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: 14,
        padding: 28, width: 560, maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 24px 80px rgba(30,58,95,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 style={{
          margin: '0 0 20px', fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22, fontWeight: 600, color: '#1E3A5F',
        }}>
          {isEdit ? t('buildings.edit') : t('buildings.add')}
        </h3>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 20,
          borderBottom: '1px solid rgba(60,60,67,0.12)',
        }}>
          {(['basic', 'details', 'financial'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === tabKey ? '#1E3A5F' : 'transparent'}`,
                fontSize: 12, fontWeight: tab === tabKey ? 600 : 400,
                color: tab === tabKey ? '#1E3A5F' : '#6E6E73',
                cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: -1,
              }}
            >
              {t(`buildings.${tabKey}Section`)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Basic tab ─────────────────────────────── */}
          {tab === 'basic' && (
            <>
              <Field label={t('buildings.name')} required>
                <input value={name} onChange={e => setName(e.target.value)}
                  required autoFocus style={inputStyle} placeholder="Résidence Les Acacias" />
              </Field>
              <Field label={t('buildings.address')} required>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  required style={inputStyle} placeholder="Rue de la Loi 16" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('buildings.city')} required>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    required style={inputStyle} placeholder="Brussels" />
                </Field>
                <Field label={t('buildings.unitCount')} required>
                  <input type="number" min={1} value={unitCount} onChange={e => setUnitCount(e.target.value)}
                    required style={inputStyle} placeholder="12" />
                </Field>
              </div>
              <Field label="KBO / VME">
                <input value={vmeNumber} onChange={e => setVmeNumber(e.target.value)}
                  style={inputStyle} placeholder="0123.456.789" />
              </Field>
            </>
          )}

          {/* ── Details tab ───────────────────────────── */}
          {tab === 'details' && (
            <>
              <Field label={t('buildings.buildingType')}>
                <select value={buildingType} onChange={e => setBuildingType(e.target.value as typeof buildingType)} style={inputStyle}>
                  <option value="">—</option>
                  {BUILDING_TYPES.map(bt => (
                    <option key={bt} value={bt}>{t(`buildings.buildingTypes.${bt}`)}</option>
                  ))}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('buildings.yearBuilt')}>
                  <input type="number" min={1800} max={2100} value={yearBuilt}
                    onChange={e => setYearBuilt(e.target.value)} style={inputStyle} placeholder="1985" />
                </Field>
                <Field label={t('buildings.floors')}>
                  <input type="number" min={1} max={200} value={floors}
                    onChange={e => setFloors(e.target.value)} style={inputStyle} placeholder="8" />
                </Field>
              </div>
              <Field label={t('buildings.agDate')}>
                <input type="date" value={agDate} onChange={e => setAgDate(e.target.value)} style={inputStyle} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('buildings.mandateStart')}>
                  <input type="date" value={mandateStart} onChange={e => setMandateStart(e.target.value)} style={inputStyle} />
                </Field>
                <Field label={t('buildings.mandateExpiry')}>
                  <input type="date" value={mandateExpiry} onChange={e => setMandateExpiry(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </>
          )}

          {/* ── Financial tab ─────────────────────────── */}
          {tab === 'financial' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('buildings.annualBudget')}>
                  <input type="number" min={0} step="0.01" value={annualBudget}
                    onChange={e => setAnnualBudget(e.target.value)} style={inputStyle} placeholder="120000" />
                </Field>
                <Field label={t('buildings.reserveFund')}>
                  <input type="number" min={0} step="0.01" value={reserveFund}
                    onChange={e => setReserveFund(e.target.value)} style={inputStyle} placeholder="45000" />
                </Field>
              </div>
              <Field label={t('buildings.bankIban')}>
                <input value={bankIban} onChange={e => setBankIban(e.target.value)}
                  style={inputStyle} placeholder="BE68 5390 0754 7034" />
              </Field>
              <Field label={t('buildings.bankName')}>
                <input value={bankName} onChange={e => setBankName(e.target.value)}
                  style={inputStyle} placeholder="BNP Paribas Fortis" />
              </Field>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: '#F8FAFC',
                borderRadius: 8, border: '1px solid rgba(60,60,67,0.10)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E3A5F', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoRemind} onChange={e => setAutoRemind(e.target.checked)} />
                  {t('buildings.autoReminders')}
                </label>
                {autoRemind && (
                  <>
                    <input
                      type="number" min={1} max={90} value={autoRemindDays}
                      onChange={e => setAutoRemindDays(e.target.value)}
                      style={{ ...inputStyle, width: 64 }}
                    />
                    <span style={{ fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap' }}>
                      {t('buildings.autoReminderDays')}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {error && <p style={{ margin: 0, fontSize: 13, color: '#DC2626' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>{t('common.cancel')}</button>
            <button type="submit" disabled={isPending} style={submitBtnStyle}>
              {isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#1E3A5F' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid rgba(60,60,67,0.18)',
  borderRadius: 7, fontSize: 13, color: '#1E3A5F',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: 'transparent',
  border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7,
  fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
}
const submitBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#1E3A5F',
  border: 'none', borderRadius: 7,
  fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
}
