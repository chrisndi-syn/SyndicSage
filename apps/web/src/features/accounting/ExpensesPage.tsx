// ── Expenses page ──────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Receipt }        from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from './useExpenses'
import { ExpenseModal }   from './ExpenseModal'
import type { Expense }   from './expenses.api'
import type { ExpenseFormData } from './ExpenseModal'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export default function ExpensesPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: expenses = [], isLoading, error } = useExpenses(building?.id, year)
  const createExpense = useCreateExpense(building?.id ?? '', year)
  const updateExpense = useUpdateExpense(building?.id ?? '', year)
  const deleteExpense = useDeleteExpense(building?.id ?? '', year)

  const [showModal,     setShowModal]     = useState(false)
  const [editExpense,   setEditExpense]   = useState<Expense | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('accounting.expenses')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSave(data: ExpenseFormData) {
    if (editExpense) {
      await updateExpense.mutateAsync({ id: editExpense.id, body: data })
    } else {
      await createExpense.mutateAsync(data)
    }
    setShowModal(false)
    setEditExpense(undefined)
  }

  const isSaving = createExpense.isPending || updateExpense.isPending

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Shell>
      <Topbar title={t('accounting.expenses')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Year tabs */}
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
            onClick={() => { setEditExpense(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F', border: 'none',
              borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('accounting.addExpense')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && expenses.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <Receipt size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('accounting.empty')}</p>
          </div>
        )}

        {expenses.length > 0 && (
          <>
            <div style={{
              background: '#FFFFFF', borderRadius: 10,
              border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9F9FB' }}>
                    {[
                      t('common.date'), t('accounting.description'), t('accounting.category'),
                      t('accounting.accountingCode'), t('accounting.supplier'),
                      t('common.amount'), t('common.actions'),
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
                  {expenses.map((expense, i) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      isLast={i === expenses.length - 1}
                      onEdit={() => { setEditExpense(expense); setShowModal(true) }}
                      onDelete={() => setConfirmDelete(expense)}
                      t={t}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F9F9FB', borderTop: '2px solid rgba(60,60,67,0.10)' }}>
                    <td colSpan={5} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6E6E73' }}>
                      {t('common.total')} ({expenses.length} {t('accounting.expensesCount')})
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
                      €{total.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          expense={editExpense}
          year={year}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditExpense(undefined) }}
          saving={isSaving}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDelete.description}"?`}
          onConfirm={async () => {
            await deleteExpense.mutateAsync(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteExpense.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

function ExpenseRow({ expense, isLast, onEdit, onDelete, t }: {
  expense: Expense
  isLast:  boolean
  onEdit:  () => void
  onDelete:() => void
  t:       (key: string) => string
}) {
  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(60,60,67,0.06)' }}>
      <td style={tdStyle}>
        {new Date(expense.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{expense.description}</span>
        {expense.reference && (
          <span style={{ fontSize: 11, color: '#6E6E73', display: 'block' }}>{expense.reference}</span>
        )}
      </td>
      <td style={tdStyle}>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
          background: 'rgba(30,58,95,0.07)', color: '#1E3A5F',
        }}>
          {expense.category}
        </span>
      </td>
      <td style={{ ...tdStyle, fontSize: 11, color: '#6E6E73', fontFamily: 'monospace' }}>
        {expense.accounting_code}
      </td>
      <td style={{ ...tdStyle, color: '#6E6E73' }}>
        {expense.supplier ?? '—'}
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 600 }}>€{expense.amount.toFixed(2)}</span>
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

function SmallBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5,
      color: danger ? '#DC2626' : '#6E6E73',
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
