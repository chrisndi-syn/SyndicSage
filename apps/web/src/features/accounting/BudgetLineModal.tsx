import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { BudgetLineWithActual } from './budgetLines.api'
import { VME_CATEGORIES } from './ExpenseModal'

interface Props {
  line?:    BudgetLineWithActual
  year:     number
  onSave:   (data: BudgetLineFormData) => void
  onClose:  () => void
  saving:   boolean
}

export interface BudgetLineFormData {
  category:        string
  description:     string
  amount_budgeted: number
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function BudgetLineModal({ line, year, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<BudgetLineFormData>({
    category:        line?.category        ?? '',
    description:     line?.description     ?? '',
    amount_budgeted: line?.amount_budgeted ?? 0,
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (line) {
      setForm({
        category:        line.category,
        description:     line.description,
        amount_budgeted: line.amount_budgeted,
      })
    }
  }, [line])

  function set(key: keyof BudgetLineFormData, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(String(form.amount_budgeted))
    if (isNaN(amount) || amount < 0) { setErr(t('charges.amountError')); return }
    if (!form.category.trim())    { setErr(t('common.required')); return }
    if (!form.description.trim()) { setErr(t('common.required')); return }
    setErr('')
    onSave({ ...form, amount_budgeted: amount })
  }

  const isEdit = !!line
  const title  = isEdit ? t('accounting.editBudgetLine') : t('accounting.addBudgetLine')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 4 }}>
          {title}
        </h2>
        <p style={{ fontSize: 12, color: '#6E6E73', marginBottom: 20 }}>{year}</p>
        <form onSubmit={handleSubmit}>
          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.category')}</label>
            <select style={INPUT} value={form.category} onChange={e => set('category', e.target.value)} required>
              <option value="">— select —</option>
              {VME_CATEGORIES.map(c => <option key={c} value={c}>{t(`accounting.category_${c}`)}</option>)}
            </select>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.description')}</label>
            <input style={INPUT} value={form.description} onChange={e => set('description', e.target.value)} required maxLength={500} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('accounting.budgeted')} (€)</label>
            <input style={INPUT} type="number" step="0.01" min="0" value={form.amount_budgeted || ''} onChange={e => set('amount_budgeted', e.target.value)} required />
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
