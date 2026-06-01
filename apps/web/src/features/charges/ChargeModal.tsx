// ── Charge add/edit modal ─────────────────────────────────────

import { useState, useEffect }   from 'react'
import { useTranslation }        from 'react-i18next'
import type { ChargeWithOwner }  from './charges.api'
import { useCreateCharge, useUpdateCharge } from './useCharges'
import type { OwnerWithUnit }    from '../owners/owners.api'

interface Props {
  buildingId: string
  owners:     OwnerWithUnit[]
  charge?:    ChargeWithOwner   // present = edit mode
  onClose:    () => void
}

const PERIODS = ['monthly', 'quarterly', 'annual', 'one_time'] as const

export function ChargeModal({ buildingId, owners, charge, onClose }: Props) {
  const { t } = useTranslation()
  const createMutation = useCreateCharge(buildingId)
  const updateMutation = useUpdateCharge(buildingId)

  const [ownerId,  setOwnerId]  = useState(charge?.owner_id ?? '')
  const [title,    setTitle]    = useState(charge?.title    ?? '')
  const [amount,   setAmount]   = useState(charge?.amount.toString() ?? '')
  const [period,   setPeriod]   = useState<typeof PERIODS[number]>(
    (charge?.period as typeof PERIODS[number]) ?? 'monthly',
  )
  const [dueDate,  setDueDate]  = useState(charge?.due_date ?? '')
  const [notes,    setNotes]    = useState(charge?.notes    ?? '')
  const [error,    setError]    = useState('')

  const isEdit    = !!charge
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => { setError('') }, [title, amount, dueDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError(t('charges.amountError'))
      return
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id:   charge.id,
          body: {
            title:    title.trim()   || undefined,
            amount:   amt,
            period:   period,
            due_date: dueDate        || undefined,
            notes:    notes.trim() || null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          owner_id: ownerId || undefined,
          title:    title.trim(),
          amount:   amt,
          period,
          due_date: dueDate,
          notes:    notes.trim() || undefined,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        width: 460, maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1E3A5F' }}>
          {isEdit ? t('charges.edit') : t('charges.add')}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Owner selector */}
          <Field label={t('charges.owner')}>
            <select value={ownerId} onChange={e => setOwnerId(e.target.value)} style={inputStyle}>
              <option value="">{t('charges.noOwner')}</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>
                  {o.units.unit_number} — {o.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('charges.title')} required>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required autoFocus
              style={inputStyle}
              placeholder={t('charges.titlePlaceholder')}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('common.amount')} required>
              <input
                type="number" min="0.01" step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required style={inputStyle}
                placeholder="350.00"
              />
            </Field>
            <Field label={t('charges.period')} required>
              <select value={period} onChange={e => setPeriod(e.target.value as typeof PERIODS[number])} style={inputStyle}>
                {PERIODS.map(p => (
                  <option key={p} value={p}>{t(`charges.${p === 'one_time' ? 'oneTime' : p}`)}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('charges.dueDate')} required>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required style={inputStyle}
            />
          </Field>

          <Field label={t('common.notes')}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

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
  borderRadius: 6, fontSize: 14, color: '#1E3A5F',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6,
  fontSize: 13, color: '#6E6E73', cursor: 'pointer',
}
const submitBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#1E3A5F',
  border: 'none', borderRadius: 6,
  fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
}
