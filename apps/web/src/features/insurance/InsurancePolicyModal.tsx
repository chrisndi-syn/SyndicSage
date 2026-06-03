import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { InsurancePolicy } from './useInsurance'

export const POLICY_TYPES = [
  'fire',
  'liability',
  'omnium',
  'elevator',
  'legal',
  'other',
] as const

interface Props {
  policy?:  InsurancePolicy
  onSave:   (data: PolicyFormData) => void
  onClose:  () => void
  saving:   boolean
}

export interface PolicyFormData {
  insurer_name:           string
  type:                   string
  policy_number:          string | null
  premium_annual:         number | null
  start_date:             string | null
  end_date:               string | null
  contact_name:           string | null
  contact_email:          string | null
  contact_phone:          string | null
  notes:                  string | null
  renewal_reminder_days:  number
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const ROW: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function InsurancePolicyModal({ policy, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit = !!policy

  const [form, setForm] = useState<PolicyFormData>({
    insurer_name:           policy?.insurer_name           ?? '',
    type:                   policy?.type                   ?? '',
    policy_number:          policy?.policy_number          ?? null,
    premium_annual:         policy?.premium_annual         ?? null,
    start_date:             policy?.start_date             ?? null,
    end_date:               policy?.end_date               ?? null,
    contact_name:           policy?.contact_name           ?? null,
    contact_email:          policy?.contact_email          ?? null,
    contact_phone:          policy?.contact_phone          ?? null,
    notes:                  policy?.notes                  ?? null,
    renewal_reminder_days:  policy?.renewal_reminder_days  ?? 30,
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (policy) {
      setForm({
        insurer_name:          policy.insurer_name,
        type:                  policy.type,
        policy_number:         policy.policy_number,
        premium_annual:        policy.premium_annual,
        start_date:            policy.start_date,
        end_date:              policy.end_date,
        contact_name:          policy.contact_name,
        contact_email:         policy.contact_email,
        contact_phone:         policy.contact_phone,
        notes:                 policy.notes,
        renewal_reminder_days: policy.renewal_reminder_days,
      })
    }
  }, [policy])

  function setStr(key: keyof PolicyFormData, value: string) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.insurer_name.trim()) { setErr(t('common.required')); return }
    if (!form.type) { setErr(t('common.required')); return }
    const premium = form.premium_annual !== null ? parseFloat(String(form.premium_annual)) : null
    if (premium !== null && isNaN(premium)) { setErr(t('common.invalidNumber')); return }
    setErr('')
    onSave({ ...form, premium_annual: premium })
  }

  const title = isEdit ? t('insurance.editPolicy') : t('insurance.addPolicy')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.insurerName')}</label>
              <input style={INPUT} value={form.insurer_name} onChange={e => setForm(f => ({ ...f, insurer_name: e.target.value }))} required maxLength={200} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.policyType')}</label>
              <select style={INPUT} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required>
                <option value="">— select —</option>
                {POLICY_TYPES.map(pt => (
                  <option key={pt} value={pt}>{t(`insurance.type_${pt}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.policyNumber')}</label>
              <input style={INPUT} value={form.policy_number ?? ''} onChange={e => setStr('policy_number', e.target.value)} maxLength={100} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.premiumAnnual')} (€)</label>
              <input style={INPUT} type="number" step="0.01" min="0" value={form.premium_annual ?? ''} onChange={e => setForm(f => ({ ...f, premium_annual: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.startDate')}</label>
              <input style={INPUT} type="date" value={form.start_date ?? ''} onChange={e => setStr('start_date', e.target.value)} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.endDate')}</label>
              <input style={INPUT} type="date" value={form.end_date ?? ''} onChange={e => setStr('end_date', e.target.value)} />
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.contactName')}</label>
              <input style={INPUT} value={form.contact_name ?? ''} onChange={e => setStr('contact_name', e.target.value)} maxLength={200} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.contactPhone')}</label>
              <input style={INPUT} value={form.contact_phone ?? ''} onChange={e => setStr('contact_phone', e.target.value)} maxLength={50} />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('insurance.contactEmail')}</label>
            <input style={INPUT} type="email" value={form.contact_email ?? ''} onChange={e => setStr('contact_email', e.target.value)} maxLength={200} />
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
