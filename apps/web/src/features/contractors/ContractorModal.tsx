import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { Contractor }      from './useContractors'

export const CONTRACTOR_TRADES = [
  'plumber',
  'electrician',
  'elevator',
  'cleaning',
  'landscaping',
  'painting',
  'hvac',
  'locksmith',
  'general',
  'other',
] as const

interface Props {
  contractor?: Contractor
  onSave:      (data: ContractorFormData) => void
  onClose:     () => void
  saving:      boolean
}

export interface ContractorFormData {
  name:        string
  trade:       string
  phone:       string | null
  email:       string | null
  vat_number:  string | null
  address:     string | null
  notes:       string | null
  rating:      number | null
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

export function ContractorModal({ contractor, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit = !!contractor

  const [form, setForm] = useState<ContractorFormData>({
    name:       contractor?.name       ?? '',
    trade:      contractor?.trade      ?? '',
    phone:      contractor?.phone      ?? null,
    email:      contractor?.email      ?? null,
    vat_number: contractor?.vat_number ?? null,
    address:    contractor?.address    ?? null,
    notes:      contractor?.notes      ?? null,
    rating:     contractor?.rating     ?? null,
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (contractor) {
      setForm({
        name:       contractor.name,
        trade:      contractor.trade,
        phone:      contractor.phone,
        email:      contractor.email,
        vat_number: contractor.vat_number,
        address:    contractor.address,
        notes:      contractor.notes,
        rating:     contractor.rating,
      })
    }
  }, [contractor])

  function setStr(key: keyof ContractorFormData, value: string) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr(t('common.required')); return }
    if (!form.trade) { setErr(t('common.required')); return }
    const rating = form.rating !== null ? parseFloat(String(form.rating)) : null
    if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) {
      setErr(t('contractors.ratingError')); return
    }
    setErr('')
    onSave({ ...form, rating })
  }

  const title = isEdit ? t('contractors.editContractor') : t('contractors.addContractor')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.name')}</label>
              <input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={200} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.trade')}</label>
              <select style={INPUT} value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} required>
                <option value="">— select —</option>
                {CONTRACTOR_TRADES.map(tr => (
                  <option key={tr} value={tr}>{t(`contractors.trade_${tr}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.phone')}</label>
              <input style={INPUT} value={form.phone ?? ''} onChange={e => setStr('phone', e.target.value)} maxLength={50} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.email')}</label>
              <input style={INPUT} type="email" value={form.email ?? ''} onChange={e => setStr('email', e.target.value)} maxLength={200} />
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.vatNumber')}</label>
              <input style={INPUT} value={form.vat_number ?? ''} onChange={e => setStr('vat_number', e.target.value)} maxLength={20} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('contractors.rating')} (1–5)</label>
              <input style={INPUT} type="number" min="1" max="5" step="1" value={form.rating ?? ''} onChange={e => setForm(f => ({ ...f, rating: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('contractors.address')}</label>
            <input style={INPUT} value={form.address ?? ''} onChange={e => setStr('address', e.target.value)} maxLength={300} />
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
