import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { Sparkles }            from 'lucide-react'
import { BELGIAN_ACCOUNTING_CODES } from '@syndicsage/types'
import type { Expense }         from './useExpenses'
import { suggestAccountingCode } from '../ai/ai.api'

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
  expense?:    Expense
  year:        number
  buildingId:  string
  onSave:      (data: ExpenseFormData) => void
  onClose:     () => void
  saving:      boolean
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

export function ExpenseModal({ expense, year, buildingId, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{ code: string; label: string; confidence: number } | null>(null)
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

  async function handleAiSuggest() {
    if (!form.description.trim() || aiSuggesting) return
    setAiSuggesting(true)
    setAiSuggestion(null)
    try {
      const suggestion = await suggestAccountingCode(form.description, form.supplier ?? '', buildingId)
      setAiSuggestion(suggestion)
    } catch {
      // silent — AI suggestion is non-critical
    } finally {
      setAiSuggesting(false)
    }
  }

  function acceptSuggestion() {
    if (!aiSuggestion) return
    set('accounting_code', aiSuggestion.code)
    setAiSuggestion(null)
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ ...LABEL, margin: 0 }}>{t('accounting.accountingCode')}</label>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiSuggesting || !form.description.trim()}
                  title={t('ai.suggestCode')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: aiSuggesting || !form.description.trim() ? 'not-allowed' : 'pointer',
                    fontSize: 11, color: aiSuggesting ? '#9CA3AF' : '#F59E0B', padding: '0 2px',
                    opacity: !form.description.trim() ? 0.4 : 1,
                  }}
                >
                  <Sparkles size={11} />
                  {aiSuggesting ? t('ai.suggesting') : t('ai.suggest')}
                </button>
              </div>
              <select style={INPUT} value={form.accounting_code} onChange={e => { set('accounting_code', e.target.value); setAiSuggestion(null) }}>
                {Object.entries(BELGIAN_ACCOUNTING_CODES).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
              {/* AI suggestion chip */}
              {aiSuggestion && (
                <div style={{
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 7, padding: '6px 10px',
                }}>
                  <Sparkles size={11} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#92400e', flex: 1 }}>
                    <strong>{aiSuggestion.code}</strong> — {aiSuggestion.label}
                    <span style={{ color: '#9CA3AF', marginLeft: 4 }}>
                      ({Math.round(aiSuggestion.confidence * 100)}% {t('ai.confidence')})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={acceptSuggestion}
                    style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      background: '#F59E0B', color: '#fff', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {t('ai.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9CA3AF', padding: '0 2px' }}
                  >
                    ✕
                  </button>
                </div>
              )}
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
