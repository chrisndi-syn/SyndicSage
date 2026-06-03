import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { BELGIAN_ACCOUNTING_CODES } from '@syndicsage/types'
import type { Expense }         from './useExpenses'

export const VME_CATEGORIES = [
  'Cleaning',
  'Maintenance',
  'Repairs',
  'Utilities',
  'Insurance',
  'Lift',
  'Heating',
  'Gardening',
  'Security',
  'Admin',
  'Legal',
  'Accounting',
  'Works',
  'Other',
] as const

interface Props {
  expense?:   Expense
  year:       number
  onSave:     (data: ExpenseFormData) => void
  onClose:    () => void
  saving:     boolean
}

export interface ExpenseFormData {
  date:            string
  description:     string
  amount:          number
  category:        string
  accounting_code: string
  supplier?:       string | null
  reference?:      string | null
  notes?:          string | null
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const ROW: React.CSSProperties  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function ExpenseModal({ expense, year, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<ExpenseFormData>({
    date:            expense?.date            ?? `${year}-01-01`,
    description:     expense?.description     ?? '',
    amount:          expense?.amount          ?? 0,
    category:        expense?.category        ?? '',
    accounting_code: expense?.accounting_code ?? 'other',
    supplier:        expense?.supplier        ?? '',
    reference:       expense?.reference       ?? '',
    notes:           expense?.notes           ?? '',
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (expense) {
      setForm({
        date:            expense.date,
        description:     expense.description,
        amount:          expense.amount,
        category:        expense.category,
        accounting_code: expense.accounting_code,
        supplier:        expense.supplier ?? '',
        reference:       expense.reference ?? '',
        notes:           expense.notes ?? '',
      })
    }
  }, [expense])

  function set(key: keyof ExpenseFormData, value: string | number | null) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(String(form.amount))
    if (isNaN(amount) || amount <= 0) { setErr(t('charges.amountError')); return }
    if (!form.description.trim()) { setErr(t('common.required')); return }
    setErr('')
    onSave({ ...form, amount, supplier: form.supplier || null, reference: form.reference || null, notes: form.notes || null })
  }

  const isEdit = !!expense
  const title  = isEdit ? t('accounting.editExpense') : t('accounting.addExpense')

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
            <label style={LABEL}>{t('accounting.description')}</label>
            <input style={INPUT} value={form.description} onChange={e => set('description', e.target.value)} required maxLength={500} />
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('accounting.category')}</label>
              <select style={INPUT} value={form.category} onChange={e => set('category', e.target.value)} required>
                <option value="">— select —</option>
                {VME_CATEGORIES.map(c => <option key={c} value={c}>{t(`accounting.category_${c}`)}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('accounting.accountingCode')}</label>
              <select style={INPUT} value={form.accounting_code} onChange={e => set('accounting_code', e.target.value)}>
                {Object.entries(BELGIAN_ACCOUNTING_CODES).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('accounting.supplier')}</label>
              <input style={INPUT} value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value)} maxLength={200} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('accounting.reference')}</label>
              <input style={INPUT} value={form.reference ?? ''} onChange={e => set('reference', e.target.value)} maxLength={100} />
            </div>
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
