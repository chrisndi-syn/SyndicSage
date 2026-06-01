// ── Building add/edit modal ───────────────────────────────────

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Building } from '@syndicsage/types'
import { useCreateBuilding, useUpdateBuilding } from './useBuildings'

interface Props {
  building?: Building     // present = edit mode
  onClose:   () => void
}

export function BuildingModal({ building, onClose }: Props) {
  const { t } = useTranslation()
  const createMutation = useCreateBuilding()
  const updateMutation = useUpdateBuilding()

  const [name,      setName]      = useState(building?.name      ?? '')
  const [address,   setAddress]   = useState(building?.address   ?? '')
  const [city,      setCity]      = useState(building?.city      ?? '')
  const [unitCount, setUnitCount] = useState(building?.unit_count.toString() ?? '')
  const [error,     setError]     = useState('')

  const isEdit    = !!building
  const isPending = createMutation.isPending || updateMutation.isPending

  // Reset error when inputs change
  useEffect(() => { setError('') }, [name, address, city, unitCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const units = parseInt(unitCount, 10)
    if (isNaN(units) || units < 1) {
      setError(t('buildings.unitCountError'))
      return
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id:   building.id,
          body: { name: name.trim(), address: address.trim(), city: city.trim(), unit_count: units },
        })
      } else {
        await createMutation.mutateAsync({
          name:       name.trim(),
          address:    address.trim(),
          city:       city.trim(),
          unit_count: units,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <div style={{
      position:   'fixed', inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display:    'flex', alignItems: 'center', justifyContent: 'center',
      zIndex:     100,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background:   '#FFFFFF',
        borderRadius: 12,
        padding:      24,
        width:        460,
        maxWidth:     'calc(100vw - 48px)',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1E3A5F' }}>
          {isEdit ? t('buildings.edit') : t('buildings.add')}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('buildings.name')} required>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              style={inputStyle}
              placeholder="Résidence Les Acacias"
            />
          </Field>

          <Field label={t('buildings.address')} required>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              style={inputStyle}
              placeholder="Rue de la Loi 16"
            />
          </Field>

          <Field label={t('buildings.city')} required>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              style={inputStyle}
              placeholder="Brussels"
            />
          </Field>

          <Field label={t('buildings.unitCount')} required>
            <input
              type="number"
              min={1}
              value={unitCount}
              onChange={e => setUnitCount(e.target.value)}
              required
              style={inputStyle}
              placeholder="12"
            />
          </Field>

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
  padding:      '8px 10px',
  border:       '1px solid rgba(60,60,67,0.18)',
  borderRadius: 6,
  fontSize:     14,
  color:        '#1E3A5F',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
}

const cancelBtnStyle: React.CSSProperties = {
  padding:      '8px 16px',
  background:   'transparent',
  border:       '1px solid rgba(60,60,67,0.18)',
  borderRadius: 6,
  fontSize:     13,
  color:        '#6E6E73',
  cursor:       'pointer',
}

const submitBtnStyle: React.CSSProperties = {
  padding:      '8px 16px',
  background:   '#1E3A5F',
  border:       'none',
  borderRadius: 6,
  fontSize:     13,
  fontWeight:   600,
  color:        '#FFFFFF',
  cursor:       'pointer',
}
