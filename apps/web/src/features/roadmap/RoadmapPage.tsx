// ── Roadmap page — kanban view ──────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Map, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useRoadmap, useCreateRoadmapItem, useUpdateRoadmapItem, useDeleteRoadmapItem } from './useRoadmap'
import type { RoadmapItem } from './roadmap.api'

type Status   = 'planned' | 'in_progress' | 'done'
type Priority = 'low' | 'medium' | 'high'

const PRIORITY_COLORS: Record<Priority, { bg: string; color: string }> = {
  high:   { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626' },
  medium: { bg: 'rgba(245,158,11,0.10)', color: '#B45309' },
  low:    { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

const COLUMNS: { key: Status; labelKey: string }[] = [
  { key: 'planned',     labelKey: 'roadmap.planned'    },
  { key: 'in_progress', labelKey: 'roadmap.inProgress' },
  { key: 'done',        labelKey: 'roadmap.done'       },
]

interface FormState {
  title:          string
  description:    string
  status:         Status
  priority:       Priority
  estimated_cost: string
  target_date:    string
}

const EMPTY_FORM: FormState = {
  title: '', description: '', status: 'planned', priority: 'medium',
  estimated_cost: '', target_date: '',
}

export default function RoadmapPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()

  const { data: items = [], isLoading } = useRoadmap(building?.id)
  const createItem = useCreateRoadmapItem(building?.id ?? '')
  const updateItem = useUpdateRoadmapItem(building?.id ?? '')
  const deleteItem = useDeleteRoadmapItem(building?.id ?? '')

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<RoadmapItem | undefined>()
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('roadmap.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  function openCreate(defaultStatus: Status = 'planned') {
    setEditing(undefined)
    setForm({ ...EMPTY_FORM, status: defaultStatus })
    setShowModal(true)
  }

  function openEdit(item: RoadmapItem) {
    setEditing(item)
    setForm({
      title:          item.title,
      description:    item.description ?? '',
      status:         item.status,
      priority:       item.priority,
      estimated_cost: item.estimated_cost != null ? String(item.estimated_cost) : '',
      target_date:    item.target_date ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    const body = {
      title:          form.title.trim(),
      description:    form.description.trim() || undefined,
      status:         form.status,
      priority:       form.priority,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      target_date:    form.target_date || undefined,
    }
    if (editing) {
      await updateItem.mutateAsync({ id: editing.id, body })
    } else {
      await createItem.mutateAsync(body)
    }
    setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('roadmap.deleteConfirm'))) return
    await deleteItem.mutateAsync(id)
  }

  const isSaving = createItem.isPending || updateItem.isPending

  const totalCost = items
    .filter(i => i.status !== 'done')
    .reduce((s, i) => s + (i.estimated_cost ?? 0), 0)

  return (
    <Shell>
      <Topbar title={t('roadmap.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#6E6E73' }}>
            {t('roadmap.estimatedTotal', { amount: totalCost.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' }) })}
          </div>
          <button
            onClick={() => openCreate()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: '#1E3A5F', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <Plus size={15} /> {t('roadmap.add')}
          </button>
        </div>

        {isLoading ? (
          <div style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
        ) : (
          /* Kanban columns */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {COLUMNS.map(col => {
              const colItems = items.filter(i => i.status === col.key)
              return (
                <div key={col.key} style={{
                  background: '#F5F5F7', borderRadius: 12, padding: 12, minHeight: 200,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t(col.labelKey)} <span style={{ color: '#6E6E73', fontWeight: 400 }}>({colItems.length})</span>
                    </span>
                    <button
                      onClick={() => openCreate(col.key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73', padding: 2 }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {colItems.map(item => (
                      <div key={item.id} style={{
                        background: '#fff', borderRadius: 10,
                        padding: '10px 12px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 500, fontSize: 13, color: '#1C1C1E', lineHeight: 1.35 }}>{item.title}</div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73', padding: 2 }}><Pencil size={12} /></button>
                            <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 2 }}><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {item.description && (
                          <div style={{ fontSize: 12, color: '#6E6E73', marginBottom: 8, lineHeight: 1.4 }}>{item.description}</div>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 99,
                            ...PRIORITY_COLORS[item.priority],
                          }}>
                            {t(`roadmap.priority_${item.priority}`)}
                          </span>
                          {item.estimated_cost != null && (
                            <span style={{ fontSize: 11, color: '#6E6E73' }}>
                              {item.estimated_cost.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                            </span>
                          )}
                          {item.target_date && (
                            <span style={{ fontSize: 11, color: '#6E6E73' }}>{item.target_date}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {colItems.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>
                        {t('roadmap.empty')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>
                {editing ? t('roadmap.edit') : t('roadmap.add')}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#6E6E73" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.itemTitle')} *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.description')}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.status')}</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, background: '#fff' }}>
                    <option value="planned">{t('roadmap.planned')}</option>
                    <option value="in_progress">{t('roadmap.inProgress')}</option>
                    <option value="done">{t('roadmap.done')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.priority')}</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, background: '#fff' }}>
                    <option value="high">{t('roadmap.priority_high')}</option>
                    <option value="medium">{t('roadmap.priority_medium')}</option>
                    <option value="low">{t('roadmap.priority_low')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.estimatedCost')}</label>
                  <input type="number" min="0" value={form.estimated_cost} onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value }))}
                    placeholder="0"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('roadmap.targetDate')}</label>
                  <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D1D6', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={isSaving || !form.title.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: isSaving || !form.title.trim() ? 0.6 : 1 }}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
