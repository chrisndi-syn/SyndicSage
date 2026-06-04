// ── Buildings page ────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { Building2 }           from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuildings, useDeleteBuilding } from './useBuildings'
import { BuildingModal }  from './BuildingModal'
import { useBuilding }    from '../../shared/building/BuildingContext'
import type { Building }  from '@syndicsage/types'

export default function BuildingsPage() {
  const { t } = useTranslation()
  const { data: buildings = [], isLoading, error } = useBuildings()
  const deleteBuilding = useDeleteBuilding()
  const { setSelected } = useBuilding()

  const navigate = useNavigate()
  const [searchParams]                    = useSearchParams()
  const [showModal,     setShowModal]     = useState(false)
  const [editBuilding,  setEditBuilding]  = useState<Building | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Building | null>(null)

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setEditBuilding(undefined)
      setShowModal(true)
      navigate('/buildings', { replace: true })
    }
  }, [searchParams, navigate])

  function handleEdit(b: Building) {
    setEditBuilding(b)
    setShowModal(true)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditBuilding(undefined)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await deleteBuilding.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <Shell>
      <Topbar title={t('buildings.title')} />
      <div style={{ padding: 24 }}>

        {/* Add button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={() => { setEditBuilding(undefined); setShowModal(true) }}
            style={{
              display:      'flex', alignItems: 'center', gap: 6,
              padding:      '8px 16px',
              background:   '#1E3A5F',
              border:       'none',
              borderRadius: 7,
              color:        '#FFFFFF',
              fontSize:     13,
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('buildings.add')}
          </button>
        </div>

        {/* State: loading */}
        {isLoading && (
          <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>
        )}

        {/* State: error */}
        {error && (
          <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>
        )}

        {/* State: empty */}
        {!isLoading && !error && buildings.length === 0 && (
          <div style={{
            textAlign:    'center', padding: '48px 24px',
            background:   '#FFFFFF', borderRadius: 10,
            border:       '1px solid rgba(60,60,67,0.10)',
            color:        '#6E6E73', fontSize: 14,
          }}>
            <Building2 size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('buildings.empty')}</p>
          </div>
        )}

        {/* Buildings grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap:                 16,
        }}>
          {buildings.map(building => (
            <BuildingCard
              key={building.id}
              building={building}
              onSelect={() => setSelected(building)}
              onEdit={() => handleEdit(building)}
              onDelete={() => setConfirmDelete(building)}
              onView={() => navigate(`/buildings/${building.id}`)}
              t={t}
            />
          ))}
        </div>

      </div>

      {/* Add/edit modal */}
      {showModal && (
        <BuildingModal
          building={editBuilding}
          onClose={handleCloseModal}
        />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <ConfirmDialog
          message={t('buildings.deleteConfirm', { name: confirmDelete.name })}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteBuilding.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

// ── Building card ──────────────────────────────────────────────

function BuildingCard({ building, onSelect, onEdit, onDelete, onView, t }: {
  building: Building
  onSelect: () => void
  onEdit:   () => void
  onDelete: () => void
  onView:   () => void
  t:        (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        background:   '#FFFFFF',
        borderRadius: 10,
        border:       '1px solid rgba(60,60,67,0.10)',
        padding:      20,
        cursor:       'pointer',
        transition:   'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(30,58,95,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: 15, fontWeight: 600, color: '#1E3A5F',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {building.name}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6E6E73' }}>
            {building.address}, {building.city}
          </p>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
          <ActionBtn onClick={e => { e.stopPropagation(); onView() }} label={t('buildings.view')} />
          <ActionBtn onClick={e => { e.stopPropagation(); onEdit() }} label={t('common.edit')} />
          <ActionBtn onClick={e => { e.stopPropagation(); onDelete() }} label={t('common.delete')} danger />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        <Stat label={t('buildings.unitCount')} value={building.unit_count.toString()} />
        {building.vme_number && (
          <Stat label="KBO" value={building.vme_number} />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: '#6E6E73' }}>{label}</p>
      <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{value}</p>
    </div>
  )
}

function ActionBtn({ onClick, label, danger }: {
  onClick: (e: React.MouseEvent) => void
  label:   string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding:      '4px 10px',
        background:   'transparent',
        border:       `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
        borderRadius: 5,
        color:        danger ? '#DC2626' : '#6E6E73',
        fontSize:     12,
        cursor:       'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ── Confirm dialog ─────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, loading, t }: {
  message:   string
  onConfirm: () => void
  onCancel:  () => void
  loading:   boolean
  t:         (key: string) => string
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12,
        padding: 24, width: 380, maxWidth: 'calc(100vw - 48px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1E3A5F', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', background: 'transparent',
            border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6,
            fontSize: 13, color: '#6E6E73', cursor: 'pointer',
          }}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '7px 16px', background: '#DC2626',
            border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? t('common.loading') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
