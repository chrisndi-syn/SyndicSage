// ── Owner add/edit modal ──────────────────────────────────────

import { useState, useEffect }   from 'react'
import { useTranslation }        from 'react-i18next'
import type { OwnerWithUnit }    from './owners.api'
import { useCreateOwner, useUpdateOwner } from './useOwners'

interface Props {
  buildingId: string
  owner?:     OwnerWithUnit   // present = edit mode
  onClose:    () => void
}

const UNIT_TYPES = ['apartment', 'parking', 'storage', 'commercial', 'other'] as const

export function OwnerModal({ buildingId, owner, onClose }: Props) {
  const { t } = useTranslation()
  const createMutation = useCreateOwner(buildingId)
  const updateMutation = useUpdateOwner(buildingId)

  // Unit fields (create only)
  const [unitNumber, setUnitNumber] = useState('')
  const [unitType,   setUnitType]   = useState<typeof UNIT_TYPES[number]>('apartment')
  const [ownerShare, setOwnerShare] = useState('100')

  // Owner fields
  const [fullName,  setFullName]  = useState(owner?.full_name ?? '')
  const [email,     setEmail]     = useState(owner?.email     ?? '')
  const [phone,     setPhone]     = useState(owner?.phone     ?? '')
  const [isRenter,  setIsRenter]  = useState(owner?.is_renter ?? false)
  const [error,     setError]     = useState('')

  const isEdit    = !!owner
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => { setError('') }, [fullName, email, phone, unitNumber, ownerShare])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id:   owner.id,
          body: {
            full_name: fullName.trim() || undefined,
            email:     email.trim()    || undefined,
            phone:     phone.trim() || null,
            is_renter: isRenter,
          },
        })
      } else {
        const share = parseFloat(ownerShare)
        if (isNaN(share) || share <= 0) {
          setError(t('owners.shareError'))
          return
        }
        await createMutation.mutateAsync({
          unit_number:     unitNumber.trim(),
          unit_type:       unitType,
          ownership_share: share,
          full_name:       fullName.trim(),
          email:           email.trim(),
          phone:           phone.trim() || undefined,
          is_renter:       isRenter,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF', borderRadius: 12,
        padding: 24, width: 500, maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1E3A5F' }}>
          {isEdit ? t('owners.edit') : t('owners.add')}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Unit fields — create mode only */}
          {!isEdit && (
            <>
              <SectionLabel label={t('owners.unitSection')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={t('owners.unitNumber')} required>
                  <input
                    value={unitNumber}
                    onChange={e => setUnitNumber(e.target.value)}
                    required autoFocus
                    style={inputStyle}
                    placeholder="3B"
                  />
                </Field>
                <Field label={t('owners.ownershipShare')} required>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={ownerShare}
                    onChange={e => setOwnerShare(e.target.value)}
                    required
                    style={inputStyle}
                    placeholder="100"
                  />
                </Field>
              </div>
              <Field label={t('owners.unitType')} required>
                <select value={unitType} onChange={e => setUnitType(e.target.value as typeof UNIT_TYPES[number])} style={inputStyle}>
                  {UNIT_TYPES.map(type => (
                    <option key={type} value={type}>{t(`owners.unitTypes.${type}`)}</option>
                  ))}
                </select>
              </Field>
              <SectionLabel label={t('owners.contactSection')} />
            </>
          )}

          <Field label={t('owners.fullName')} required>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoFocus={isEdit}
              style={inputStyle}
              placeholder="Jean Dupont"
            />
          </Field>

          <Field label={t('common.email')} required>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="jean.dupont@example.com"
            />
          </Field>

          <Field label={t('common.phone')}>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="+32 471 12 34 56"
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1E3A5F', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isRenter}
              onChange={e => setIsRenter(e.target.checked)}
            />
            {t('owners.isRenter')}
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              {t('common.cancel')}
            </button>
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
    <p style={{
      margin: '4px 0 0', fontSize: 11, fontWeight: 600,
      color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
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
  padding: '8px 10px',
  border: '1px solid rgba(60,60,67,0.18)',
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
