import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { Income }         from './income.api'

const INCOME_TYPES = ['provision', 'subsidy', 'insurance_refund', 'interest', 'other'] as const

interface Props {
  income?:  Income
  year:     number
  onSave:   (data: IncomeFormData) => void
  onClose:  () => void
  saving:   boolean
}

export interface IncomeFormData {
  date:        string
  type:        string
  description: string
  amount:      number
  reference?:  string | null
  notes?:      string | null
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const ROW:   React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function IncomeModal({ income, year, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<IncomeFormData>({
    date:        income?.date        ?? `${year}-01-01`,
    type:        income?.type        ?? 'provision',
    description: income?.description ?? '',
    amount:      income?.amount      ?? 0,
    reference:   income?.reference   ?? '',
    notes:       income?.notes       ?? '',
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (income) {
      setForm({
        date:        income.date,
        type:        income.type,
        description: income.description,
        amount:      income.amount,
        reference:   income.reference ?? '',
        notes:       income.notes ?? '',
      })
    }
  }, [income])

  function set(key: keyof IncomeFormData, value: string | number | null) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(String(form.amount))
    if (isNaN(amount) || amount <= 0) { setErr(t('charges.amountError')); return }
    if (!form.description.trim()) { setErr(t('common.required')); return }
    setErr('')
    onSave({ ...form, amount, reference: form.reference || null, notes: form.notes || null })
  }

  const isEdit = !!income
  const title  = isEdit ? t('accounting.editIncome') : t('accounting.addIncome')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('common.date')}</label>
              <input style={INPUT} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('common.amount')} (€)</label>
              <input style={INPUT} type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={e => set('amount', e.target.value)} required />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.incomeType')}</label>
            <select style={INPUT} value={form.type} onChange={e => set('type', e.target.value)}>
              {INCOME_TYPES.map(type => (
                <option key={type} value={type}>{t(`accounting.incomeType_${type}`)}</option>
              ))}
            </select>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.description')}</label>
            <input style={INPUT} value={form.description} onChange={e => set('description', e.target.value)} required maxLength={500} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.reference')}</label>
            <input style={INPUT} value={form.reference ?? ''} onChange={e => set('reference', e.target.value)} maxLength={100} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('common.notes')}</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </div>

          {err && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 7, background: '#1E3A5F', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
