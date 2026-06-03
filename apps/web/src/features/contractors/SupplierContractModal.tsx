import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { SupplierContract, Contractor } from './useContractors'

export const CONTRACT_STATUSES = [
  'active',
  'expiring_soon',
  'expired',
  'cancelled',
] as const

interface Props {
  contract?:    SupplierContract
  contractors:  Contractor[]
  onSave:       (data: SupplierContractFormData) => void
  onClose:      () => void
  saving:       boolean
}

export interface SupplierContractFormData {
  contractor_id:  string
  title:          string
  description:    string | null
  start_date:     string | null
  end_date:       string | null
  amount_annual:  number | null
  status:         string
  notes:          string | null
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
const ROW: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function SupplierContractModal({ contract, contractors, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit = !!contract

  const [form, setForm] = useState<SupplierContractFormData>({
    contractor_id:  contract?.contractor_id ?? (contractors[0]?.id ?? ''),
    title:          contract?.title         ?? '',
    description:    contract?.description   ?? null,
    start_date:     contract?.start_date    ?? null,
    end_date:       contract?.end_date      ?? null,
    amount_annual:  contract?.amount_annual ?? null,
    status:         contract?.status        ?? 'active',
    notes:          contract?.notes         ?? null,
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (contract) {
      setForm({
        contractor_id:  contract.contractor_id,
        title:          contract.title,
        description:    contract.description,
        start_date:     contract.start_date,
        end_date:       contract.end_date,
        amount_annual:  contract.amount_annual,
        status:         contract.status,
        notes:          contract.notes,
      })
    }
  }, [contract])

  function setStr(key: keyof SupplierContractFormData, value: string) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.contractor_id) { setErr(t('common.required')); return }
    if (!form.title.trim()) { setErr(t('common.required')); return }
    const amount = form.amount_annual !== null ? parseFloat(String(form.amount_annual)) : null
    if (amount !== null && isNaN(amount)) { setErr(t('common.invalidNumber')); return }
    setErr('')
    onSave({ ...form, amount_annual: amount })
  }

  const title = isEdit ? t('contractors.editContract') : t('contractors.addContract')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={FIELD}>
            <label style={LABEL}>{t('contractors.contractor')}</label>
            <select style={INPUT} value={form.contractor_id} onChange={e => setForm(f => ({ ...f, contractor_id: e.target.value }))} required>
              <option value="">— select —</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({t(`contractors.trade_${c.trade}`)})</option>
              ))}
            </select>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('contractors.contractTitle')}</label>
            <input style={INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={300} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('contractors.contractDescription')}</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.description ?? ''} onChange={e => setStr('description', e.target.value)} maxLength={2000} />
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.startDate')}</label>
              <input style={INPUT} type="date" value={form.start_date ?? ''} onChange={e => setStr('start_date', e.target.value)} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.endDate')}</label>
              <input style={INPUT} type="date" value={form.end_date ?? ''} onChange={e => setStr('end_date', e.target.value)} />
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.amountAnnual')} (€)</label>
              <input style={INPUT} type="number" step="0.01" min="0" value={form.amount_annual ?? ''} onChange={e => setForm(f => ({ ...f, amount_annual: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            {isEdit && (
              <div style={FIELD}>
                <label style={LABEL}>{t('contractors.contractStatus')}</label>
                <select style={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {CONTRACT_STATUSES.map(s => (
                    <option key={s} value={s}>{t(`contractors.contractStatus_${s}`)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('common.notes')}</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={form.notes ?? ''} onChange={e => setStr('notes', e.target.value)} />
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
