// ── Maintenance page ─────────────────────────────────────────
// Recurring tasks & schedules — inspired by V4

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Wrench, Plus, X, CheckCheck, Pencil, Trash2 } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import {
  useMaintenance, useCreateTask, useUpdateTask, useMarkDone, useDeleteTask,
  type MaintenanceTask,
} from './useMaintenance'
import { TASK_CATEGORIES, TASK_FREQUENCIES, TASK_TEMPLATES, type TaskBody } from './maintenance.api'

// ── Constants ─────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: 'rgba(220,38,38,0.10)',  color: '#DC2626' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  low:    { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  heating:     { bg: '#fee2e2', color: '#991b1b' },
  gas:         { bg: '#fef9c3', color: '#854d0e' },
  elevator:    { bg: '#dbeafe', color: '#1d4ed8' },
  fire_safety: { bg: '#fee2e2', color: '#dc2626' },
  electrical:  { bg: '#fef3c7', color: '#92400e' },
  cleaning:    { bg: '#d1fae5', color: '#065f46' },
  structural:  { bg: '#e0f2fe', color: '#0369a1' },
  pest_control:{ bg: '#ede9fe', color: '#5b21b6' },
  plumbing:    { bg: '#f0fdf4', color: '#166534' },
  other:       { bg: '#f3f4f6', color: '#374151' },
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function statusPill(days: number | null) {
  if (days === null) return null
  if (days <= 0)  return { label: 'overdue',  bg: 'rgba(220,38,38,0.10)',  color: '#DC2626' }
  if (days <= 14) return { label: 'due_soon', bg: 'rgba(245,158,11,0.12)', color: '#B45309' }
  return                 { label: 'upcoming', bg: 'rgba(34,197,94,0.10)',  color: '#15803D' }
}

// ── Modal form ────────────────────────────────────────────────

interface FormState {
  title: string; description: string; category: string; priority: string
  frequency: string; next_due_date: string; remind_days_before: number
  supplier_name: string; notes: string
}

const EMPTY_FORM: FormState = {
  title: '', description: '', category: 'other', priority: 'medium',
  frequency: 'annual', next_due_date: new Date().toISOString().slice(0, 10),
  remind_days_before: 14, supplier_name: '', notes: '',
}

const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }
const INPUT: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }
const SELECT: React.CSSProperties = { ...INPUT, background: '#fff' }

// ── Main page ─────────────────────────────────────────────────

