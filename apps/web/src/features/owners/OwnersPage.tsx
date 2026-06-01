// ── Owners page ───────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Users }          from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useOwners, useDeleteOwner } from './useOwners'
import { OwnerModal }     from './OwnerModal'
import type { OwnerWithUnit } from './owners.api'

export default function OwnersPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const { data: owners = [], isLoading, error } = useOwners(building?.id)
  const deleteOwner = useDeleteOwner(building?.id ?? '')

  const [showModal,     setShowModal]     = useState(false)
  const [editOwner,     setEditOwner]     = useState<OwnerWithUnit | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<OwnerWithUnit | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('owners.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>
          {t('common.selectBuilding')}
        </div>
      </Shell>
    )
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await deleteOwner.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
  }

  return (
    <Shell>
      <Topbar title={t('owners.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Add button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={() => { setEditOwner(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F',
              border: 'none', borderRadius: 7,
              color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('owners.add')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error    && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && owners.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <Users size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('owners.empty')}</p>
          </div>
        )}

        {/* Owners table */}
        {owners.length > 0 && (
          <>
            <div style={{
              background: '#FFFFFF', borderRadius: 10,
              border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[t('owners.unit'), t('owners.fullName'), t('common.email'), t('common.phone'), t('owners.language'), t('owners.iban'), t('common.status'), t('common.actions')].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 600, color: '#6E6E73',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(60,60,67,0.08)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner, i) => (
                    <tr key={owner.id} style={{
                      borderBottom: i < owners.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none',
                    }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: '#1E3A5F' }}>
                          {owner.units.unit_number}
                        </span>
                        <span style={{ fontSize: 11, color: '#6E6E73', marginLeft: 6 }}>
                          {t(`owners.unitTypes.${owner.units.unit_type}`)}
                        </span>
                      </td>
                      <td style={tdStyle}>{owner.full_name}</td>
                      <td style={tdStyle}>
                        {owner.has_no_email
                          ? <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>{t('owners.hasNoEmail')}</span>
                          : owner.email}
                      </td>
                      <td style={tdStyle}>{owner.phone ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: '2px 7px', borderRadius: 4,
                          background: '#F1F5F9', color: '#475569',
                          textTransform: 'uppercase',
                        }}>
                          {owner.preferred_language ?? 'fr'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {owner.bank_account
                          ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{truncateIban(owner.bank_account)}</span>
                          : <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 4,
                          background: owner.is_renter ? '#FEF9C3' : '#EFF6FF',
                          color: owner.is_renter ? '#854D0E' : '#1E40AF',
                        }}>
                          {owner.is_renter ? t('owners.renter') : t('owners.owner')}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <SmallBtn onClick={() => { setEditOwner(owner); setShowModal(true) }} label={t('common.edit')} />
                          <SmallBtn onClick={() => setConfirmDelete(owner)} label={t('common.delete')} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quotité / tantièmes footer */}
            <QuotiteFooter owners={owners} t={t} />
          </>
        )}
      </div>

      {showModal && building && (
        <OwnerModal
          buildingId={building.id}
          owner={editOwner}
          onClose={() => { setShowModal(false); setEditOwner(undefined) }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('common.delete')} ${confirmDelete.full_name}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteOwner.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

function truncateIban(iban: string): string {
  const clean = iban.replace(/\s/g, '')
  if (clean.length <= 8) return iban
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)}…${clean.slice(-4)}`
}

function QuotiteFooter({ owners, t }: {
  owners: OwnerWithUnit[]
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const total = owners.reduce((sum, o) => sum + (o.units.ownership_share ?? 0), 0)
  const rounded = Math.round(total * 10) / 10
  const diff = Math.round((rounded - 1000) * 10) / 10
  const isOk = Math.abs(diff) < 0.1

  return (
    <div style={{
      marginTop: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      background: '#FFFFFF', borderRadius: 8,
      border: `1px solid ${isOk ? 'rgba(60,60,67,0.10)' : 'rgba(220,38,38,0.20)'}`,
    }}>
      <span style={{ fontSize: 12, color: '#6E6E73' }}>
        {t('owners.totalShare')} — {t('owners.shareWarning')}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: isOk ? '#16A34A' : '#DC2626',
      }}>
        {rounded}‰
        {!isOk && (
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
            {diff > 0
              ? t('owners.shareOver',  { gap: diff })
              : t('owners.shareMissing', { gap: Math.abs(diff) })}
          </span>
        )}
      </span>
    </div>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

function SmallBtn({ onClick, label, danger }: {
  onClick: () => void; label: string; danger?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5, color: danger ? '#DC2626' : '#6E6E73',
      fontSize: 12, cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, loading, t }: {
  message: string; onConfirm: () => void; onCancel: () => void;
  loading: boolean; t: (key: string) => string
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 12, padding: 24,
        width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1E3A5F' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', background: 'transparent',
            border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6,
            fontSize: 13, color: '#6E6E73', cursor: 'pointer',
          }}>{t('common.cancel')}</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '7px 16px', background: '#DC2626', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#FFFFFF',
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}>{loading ? t('common.loading') : t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}
