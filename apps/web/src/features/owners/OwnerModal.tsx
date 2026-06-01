// ── Owner add/edit modal ──────────────────────────────────────

import { useState, useEffect }   from 'react'
import { useTranslation }        from 'react-i18next'
import type { OwnerWithUnit }    from './owners.api'
import { useCreateOwner, useUpdateOwner } from './useOwners'

interface Props {
  buildingId: string
  owner?:     OwnerWithUnit
  onClose:    () => void
}

const UNIT_TYPES = ['apartment', 'parking', 'storage', 'commercial', 'other'] as const
const LANGUAGES  = ['fr', 'nl', 'en'] as const

export function OwnerModal({ buildingId, owner, onClose }: Props) {
  const { t } = useTranslation()
  const createMutation = useCreateOwner(buildingId)
  const updateMutation = useUpdateOwner(buildingId)

  // Unit fields (create only)
  const [unitNumber, setUnitNumber] = useState('')
  const [unitType,   setUnitType]   = useState<typeof UNIT_TYPES[number]>('apartment')
  const [ownerShare, setOwnerShare] = useState('100')

  // Core fields
  const [fullName,   setFullName]   = useState(owner?.full_name ?? '')
  const [email,      setEmail]      = useState(owner?.email ?? '')
  const [phone,      setPhone]      = useState(owner?.phone ?? '')
  const [isRenter,   setIsRenter]   = useState(owner?.is_renter ?? false)
  const [hasNoEmail, setHasNoEmail] = useState(owner?.has_no_email ?? false)

  // Extra fields
  const [bankAccount,  setBankAccount]  = useState(owner?.bank_account ?? '')
  const [language,     setLanguage]     = useState<typeof LANGUAGES[number]>(owner?.preferred_language ?? 'fr')
  const [diffAddr,     setDiffAddr]     = useState(!!(owner?.mailing_address))
  const [mailingAddr,  setMailingAddr]  = useState(owner?.mailing_address ?? '')

  const isEdit    = !!owner
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => { if (hasNoEmail) setEmail('') }, [hasNoEmail])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id:   owner.id,
          body: {
            full_name:          fullName.trim() || undefined,
            email:              hasNoEmail ? undefined : email.trim() || undefined,
            phone:              phone.trim() || null,
            is_renter:          isRenter,
            has_no_email:       hasNoEmail,
            bank_account:       bankAccount.trim() || null,
            preferred_language: language,
            mailing_address:    diffAddr && mailingAddr.trim() ? mailingAddr.trim() : null,
          },
        })
      } else {
        const share = parseFloat(ownerShare)
        if (isNaN(share) || share <= 0) { return }
        await createMutation.mutateAsync({
          unit_number:        unitNumber.trim(),
          unit_type:          unitType,
          ownership_share:    share,
          full_name:          fullName.trim(),
          email:              hasNoEmail ? '' : email.trim(),
          phone:              phone.trim() || undefined,
          is_renter:          isRenter,
          has_no_email:       hasNoEmail,
          bank_account:       bankAccount.trim() || undefined,
          preferred_language: language,
          mailing_address:    diffAddr && mailingAddr.trim() ? mailingAddr.trim() : undefined,
        })
      }
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,30,55,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: 14,
        padding: 28, width: 520, maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 24px 80px rgba(30,58,95,0.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 22px', fontSize: 22, fontWeight: 600, color: '#1E3A5F',
          fontFamily: "'Cormorant Garamond', serif" }}>
          {isEdit ? t('owners.edit') : t('owners.add')}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Unit section — create mode only */}
          {!isEdit && (
            <>
              <SectionLabel label={t('owners.unitSection')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('owners.unitNumber')} required>
                  <input value={unitNumber} onChange={e => setUnitNumber(e.target.value)}
                    required autoFocus style={inputStyle} placeholder="3B" />
                </Field>
                <Field label={t('owners.ownershipShare')} required>
                  <input type="number" min="0.01" step="0.01"
                    value={ownerShare} onChange={e => setOwnerShare(e.target.value)}
                    required style={inputStyle} placeholder="100" />
                </Field>
              </div>
              <Field label={t('owners.unitType')} required>
                <select value={unitType} onChange={e => setUnitType(e.target.value as typeof UNIT_TYPES[number])} style={inputStyle}>
                  {UNIT_TYPES.map(type => (
                    <option key={type} value={type}>{t(`owners.unitTypes.${type}`)}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {/* Contact section */}
          <SectionLabel label={t('owners.contactSection')} />

          <Field label={t('owners.fullName')} required>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              required autoFocus={isEdit} style={inputStyle} placeholder="Jean Dupont" />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
            <input type="checkbox" checked={hasNoEmail} onChange={e => setHasNoEmail(e.target.checked)} />
            {t('owners.hasNoEmail')}
          </label>

          {!hasNoEmail && (
            <Field label={t('common.email')} required>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required={!hasNoEmail} style={inputStyle} placeholder="jean.dupont@example.com" />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label={t('common.phone')}>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                style={inputStyle} placeholder="+32 471 12 34 56" />
            </Field>
            <Field label={t('owners.language')}>
              <select value={language} onChange={e => setLanguage(e.target.value as typeof LANGUAGES[number])} style={inputStyle}>
                <option value="fr">Français</option>
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E3A5F', cursor: 'pointer' }}>
            <input type="checkbox" checked={isRenter} onChange={e => setIsRenter(e.target.checked)} />
            {t('owners.isRenter')}
          </label>

          {/* Extra section */}
          <SectionLabel label={t('owners.extraSection')} />

          <Field label={t('owners.iban')}>
            <input value={bankAccount} onChange={e => setBankAccount(e.target.value)}
              style={inputStyle} placeholder={t('owners.ibanPlaceholder')} />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E3A5F', cursor: 'pointer', marginTop: 2 }}>
            <input type="checkbox" checked={diffAddr} onChange={e => setDiffAddr(e.target.checked)} />
            {t('owners.diffMailingAddr')}
          </label>

          {diffAddr && (
            <Field label={t('owners.mailingAddress')}>
              <textarea
                value={mailingAddr} onChange={e => setMailingAddr(e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                placeholder={'Rue de la Paix 3\n1000 Bruxelles\nBelgique'}
              />
            </Field>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
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

function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600,
      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </p>
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
  borderRadius: 7, fontSize: 13, color: '#1E3A5F',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: 'transparent',
  border: '1px solid rgba(60,60,67,0.18)', borderRadius: 7,
  fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
}
const submitBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#1E3A5F',
  border: 'none', borderRadius: 7,
  fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
}
