// ── Contractors page ───────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Wrench }         from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import {
  useContractors, useCreateContractor, useUpdateContractor, useDeleteContractor,
  useSupplierContracts, useCreateSupplierContract, useUpdateSupplierContract, useDeleteSupplierContract,
} from './useContractors'
import { ContractorModal }      from './ContractorModal'
import { SupplierContractModal } from './SupplierContractModal'
import type { Contractor, SupplierContract } from './contractors.api'
import type { ContractorFormData }     from './ContractorModal'
import type { SupplierContractFormData } from './SupplierContractModal'

type Tab = 'contractors' | 'contracts'

const TRADE_COLORS: Record<string, { bg: string; color: string }> = {
  elevator:    { bg: 'rgba(245,158,11,0.10)', color: '#B45309' },
  cleaning:    { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
  electrician: { bg: 'rgba(59,130,246,0.10)', color: '#2563EB' },
  plumber:     { bg: 'rgba(6,182,212,0.10)',  color: '#0E7490' },
  landscaping: { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
  painting:    { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626' },
  hvac:        { bg: 'rgba(139,92,246,0.10)', color: '#7C3AED' },
  locksmith:   { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
  general:     { bg: 'rgba(30,58,95,0.08)',   color: '#1E3A5F' },
  other:       { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

const CONTRACT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:         { bg: 'rgba(34,197,94,0.12)',  color: '#15803D' },
  expiring_soon:  { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  expired:        { bg: 'rgba(239,68,68,0.12)',  color: '#DC2626' },
  cancelled:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
}

export default function ContractorsPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const orgId = building?.organization_id ?? ''

  const [tab, setTab] = useState<Tab>('contractors')

  const { data: contractors = [], isLoading: loadingContractors } = useContractors(orgId)
  const { data: contracts   = [], isLoading: loadingContracts   } = useSupplierContracts(building?.id)

  const createContractor = useCreateContractor(orgId)
  const updateContractor = useUpdateContractor(orgId)
  const deleteContractor = useDeleteContractor(orgId)

  const createContract = useCreateSupplierContract(building?.id ?? '')
  const updateContract = useUpdateSupplierContract(building?.id ?? '')
  const deleteContract = useDeleteSupplierContract(building?.id ?? '')

  const [showContractorModal,   setShowContractorModal]   = useState(false)
  const [editContractor,        setEditContractor]        = useState<Contractor | undefined>()
  const [confirmDelContractor,  setConfirmDelContractor]  = useState<Contractor | null>(null)

  const [showContractModal,     setShowContractModal]     = useState(false)
  const [editContract,          setEditContract]          = useState<SupplierContract | undefined>()
  const [confirmDelContract,    setConfirmDelContract]    = useState<SupplierContract | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('contractors.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSaveContractor(data: ContractorFormData) {
    if (editContractor) {
      await updateContractor.mutateAsync({ id: editContractor.id, body: data })
    } else {
      await createContractor.mutateAsync(data)
    }
    setShowContractorModal(false)
    setEditContractor(undefined)
  }

  async function handleSaveContract(data: SupplierContractFormData) {
    if (editContract) {
      await updateContract.mutateAsync({ id: editContract.id, body: data })
    } else {
      await createContract.mutateAsync(data)
    }
    setShowContractModal(false)
    setEditContract(undefined)
  }

  const isSavingContractor = createContractor.isPending || updateContractor.isPending
  const isSavingContract   = createContract.isPending   || updateContract.isPending

  const TABS: { key: Tab; label: string }[] = [
    { key: 'contractors', label: t('contractors.tabContractors') },
    { key: 'contracts',   label: t('contractors.tabContracts')   },
  ]

  // Build contractor lookup map for contracts tab
  const contractorMap = Object.fromEntries(contractors.map(c => [c.id, c]))

  return (
    <Shell>
      <Topbar title={t('contractors.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {TABS.map(tabDef => (
              <button key={tabDef.key} onClick={() => setTab(tabDef.key)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: tab === tabDef.key ? '#1E3A5F' : '#FFFFFF',
                color:      tab === tabDef.key ? '#FFFFFF' : '#6E6E73',
                boxShadow:  '0 0 0 1px rgba(60,60,67,0.15)',
              }}>
                {tabDef.label}
              </button>
            ))}
          </div>
          {tab === 'contractors' ? (
            <button
              onClick={() => { setEditContractor(undefined); setShowContractorModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#1E3A5F', border: 'none',
                borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              {t('contractors.addContractor')}
            </button>
          ) : (
            <button
              onClick={() => { setEditContract(undefined); setShowContractModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#1E3A5F', border: 'none',
                borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              {t('contractors.addContract')}
            </button>
          )}
        </div>

        {/* Contractors tab */}
        {tab === 'contractors' && (
          <>
            {loadingContractors && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
            {!loadingContractors && contractors.length === 0 && (
              <EmptyState icon={<Wrench size={32} />} message={t('contractors.emptyContractors')} />
            )}
            {contractors.length > 0 && (
              <TableWrap>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[
                      t('contractors.name'), t('contractors.trade'),
                      t('contractors.phone'), t('contractors.email'),
                      t('contractors.rating'), t('common.actions'),
                    ].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {contractors.map((c, i) => {
                    const tc = TRADE_COLORS[c.trade] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
                    return (
                      <tr key={c.id} style={{ borderBottom: i < contractors.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none' }}>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                        <td style={tdStyle}>
                          <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color }}>
                            {t(`contractors.trade_${c.trade}`)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#6E6E73' }}>{c.phone ?? '—'}</td>
                        <td style={{ ...tdStyle, color: '#6E6E73' }}>{c.email ?? '—'}</td>
                        <td style={tdStyle}>{c.rating != null ? '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating) : '—'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <SmallBtn onClick={() => { setEditContractor(c); setShowContractorModal(true) }} label={t('common.edit')} />
                            <SmallBtn onClick={() => setConfirmDelContractor(c)} label={t('common.delete')} danger />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
            )}
          </>
        )}

        {/* Contracts tab */}
        {tab === 'contracts' && (
          <>
            {loadingContracts && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
            {!loadingContracts && contracts.length === 0 && (
              <EmptyState icon={<Wrench size={32} />} message={t('contractors.emptyContracts')} />
            )}
            {contracts.length > 0 && (
              <TableWrap>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[
                      t('contractors.contractor'), t('contractors.contractTitle'),
                      t('contractors.contractStatus'), t('contractors.amountAnnual'),
                      t('contractors.endDate'), t('common.actions'),
                    ].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((ct, i) => {
                    const sc = CONTRACT_STATUS_COLORS[ct.status] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
                    const ctr = contractorMap[ct.contractor_id]
                    return (
                      <tr key={ct.id} style={{ borderBottom: i < contracts.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none' }}>
                        <td style={tdStyle}>{ctr ? ctr.name : ct.contractor_id.slice(0, 8)}</td>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{ct.title}</span></td>
                        <td style={tdStyle}>
                          <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                            {t(`contractors.contractStatus_${ct.status}`)}
                          </span>
                        </td>
                        <td style={tdStyle}>{ct.amount_annual != null ? `€${ct.amount_annual.toFixed(2)}` : '—'}</td>
                        <td style={{ ...tdStyle, color: '#6E6E73' }}>{ct.end_date ? fmtDate(ct.end_date) : '—'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <SmallBtn onClick={() => { setEditContract(ct); setShowContractModal(true) }} label={t('common.edit')} />
                            <SmallBtn onClick={() => setConfirmDelContract(ct)} label={t('common.delete')} danger />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </TableWrap>
            )}
          </>
        )}
      </div>

      {showContractorModal && (
        <ContractorModal
          contractor={editContractor}
          onSave={handleSaveContractor}
          onClose={() => { setShowContractorModal(false); setEditContractor(undefined) }}
          saving={isSavingContractor}
        />
      )}

      {showContractModal && (
        <SupplierContractModal
          contract={editContract}
          contractors={contractors}
          onSave={handleSaveContract}
          onClose={() => { setShowContractModal(false); setEditContract(undefined) }}
          saving={isSavingContract}
        />
      )}

      {confirmDelContractor && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelContractor.name}"?`}
          onConfirm={async () => { await deleteContractor.mutateAsync(confirmDelContractor.id); setConfirmDelContractor(null) }}
          onCancel={() => setConfirmDelContractor(null)}
          loading={deleteContractor.isPending}
          t={t}
        />
      )}

      {confirmDelContract && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelContract.title}"?`}
          onConfirm={async () => { await deleteContract.mutateAsync(confirmDelContract.id); setConfirmDelContract(null) }}
          onCancel={() => setConfirmDelContract(null)}
          loading={deleteContract.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: '10px 16px', textAlign: 'left',
      fontSize: 11, fontWeight: 600, color: '#6E6E73',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      borderBottom: '1px solid rgba(60,60,67,0.08)',
    }}>
      {children}
    </th>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

function SmallBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5, color: danger ? '#DC2626' : '#6E6E73',
      fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: '#FFFFFF', borderRadius: 10,
      border: '1px solid rgba(60,60,67,0.10)',
      color: '#6E6E73', fontSize: 14,
    }}>
      <div style={{ marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
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
      <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1E3A5F' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6, fontSize: 13, color: '#6E6E73', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '7px 16px', background: '#DC2626', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? t('common.loading') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