export default function MaintenancePage() {
  const { t }                      = useTranslation()
  const { selected: building }     = useBuilding()
  const { data: tasks = [], isLoading } = useMaintenance(building?.id)

  const createTask = useCreateTask(building?.id ?? '')
  const updateTask = useUpdateTask(building?.id ?? '')
  const markDone   = useMarkDone(building?.id ?? '')
  const deleteTask = useDeleteTask(building?.id ?? '')

  const [showModal, setShowModal]   = useState(false)
  const [editing,   setEditing]     = useState<MaintenanceTask | undefined>()
  const [form,      setForm]        = useState<FormState>(EMPTY_FORM)
  const [filter,    setFilter]      = useState<'all' | 'overdue' | 'due_soon' | 'upcoming'>('all')

  if (!building) {
    return (
      <Shell><Topbar title={t('maintenance.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  // Stats
  const overdue  = tasks.filter(t => { const d = daysUntil(t.next_due_date); return d !== null && d <= 0 })
  const dueSoon  = tasks.filter(t => { const d = daysUntil(t.next_due_date); return d !== null && d > 0 && d <= 14 })
  const upcoming = tasks.filter(t => { const d = daysUntil(t.next_due_date); return d === null || d > 14 })

  const visible = filter === 'overdue'  ? overdue
                : filter === 'due_soon' ? dueSoon
                : filter === 'upcoming' ? upcoming
                : tasks

  function openCreate() {
    setEditing(undefined)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(task: MaintenanceTask) {
    setEditing(task)
    setForm({
      title:              task.title,
      description:        task.description ?? '',
      category:           task.category,
      priority:           task.priority,
      frequency:          task.frequency,
      next_due_date:      task.next_due_date ?? new Date().toISOString().slice(0, 10),
      remind_days_before: task.remind_days_before,
      supplier_name:      task.supplier_name ?? '',
      notes:              task.notes ?? '',
    })
    setShowModal(true)
  }

  function applyTemplate(tpl: typeof TASK_TEMPLATES[number]) {
    setForm(f => ({
      ...f,
      title:       t('maintenance.' + tpl.tplKey),
      description: tpl.description ?? '',
      category:    tpl.category ?? 'other',
      frequency:   tpl.frequency ?? 'annual',
      priority:    tpl.priority ?? 'medium',
    }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    const body: TaskBody = {
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      category:           form.category,
      priority:           form.priority as TaskBody['priority'],
      frequency:          form.frequency,
      next_due_date:      form.next_due_date || null,
      remind_days_before: form.remind_days_before,
      supplier_name:      form.supplier_name.trim() || null,
      notes:              form.notes.trim() || null,
    }
    if (editing) {
      await updateTask.mutateAsync({ id: editing.id, body })
    } else {
      await createTask.mutateAsync(body)
    }
    setShowModal(false)
  }

  async function handleDone(task: MaintenanceTask) {
    await markDone.mutateAsync(task.id)
  }

  async function handleDelete(task: MaintenanceTask) {
    if (!confirm(t('maintenance.deleteConfirm'))) return
    await deleteTask.mutateAsync(task.id)
  }

  const isSaving = createTask.isPending || updateTask.isPending

  const CHIP = (label: string, active: boolean, count: number, onClick: () => void, accent?: string) => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
        background: active ? '#1E3A5F' : '#F2F2F7',
        color:      active ? '#fff'    : accent ?? '#6E6E73',
        transition: 'background 0.12s',
      }}
    >
      {label} {count > 0 && `(${count})`}
    </button>
  )

  return (
    <Shell>
      <Topbar title={t('maintenance.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {CHIP(t('common.all'), filter === 'all',       tasks.length,    () => setFilter('all'))}
            {CHIP(t('maintenance.overdue'),   filter === 'overdue',   overdue.length,  () => setFilter('overdue'),  '#DC2626')}
            {CHIP(t('maintenance.dueSoon'),   filter === 'due_soon',  dueSoon.length,  () => setFilter('due_soon'), '#B45309')}
            {CHIP(t('maintenance.upcoming'),  filter === 'upcoming',  upcoming.length, () => setFilter('upcoming'), '#15803D')}
          </div>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}
          >
            <Plus size={15} /> {t('maintenance.addTask')}
          </button>
        </div>

        {/* Task list */}
        {isLoading ? (
          <div style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
            <Wrench size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>{t('maintenance.empty')}</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {[t('common.name'), t('maintenance.priority'), t('common.status'), t('maintenance.category'),
                      t('maintenance.frequency'), t('maintenance.nextDue'), t('maintenance.lastDone'),
                      t('maintenance.supplier'), t('common.actions')].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((task, i) => {
                    const days   = daysUntil(task.next_due_date)
                    const status = statusPill(days)
                    const priSt  = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE['medium']!
                    const catSt  = CATEGORY_STYLE[task.category] ?? CATEGORY_STYLE['other']!
                    return (
                      <tr key={task.id} style={{ borderBottom: i < visible.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, ...priSt }}>
                            {t(`maintenance.priority_${task.priority}`)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {status && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: status.bg, color: status.color }}>
                              {t(`maintenance.status_${status.label}`)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 99, ...catSt }}>
                            {t(`maintenance.cat_${task.category}`)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap' }}>
                          {t(`maintenance.freq_${task.frequency}`)}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap', fontWeight: days !== null && days <= 0 ? 600 : 400, color: days !== null && days <= 0 ? '#DC2626' : '#1C1C1E' }}>
                          {task.next_due_date
                            ? new Date(task.next_due_date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                          {task.last_done_date
                            ? new Date(task.last_done_date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#6E6E73', whiteSpace: 'nowrap' }}>
                          {task.supplier_name ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              onClick={() => handleDone(task)}
                              disabled={markDone.isPending}
                              title={t('maintenance.markDone')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: 'none', background: 'rgba(21,128,61,0.10)', color: '#15803D', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              <CheckCheck size={12} /> {t('maintenance.done')}
                            </button>
                            <button
                              onClick={() => openEdit(task)}
                              title={t('common.edit')}
                              style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid #D1D1D6', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Pencil size={12} color="#6E6E73" />
                            </button>
                            <button
                              onClick={() => handleDelete(task)}
                              title={t('common.delete')}
                              style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={12} color="#DC2626" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>
                {editing ? t('maintenance.editTask') : t('maintenance.addTask')}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#6E6E73" />
              </button>
            </div>

            {/* Quick templates — only on create */}
            {!editing && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {t('maintenance.quickTemplates')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TASK_TEMPLATES.map((tpl, i) => (
                    <button key={i} onClick={() => applyTemplate(tpl)}
                      style={{ padding: '4px 10px', border: '1.5px solid #E5E7EB', borderRadius: 20, background: '#fff', fontSize: 11, color: '#6E6E73', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#1E3A5F')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                    >
                      {t('maintenance.' + tpl.tplKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={LABEL}>{t('common.name')} *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('maintenance.titlePlaceholder')} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>{t('maintenance.description')}</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('maintenance.descriptionPlaceholder')} style={INPUT} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>{t('maintenance.category')}</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={SELECT}>
                    {TASK_CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(`maintenance.cat_${c}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>{t('maintenance.priority')}</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={SELECT}>
                    {['high', 'medium', 'low'].map(p => (
                      <option key={p} value={p}>{t(`maintenance.priority_${p}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>{t('maintenance.frequency')}</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={SELECT}>
                    {TASK_FREQUENCIES.map(fr => (
                      <option key={fr} value={fr}>{t(`maintenance.freq_${fr}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>{t('maintenance.remindBefore')}</label>
                  <input type="number" min={0} max={365} value={form.remind_days_before}
                    onChange={e => setForm(f => ({ ...f, remind_days_before: parseInt(e.target.value) || 14 }))} style={INPUT} />
                </div>
              </div>
              <div>
                <label style={LABEL}>{t('maintenance.nextDue')} *</label>
                <input type="date" value={form.next_due_date} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>{t('maintenance.supplier')}</label>
                <input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                  placeholder={t('maintenance.supplierPlaceholder')} style={INPUT} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D1D6', background: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={isSaving || !form.title.trim() || !form.next_due_date}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: isSaving || !form.title.trim() || !form.next_due_date ? 0.6 : 1 }}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
