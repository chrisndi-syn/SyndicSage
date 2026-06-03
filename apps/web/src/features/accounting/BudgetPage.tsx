// ── Budget page ────────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart2 }      from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useBudgetLines, useCreateBudgetLine, useUpdateBudgetLine, useDeleteBudgetLine } from './useBudgetLines'
import { BudgetLineModal }    from './BudgetLineModal'
import type { BudgetLineWithActual } from './budgetLines.api'
import type { BudgetLineFormData }   from './BudgetLineModal'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export default function BudgetPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: lines = [], isLoading, error } = useBudgetLines(building?.id, year)
  const createLine = useCreateBudgetLine(building?.id ?? '', year)
  const updateLine = useUpdateBudgetLine(building?.id ?? '', year)
  const deleteLine = useDeleteBudgetLine(building?.id ?? '', year)

  const [showModal,     setShowModal]     = useState(false)
  const [editLine,      setEditLine]      = useState<BudgetLineWithActual | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<BudgetLineWithActual | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('accounting.budget')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSave(data: BudgetLineFormData) {
    if (editLine) {
      await updateLine.mutateAsync({ id: editLine.id, body: data })
    } else {
      await createLine.mutateAsync({ ...data, year })
    }
    setShowModal(false)
    setEditLine(undefined)
  }

  const isSaving = createLine.isPending || updateLine.isPending

  const totalBudgeted = lines.reduce((s, l) => s + l.amount_budgeted, 0)
  const totalActual   = lines.reduce((s, l) => s + l.amount_actual,   0)
  const totalVariance = totalBudgeted - totalActual

  return (
    <Shell>
      <Topbar title={t('accounting.budget')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
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
          <button
            onClick={() => { setEditLine(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F', border: 'none',
              borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('accounting.addBudgetLine')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && lines.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <BarChart2 size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('accounting.emptyBudget')}</p>
          </div>
        )}

        {lines.length > 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9FB' }}>
                  {[
                    t('accounting.category'), t('accounting.description'),
                    t('accounting.budgeted'), t('accounting.actual'),
                    t('accounting.variance'), t('common.actions'),
                  ].map(h => (
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
                {lines.map((line, i) => (
                  <BudgetRow
                    key={line.id}
                    line={line}
                    isLast={i === lines.length - 1}
                    onEdit={() => { setEditLine(line); setShowModal(true) }}
                    onDelete={() => setConfirmDelete(line)}
                    t={t}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F9F9FB', borderTop: '2px solid rgba(60,60,67,0.10)' }}>
                  <td colSpan={2} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6E6E73' }}>
                    {t('common.total')} ({lines.length})
                  </td>
                  <td style={footerCell}>€{totalBudgeted.toFixed(2)}</td>
                  <td style={footerCell}>€{totalActual.toFixed(2)}</td>
                  <td style={{
                    ...footerCell,
                    color: totalVariance >= 0 ? '#059669' : '#DC2626',
                  }}>
                    {totalVariance >= 0 ? '+' : ''}€{totalVariance.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <BudgetLineModal
          line={editLine}
          year={year}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditLine(undefined) }}
          saving={isSaving}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelete.description}"?`}
          onConfirm={async () => {
            await deleteLine.mutateAsync(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLine.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

function BudgetRow({ line, isLast, onEdit, onDelete, t }: {
  line:    BudgetLineWithActual
  isLast:  boolean
  onEdit:  () => void
  onDelete:() => void
  t:       (key: string) => string
}) {
  const variance      = line.variance
  const pct           = line.amount_budgeted > 0 ? (line.amount_actual / line.amount_budgeted) * 100 : 0
  const overBudget    = line.amount_actual > line.amount_budgeted

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(60,60,67,0.06)' }}>
      <td style={tdStyle}>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
          background: 'rgba(30,58,95,0.07)', color: '#1E3A5F',
        }}>
          {line.category}
        </span>
      </td>
      <td style={tdStyle}>{line.description}</td>
      <td style={tdStyle}>€{line.amount_budgeted.toFixed(2)}</td>
      <td style={tdStyle}>
        <div>
          <span style={{ fontWeight: 500 }}>€{line.amount_actual.toFixed(2)}</span>
          {/* Progress bar */}
          <div style={{ marginTop: 4, height: 4, background: 'rgba(60,60,67,0.1)', borderRadius: 2, width: 80 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(pct, 100)}%`,
              background: overBudget ? '#DC2626' : pct > 80 ? '#F59E0B' : '#059669',
            }} />
          </div>
        </div>
      </td>
      <td style={tdStyle}>
        <span style={{
          fontWeight: 600,
          color: variance >= 0 ? '#059669' : '#DC2626',
        }}>
          {variance >= 0 ? '+' : ''}€{variance.toFixed(2)}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <SmallBtn onClick={onEdit}   label={t('common.edit')} />
          <SmallBtn onClick={onDelete} label={t('common.delete')} danger />
        </div>
      </td>
    </tr>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

const footerCell: React.CSSProperties = {
  padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#1E3A5F',
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
