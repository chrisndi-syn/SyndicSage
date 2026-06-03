import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { InsuranceClaim, InsurancePolicy } from './useInsurance'

export const CLAIM_STATUSES = [
  'open',
  'in_progress',
  'settled',
  'rejected',
  'closed',
] as const

interface Props {
  claim?:    InsuranceClaim
  policies:  InsurancePolicy[]
  onSave:    (data: ClaimFormData) => void
  onClose:   () => void
  saving:    boolean
}

export interface ClaimFormData {
  policy_id:       string
  date:            string
  description:     string
  amount_claimed:  number | null
  amount_received: number | null
  status:          string
  reference:       string | null
  notes:           string | null
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

export function InsuranceClaimModal({ claim, policies, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit = !!claim

  const [form, setForm] = useState<ClaimFormData>({
    policy_id:       claim?.policy_id       ?? (policies[0]?.id ?? ''),
    date:            claim?.date             ?? new Date().toISOString().slice(0, 10),
    description:     claim?.description      ?? '',
    amount_claimed:  claim?.amount_claimed   ?? null,
    amount_received: claim?.amount_received  ?? null,
    status:          claim?.status           ?? 'open',
    reference:       claim?.reference        ?? null,
    notes:           claim?.notes            ?? null,
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (claim) {
      setForm({
        policy_id:       claim.policy_id,
        date:            claim.date,
        description:     claim.description,
        amount_claimed:  claim.amount_claimed,
        amount_received: claim.amount_received,
        status:          claim.status,
        reference:       claim.reference,
        notes:           claim.notes,
      })
    }
  }, [claim])

  function setStr(key: keyof ClaimFormData, value: string) {
    setForm(f => ({ ...f, [key]: value || null }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.policy_id) { setErr(t('common.required')); return }
    if (!form.description.trim()) { setErr(t('common.required')); return }
    const claimed  = form.amount_claimed  !== null ? parseFloat(String(form.amount_claimed))  : null
    const received = form.amount_received !== null ? parseFloat(String(form.amount_received)) : null
    if (claimed !== null && isNaN(claimed))   { setErr(t('common.invalidNumber')); return }
    if (received !== null && isNaN(received)) { setErr(t('common.invalidNumber')); return }
    setErr('')
    onSave({ ...form, amount_claimed: claimed, amount_received: received })
  }

  const title = isEdit ? t('insurance.editClaim') : t('insurance.addClaim')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={FIELD}>
            <label style={LABEL}>{t('insurance.policy')}</label>
            <select style={INPUT} value={form.policy_id} onChange={e => setForm(f => ({ ...f, policy_id: e.target.value }))} required>
              <option value="">— select —</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.insurer_name}{p.policy_number ? ` — ${p.policy_number}` : ''}</option>
              ))}
            </select>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('common.date')}</label>
              <input style={INPUT} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.reference')}</label>
              <input style={INPUT} value={form.reference ?? ''} onChange={e => setStr('reference', e.target.value)} maxLength={100} />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('insurance.description')}</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required maxLength={2000} />
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.amountClaimed')} (€)</label>
              <input style={INPUT} type="number" step="0.01" min="0" value={form.amount_claimed ?? ''} onChange={e => setForm(f => ({ ...f, amount_claimed: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.amountReceived')} (€)</label>
              <input style={INPUT} type="number" step="0.01" min="0" value={form.amount_received ?? ''} onChange={e => setForm(f => ({ ...f, amount_received: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
          </div>

          {isEdit && (
            <div style={FIELD}>
              <label style={LABEL}>{t('insurance.status')}</label>
              <select style={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {CLAIM_STATUSES.map(s => (
                  <option key={s} value={s}>{t(`insurance.claimStatus_${s}`)}</option>
                ))}
              </select>
            </div>
          )}

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
