// ── Insurance page ─────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck }    from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import {
  useInsurancePolicies, useCreateInsurancePolicy, useUpdateInsurancePolicy, useDeleteInsurancePolicy,
  useInsuranceClaims,   useCreateInsuranceClaim,  useUpdateInsuranceClaim,  useDeleteInsuranceClaim,
} from './useInsurance'
import { InsurancePolicyModal } from './InsurancePolicyModal'
import { InsuranceClaimModal }  from './InsuranceClaimModal'
import type { InsurancePolicy, InsuranceClaim } from './insurance.api'
import type { PolicyFormData }  from './InsurancePolicyModal'
import type { ClaimFormData }   from './InsuranceClaimModal'

type Tab = 'policies' | 'claims'

const POLICY_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  fire:      { bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
  liability: { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  omnium:    { bg: 'rgba(139,92,246,0.10)',  color: '#7C3AED' },
  elevator:  { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  legal:     { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
  other:     { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

const CLAIM_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  open:        { bg: 'rgba(59,130,246,0.12)',  color: '#2563EB' },
  in_progress: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  settled:     { bg: 'rgba(34,197,94,0.12)',  color: '#15803D' },
  rejected:    { bg: 'rgba(239,68,68,0.12)',  color: '#DC2626' },
  closed:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
}

export default function InsurancePage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const [tab, setTab] = useState<Tab>('policies')

  const { data: policies = [], isLoading: loadingPolicies } = useInsurancePolicies(building?.id)
  const { data: claims   = [], isLoading: loadingClaims   } = useInsuranceClaims(building?.id)

  const createPolicy = useCreateInsurancePolicy(building?.id ?? '')
  const updatePolicy = useUpdateInsurancePolicy(building?.id ?? '')
  const deletePolicy = useDeleteInsurancePolicy(building?.id ?? '')

  const createClaim = useCreateInsuranceClaim(building?.id ?? '')
  const updateClaim = useUpdateInsuranceClaim(building?.id ?? '')
  const deleteClaim = useDeleteInsuranceClaim(building?.id ?? '')

  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [editPolicy,      setEditPolicy]      = useState<InsurancePolicy | undefined>()
  const [confirmDelPolicy, setConfirmDelPolicy] = useState<InsurancePolicy | null>(null)

  const [showClaimModal,  setShowClaimModal]  = useState(false)
  const [editClaim,       setEditClaim]       = useState<InsuranceClaim | undefined>()
  const [confirmDelClaim, setConfirmDelClaim] = useState<InsuranceClaim | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('insurance.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSavePolicy(data: PolicyFormData) {
    if (editPolicy) {
      await updatePolicy.mutateAsync({ id: editPolicy.id, body: data })
    } else {
      await createPolicy.mutateAsync(data)
    }
    setShowPolicyModal(false)
    setEditPolicy(undefined)
  }

  async function handleSaveClaim(data: ClaimFormData) {
    if (editClaim) {
      await updateClaim.mutateAsync({ id: editClaim.id, body: data })
    } else {
      await createClaim.mutateAsync(data)
    }
    setShowClaimModal(false)
    setEditClaim(undefined)
  }

  const isSavingPolicy = createPolicy.isPending || updatePolicy.isPending
  const isSavingClaim  = createClaim.isPending  || updateClaim.isPending

  const TABS: { key: Tab; label: string }[] = [
    { key: 'policies', label: t('insurance.tabPolicies') },
    { key: 'claims',   label: t('insurance.tabClaims')   },
  ]

  return (
    <Shell>
      <Topbar title={t('insurance.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Tab bar + add button */}
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
          {tab === 'policies' ? (
            <button
              onClick={() => { setEditPolicy(undefined); setShowPolicyModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#1E3A5F', border: 'none',
                borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              {t('insurance.addPolicy')}
            </button>
          ) : (
            <button
              onClick={() => { setEditClaim(undefined); setShowClaimModal(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: '#1E3A5F', border: 'none',
                borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              {t('insurance.addClaim')}
            </button>
          )}
        </div>

        {/* Policies tab */}
        {tab === 'policies' && (
          <>
            {loadingPolicies && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
            {!loadingPolicies && policies.length === 0 && (
              <EmptyState icon={<ShieldCheck size={32} />} message={t('insurance.emptyPolicies')} />
            )}
            {policies.length > 0 && (
              <TableWrap>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[
                      t('insurance.insurerName'), t('insurance.policyType'), t('insurance.policyNumber'),
                      t('insurance.premiumAnnual'), t('insurance.endDate'), t('common.actions'),
                    ].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy, i) => {
                    const c = POLICY_TYPE_COLORS[policy.type] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
                    return (
                      <tr key={policy.id} style={{ borderBottom: i < policies.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none' }}>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{policy.insurer_name}</span></td>
                        <td style={tdStyle}>
                          <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
                            {t(`insurance.type_${policy.type}`)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#6E6E73', fontFamily: 'monospace', fontSize: 12 }}>{policy.policy_number ?? '—'}</td>
                        <td style={tdStyle}>{policy.premium_annual != null ? `€${policy.premium_annual.toFixed(2)}` : '—'}</td>
                        <td style={{ ...tdStyle, color: '#6E6E73' }}>{policy.end_date ? fmtDate(policy.end_date) : '—'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <SmallBtn onClick={() => { setEditPolicy(policy); setShowPolicyModal(true) }} label={t('common.edit')} />
                            <SmallBtn onClick={() => setConfirmDelPolicy(policy)} label={t('common.delete')} danger />
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

        {/* Claims tab */}
        {tab === 'claims' && (
          <>
            {loadingClaims && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
            {!loadingClaims && claims.length === 0 && (
              <EmptyState icon={<ShieldCheck size={32} />} message={t('insurance.emptyClaims')} />
            )}
            {claims.length > 0 && (
              <TableWrap>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[
                      t('common.date'), t('insurance.description'), t('insurance.amountClaimed'),
                      t('insurance.amountReceived'), t('insurance.status'), t('common.actions'),
                    ].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, i) => {
                    const sc = CLAIM_STATUS_COLORS[claim.status] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
                    return (
                      <tr key={claim.id} style={{ borderBottom: i < claims.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none' }}>
                        <td style={{ ...tdStyle, color: '#6E6E73' }}>{fmtDate(claim.date)}</td>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{claim.description}</span></td>
                        <td style={tdStyle}>{claim.amount_claimed != null ? `€${claim.amount_claimed.toFixed(2)}` : '—'}</td>
                        <td style={tdStyle}>{claim.amount_received != null ? `€${claim.amount_received.toFixed(2)}` : '—'}</td>
                        <td style={tdStyle}>
                          <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                            {t(`insurance.claimStatus_${claim.status}`)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <SmallBtn onClick={() => { setEditClaim(claim); setShowClaimModal(true) }} label={t('common.edit')} />
                            <SmallBtn onClick={() => setConfirmDelClaim(claim)} label={t('common.delete')} danger />
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

      {showPolicyModal && (
        <InsurancePolicyModal
          policy={editPolicy}
          onSave={handleSavePolicy}
          onClose={() => { setShowPolicyModal(false); setEditPolicy(undefined) }}
          saving={isSavingPolicy}
        />
      )}

      {showClaimModal && (
        <InsuranceClaimModal
          claim={editClaim}
          policies={policies}
          onSave={handleSaveClaim}
          onClose={() => { setShowClaimModal(false); setEditClaim(undefined) }}
          saving={isSavingClaim}
        />
      )}

      {confirmDelPolicy && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelPolicy.insurer_name}"?`}
          onConfirm={async () => { await deletePolicy.mutateAsync(confirmDelPolicy.id); setConfirmDelPolicy(null) }}
          onCancel={() => setConfirmDelPolicy(null)}
          loading={deletePolicy.isPending}
          t={t}
        />
      )}

      {confirmDelClaim && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelClaim.description}"?`}
          onConfirm={async () => { await deleteClaim.mutateAsync(confirmDelClaim.id); setConfirmDelClaim(null) }}
          onCancel={() => setConfirmDelClaim(null)}
          loading={deleteClaim.isPending}
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
