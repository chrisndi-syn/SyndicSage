// ── Charges page ──────────────────────────────────────────────

import { useState, useEffect }  from 'react'
import { useTranslation }        from 'react-i18next'
import { CreditCard, Sparkles, Bell } from 'lucide-react'
import { Shell }                 from '../../components/layout/Shell'
import { Topbar }                from '../../components/layout/Topbar'
import { useBuilding }           from '../../shared/building/BuildingContext'
import { useCharges, useMarkPaid, useDeleteCharge } from './useCharges'
import { ChargeModal }           from './ChargeModal'
import { useOwners }             from '../owners/useOwners'
import { useAiSage }             from '../ai/AiSageContext'
import { useUpdateBuilding }     from '../buildings/useBuildings'
import type { ChargeWithOwner, StatusFilter } from './charges.api'

export default function ChargesPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const { openWithPrompt } = useAiSage()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const { data: charges = [], isLoading, error } = useCharges(building?.id, filter)
  const { data: owners = [] } = useOwners(building?.id)
  const markPaid      = useMarkPaid(building?.id ?? '')
  const deleteCharge  = useDeleteCharge(building?.id ?? '')
  const updateBuilding = useUpdateBuilding()

  const [showModal,      setShowModal]      = useState(false)
  const [editCharge,     setEditCharge]     = useState<ChargeWithOwner | undefined>()
  const [confirmDelete,  setConfirmDelete]  = useState<ChargeWithOwner | null>(null)

  // Reminder settings local state (synced from building on mount / building change)
  const [remindEnabled, setRemindEnabled] = useState(false)
  const [remindDays,    setRemindDays]    = useState(7)
  const [remindSaved,   setRemindSaved]   = useState(false)

  useEffect(() => {
    if (!building) return
    setRemindEnabled((building as { auto_remind_enabled?: boolean }).auto_remind_enabled ?? false)
    setRemindDays((building as { auto_remind_days?: number }).auto_remind_days ?? 7)
  }, [building?.id])

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('charges.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>
          {t('common.selectBuilding')}
        </div>
      </Shell>
    )
  }

  const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'overdue', 'paid']

  return (
    <Shell>
      <Topbar title={t('charges.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar: filter + add */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: 'none',
                  background: filter === f ? '#1E3A5F' : '#FFFFFF',
                  color:      filter === f ? '#FFFFFF' : '#6E6E73',
                  boxShadow:  '0 0 0 1px rgba(60,60,67,0.15)',
                }}
              >
                {f === 'all' ? t('common.filter') + ' ' + t('charges.all') : t(`charges.${f}`)}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditCharge(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F', border: 'none',
              borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('charges.add')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && charges.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <CreditCard size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('charges.empty')}</p>
          </div>
        )}

        {charges.length > 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9FB' }}>
                  {[
                    t('charges.title'), t('charges.owner'), t('common.amount'),
                    t('charges.dueDate'), t('common.status'), t('common.actions'),
                  ].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: '#6E6E73',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid rgba(60,60,67,0.08)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charges.map((charge, i) => (
                  <ChargeRow
                    key={charge.id}
                    charge={charge}
                    isLast={i === charges.length - 1}
                    onEdit={() => { setEditCharge(charge); setShowModal(true) }}
                    onMarkPaid={() => markPaid.mutate(charge.id)}
                    onDelete={() => setConfirmDelete(charge)}
                    isMarkingPaid={markPaid.isPending && markPaid.variables === charge.id}
                    onAskAi={() => {
                      const owner  = charge.owners ? `${charge.owners.full_name} (unit ${charge.owners.units.unit_number})` : 'the co-owner'
                      const due    = new Date(charge.due_date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
                      openWithPrompt(
                        `Draft a polite but firm payment reminder letter in French for co-owner ${owner}. ` +
                        `They have an outstanding charge of €${charge.amount.toFixed(2)} for "${charge.title}", ` +
                        `due on ${due}. Building: ${building?.name ?? ''}. ` +
                        `Keep it professional and reference Belgian VME law if appropriate.`
                      )
                    }}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* ── Reminder settings ───────────────────────── */}
        <div style={{ padding: '0 24px 24px' }}>
        <div style={{
          background: '#fff', borderRadius: 10,
          border: '1px solid rgba(60,60,67,0.10)', padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Bell size={16} color="#1E3A5F" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{t('buildings.autoReminders')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setRemindEnabled(v => !v)}
                style={{
                  width: 40, height: 22, borderRadius: 99, cursor: 'pointer', flexShrink: 0,
                  background: remindEnabled ? '#F59E0B' : '#D1D5DB',
                  position: 'relative', transition: 'background 0.15s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: remindEnabled ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <span style={{ fontSize: 13, color: remindEnabled ? '#1E3A5F' : '#9CA3AF' }}>
                {remindEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
            </label>

            {/* Days input */}
            {remindEnabled && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={1} max={90}
                  value={remindDays}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v >= 1 && v <= 90) setRemindDays(v)
                  }}
                  style={{
                    width: 60, padding: '5px 8px', borderRadius: 6,
                    border: '1px solid rgba(60,60,67,0.2)', fontSize: 13,
                    textAlign: 'center', color: '#1E3A5F',
                  }}
                />
                <span style={{ fontSize: 13, color: '#6E6E73' }}>{t('buildings.autoReminderDays')}</span>
              </label>
            )}

            {/* Save */}
            <button
              onClick={() => {
                if (!building) return
                updateBuilding.mutate(
                  { id: building.id, body: { auto_remind_enabled: remindEnabled, auto_remind_days: remindDays } },
                  { onSuccess: () => { setRemindSaved(true); setTimeout(() => setRemindSaved(false), 2500) } },
                )
              }}
              disabled={updateBuilding.isPending}
              style={{
                padding: '6px 16px', background: '#1E3A5F', border: 'none', borderRadius: 6,
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                opacity: updateBuilding.isPending ? 0.6 : 1,
              }}
            >
              {updateBuilding.isPending ? t('common.saving') : t('common.save')}
            </button>

            {remindSaved && (
              <span style={{ fontSize: 12, color: '#15803D' }}>{t('common.saved')}</span>
            )}
          </div>
        </div>
        </div>

      {showModal && building && (
        <ChargeModal
          buildingId={building.id}
          owners={owners}
          charge={editCharge}
          onClose={() => { setShowModal(false); setEditCharge(undefined) }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelete.title}"?`}
          onConfirm={async () => {
            await deleteCharge.mutateAsync(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteCharge.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

// ── Charge row ─────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#FEF3C7', color: '#92400E' },
  paid:    { bg: '#D1FAE5', color: '#065F46' },
  overdue: { bg: '#FEE2E2', color: '#991B1B' },
}

function ChargeRow({ charge, isLast, onEdit, onMarkPaid, onDelete, onAskAi, isMarkingPaid, t }: {
  charge:        ChargeWithOwner
  isLast:        boolean
  onEdit:        () => void
  onMarkPaid:    () => void
  onDelete:      () => void
  onAskAi:       () => void
  isMarkingPaid: boolean
  t:             (key: string) => string
}) {
  const statusColor = STATUS_COLORS[charge.status] ?? STATUS_COLORS['pending']!

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(60,60,67,0.06)' }}>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{charge.title}</span>
        <span style={{ fontSize: 11, color: '#6E6E73', display: 'block' }}>
          {t(`charges.${charge.period === 'one_time' ? 'oneTime' : charge.period}`)}
        </span>
      </td>
      <td style={tdStyle}>
        {charge.owners
          ? `${charge.owners.units.unit_number} — ${charge.owners.full_name}`
          : <span style={{ color: '#6E6E73' }}>—</span>
        }
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 600 }}>€{charge.amount.toFixed(2)}</span>
      </td>
      <td style={tdStyle}>
        {new Date(charge.due_date).toLocaleDateString(undefined, {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
        {charge.paid_date && (
          <span style={{ fontSize: 11, color: '#6E6E73', display: 'block' }}>
            {t('charges.paidDate')} {new Date(charge.paid_date).toLocaleDateString()}
          </span>
        )}
      </td>
      <td style={tdStyle}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          background: statusColor.bg, color: statusColor.color,
        }}>
          {t(`charges.${charge.status}`)}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          {charge.status !== 'paid' && (
            <SmallBtn
              onClick={onMarkPaid}
              label={isMarkingPaid ? '…' : t('charges.markPaid')}
              primary
            />
          )}
          {charge.status !== 'paid' && (
            <button
              onClick={onAskAi}
              title={t('ai.draftReminder')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(245,158,11,0.35)',
                background: 'rgba(245,158,11,0.08)', color: '#B45309',
                fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={11} />
              {t('ai.draftReminder')}
            </button>
          )}
          <SmallBtn onClick={onEdit}   label={t('common.edit')} />
          <SmallBtn onClick={onDelete} label={t('common.delete')} danger />
        </div>
      </td>
    </tr>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

function SmallBtn({ onClick, label, danger, primary }: {
  onClick: () => void; label: string; danger?: boolean; primary?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: primary ? '#1E3A5F' : 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : primary ? '#1E3A5F' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5,
      color: danger ? '#DC2626' : primary ? '#FFFFFF' : '#6E6E73',
      fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, loading, t }: {
  message: string; onConfirm: () => void; onCancel: () => void;
  loading: boolean; t: (key: string) => string
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1E3A5F' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', background: 'transparent',
            border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6,
            fontSize: 13, color: '#6E6E73', cursor: 'pointer',
          }}>{t('common.cancel')}</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '7px 16px', background: '#DC2626', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#FFFFFF',
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}>{loading ? t('common.loading') : t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}
