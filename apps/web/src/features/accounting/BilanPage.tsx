// ── Bilan (balance sheet) page ─────────────────────────────────

import { useState }          from 'react'
import { useTranslation }    from 'react-i18next'
import { Shell }             from '../../components/layout/Shell'
import { Topbar }            from '../../components/layout/Topbar'
import { useBuilding }       from '../../shared/building/BuildingContext'
import { useBilan, useUpdateBankBalances } from './useBilan'
import type { UpdateBankBody } from './bilan.api'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export default function BilanPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const [year, setYear] = useState(new Date().getFullYear())
  const [editingBank, setEditingBank] = useState(false)
  const [bankForm, setBankForm] = useState<UpdateBankBody>({})

  const { data: bilan, isLoading, error } = useBilan(building?.id, year)
  const updateBank = useUpdateBankBalances(building?.id ?? '', year)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('accounting.bilan')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  function openEditBank() {
    setBankForm({
      bank_vue:             bilan?.bank_vue ?? 0,
      bank_epargne:         bilan?.bank_epargne ?? 0,
      reserve_fund_balance: bilan?.reserve_fund_balance ?? 0,
    })
    setEditingBank(true)
  }

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault()
    await updateBank.mutateAsync(bankForm)
    setEditingBank(false)
  }

  return (
    <Shell>
      <Topbar title={t('accounting.bilan')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Year tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none',
              background: year === y ? '#1E3A5F' : '#FFFFFF',
              color:      year === y ? '#FFFFFF' : '#6E6E73',
              boxShadow:  '0 0 0 1px rgba(60,60,67,0.15)',
            }}>
              {y}
            </button>
          ))}
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {bilan && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* ACTIF */}
            <BilanCard title={t('accounting.actif')}>
              <BilanRow label={t('accounting.bankVue')}          value={bilan.bank_vue} />
              <BilanRow label={t('accounting.bankEpargne')}      value={bilan.bank_epargne} />
              <BilanRow label={t('accounting.totalReceivables')} value={bilan.total_receivables} />
              <BilanDivider />
              <BilanRow label={t('accounting.totalActif')} value={bilan.total_actif} bold />
              <div style={{ marginTop: 10 }}>
                <button onClick={openEditBank} style={{
                  padding: '6px 12px', background: 'transparent',
                  border: '1px solid rgba(60,60,67,0.2)', borderRadius: 6,
                  fontSize: 12, color: '#6E6E73', cursor: 'pointer',
                }}>
                  {t('accounting.updateBankBalances')}
                </button>
              </div>
            </BilanCard>

            {/* PASSIF */}
            <BilanCard title={t('accounting.passif')}>
              <BilanRow label={t('accounting.reserveFund')}  value={bilan.reserve_fund_balance} />
              <BilanRow label={t('accounting.totalIncome')}  value={bilan.total_income} />
              <BilanRow label={t('accounting.totalExpenses')} value={bilan.total_expenses} negate />
              <BilanDivider />
              <BilanRow
                label={t('accounting.netResult')}
                value={bilan.net_result}
                bold
                highlight={bilan.net_result >= 0 ? 'positive' : 'negative'}
              />
              <BilanDivider />
              <BilanRow label={t('accounting.totalPassif')} value={bilan.total_passif} bold />
            </BilanCard>

            {/* Expenses by code */}
            {Object.keys(bilan.expenses_by_code).length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <BilanCard title={t('accounting.expensesByCode')}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {Object.entries(bilan.expenses_by_code).map(([code, amount]) => (
                      <div key={code} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'rgba(30,58,95,0.04)',
                        borderRadius: 7, fontSize: 13,
                      }}>
                        <span style={{ fontFamily: 'monospace', color: '#6E6E73' }}>{code}</span>
                        <span style={{ fontWeight: 600, color: '#1E3A5F' }}>€{(amount as number).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </BilanCard>
              </div>
            )}
          </div>
        )}
      </div>

      {editingBank && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={() => setEditingBank(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
              {t('accounting.updateBankBalances')}
            </h2>
            <form onSubmit={handleSaveBank}>
              {([
                ['bank_vue',             t('accounting.bankVue')],
                ['bank_epargne',         t('accounting.bankEpargne')],
                ['reserve_fund_balance', t('accounting.reserveFund')],
              ] as [keyof UpdateBankBody, string][]).map(([key, label]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }}>
                    {label} (€)
                  </label>
                  <input
                    type="number" step="0.01"
                    value={(bankForm[key] as number | undefined) ?? ''}
                    onChange={e => setBankForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setEditingBank(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={updateBank.isPending} style={{ padding: '8px 16px', borderRadius: 7, background: '#1E3A5F', color: '#fff', border: 'none', cursor: updateBank.isPending ? 'not-allowed' : 'pointer', fontSize: 13, opacity: updateBank.isPending ? 0.7 : 1 }}>
                  {updateBank.isPending ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function BilanCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10,
      border: '1px solid rgba(60,60,67,0.10)', padding: 20,
    }}>
      <h3 style={{
        fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 600,
        color: '#1E3A5F', margin: '0 0 16px',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function BilanRow({ label, value, bold, negate, highlight }: {
  label:     string
  value:     number
  bold?:     boolean
  negate?:   boolean
  highlight?: 'positive' | 'negative'
}) {
  const color = highlight === 'positive' ? '#059669' : highlight === 'negative' ? '#DC2626' : (bold ? '#1E3A5F' : '#374151')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: 13, color: '#6E6E73', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color }}>
        {negate ? '− ' : ''}€{Math.abs(value).toFixed(2)}
      </span>
    </div>
  )
}

function BilanDivider() {
  return <div style={{ height: 1, background: 'rgba(60,60,67,0.08)', margin: '8px 0' }} />
}
