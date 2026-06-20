// ── Meetings page ───────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { CalendarDays, Plus, X, ChevronRight, Play, CheckCircle, Clock, Sparkles, FileText, Copy, Check } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useAuth }        from '../../shared/auth/AuthContext'
import { useAiSage }      from '../ai/AiSageContext'
import {
  useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useStartMeeting,
} from './useMeetings'
import type { Meeting } from './meetings.api'

type Tab = 'upcoming' | 'past'

const STATUS_ICONS: Record<string, React.ReactNode> = {
  scheduled:   <Clock size={14} color="#2563EB" />,
  in_progress: <Play  size={14} color="#B45309" />,
  completed:   <CheckCircle size={14} color="#15803D" />,
}
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  scheduled:   { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  in_progress: { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  completed:   { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
}

// ── Lifecycle stepper ─────────────────────────────────────────
type LifecycleStage = { key: string; done: boolean; active: boolean }

function getLifecycleStages(m: Meeting, t: (k: string) => string): LifecycleStage[] {
  const isHeld      = m.status === 'in_progress' || m.status === 'completed'
  const hasVotes    = false // votes are loaded separately; stepper is indicative
  const hasMinutes  = Boolean(m.minutes)
  return [
    { key: t('meetings.lifecycle.prepare'),  done: true,             active: m.status === 'scheduled' && !m.agenda },
    { key: t('meetings.lifecycle.agenda'),   done: Boolean(m.agenda), active: m.status === 'scheduled' && !m.agenda },
    { key: t('meetings.lifecycle.hold'),     done: isHeld,            active: m.status === 'scheduled' && Boolean(m.agenda) },
    { key: t('meetings.lifecycle.vote'),     done: isHeld,            active: m.status === 'in_progress' },
    { key: t('meetings.lifecycle.minutes'),  done: hasMinutes,        active: m.status === 'completed' && !hasMinutes },
  ]
}

function LifecycleStepper({ meeting, t }: { meeting: Meeting; t: (k: string) => string }) {
  const stages = getLifecycleStages(meeting, t)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
      {stages.map((stage, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: stage.done ? '#16A34A' : stage.active ? '#F59E0B' : '#D1D1D6',
            }} />
            <span style={{
              fontSize: 11,
              color: stage.done ? '#16A34A' : stage.active ? '#B45309' : '#9CA3AF',
              fontWeight: stage.active ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>
              {stage.key}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div style={{ width: 16, height: 1, background: stage.done ? '#16A34A' : '#D1D1D6', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Minutes modal ─────────────────────────────────────────────
function MinutesModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!meeting.minutes) return
    navigator.clipboard.writeText(meeting.minutes).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t('meetings.minutesTitle')}</div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>{meeting.title}</h2>
            <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 3 }}>
              {new Date(meeting.date).toLocaleString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D1D6', background: '#fff', fontSize: 12, cursor: 'pointer', color: copied ? '#15803D' : '#1C1C1E' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t('meetings.minutesCopied') : t('meetings.minutesCopy')}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} color="#6E6E73" />
            </button>
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '16px 24px 24px', overflowY: 'auto', flex: 1 }}>
          <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, color: '#3C3C43', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {meeting.minutes}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── Form state ────────────────────────────────────────────────

interface FormState { title: string; date: string; agenda: string }
const EMPTY_FORM: FormState = { title: '', date: '', agenda: '' }

export default function MeetingsPage() {
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const { session }  = useAuth()
  const { selected: building } = useBuilding()

  const { openWithPrompt } = useAiSage()
  const { data: meetings = [], isLoading } = useMeetings(building?.id)
  const createMeeting = useCreateMeeting(building?.id ?? '')
  const updateMeeting = useUpdateMeeting(building?.id ?? '')
  const deleteMeeting = useDeleteMeeting(building?.id ?? '')
  const startMeeting  = useStartMeeting(building?.id ?? '')

  const [tab,             setTab]             = useState<Tab>('upcoming')
  const [showModal,       setShowModal]       = useState(false)
  const [editing,         setEditing]         = useState<Meeting | undefined>()
  const [form,            setForm]            = useState<FormState>(EMPTY_FORM)
  const [minutesMeeting,  setMinutesMeeting]  = useState<Meeting | undefined>()

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('meetings.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  const upcoming = meetings.filter(m => m.status !== 'completed')
  const past     = meetings.filter(m => m.status === 'completed')
  const visible  = tab === 'upcoming' ? upcoming : past

  function openCreate() {
    setEditing(undefined)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(m: Meeting) {
    setEditing(m)
    setForm({ title: m.title, date: m.date.slice(0, 16), agenda: m.agenda ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return
    const body = {
      title:  form.title.trim(),
      date:   new Date(form.date).toISOString(),
      agenda: form.agenda.trim() || undefined,
    }
    if (editing) {
      await updateMeeting.mutateAsync({ id: editing.id, body })
    } else {
      await createMeeting.mutateAsync(body)
    }
    setShowModal(false)
  }

  async function handleStart(m: Meeting) {
    if (!session) {
      navigate(`/meetings/${m.id}/room`)
      return
    }
    const result = await startMeeting.mutateAsync(m.id)
    navigate(`/meetings/${m.id}/room`, { state: { roomUrl: result.room_url, token: result.token } })
  }

  async function handleDelete(m: Meeting) {
    if (!confirm(t('meetings.deleteConfirm'))) return
    await deleteMeeting.mutateAsync(m.id)
  }

  function handleGenerateMinutes(m: Meeting) {
    openWithPrompt(
      `Write professional meeting minutes (procès-verbal) for this Belgian VME general assembly.\n\n` +
      `Meeting: "${m.title}"\n` +
      `Date: ${new Date(m.date).toLocaleString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n` +
      `Building: "${building?.name ?? ''}"\n\n` +
      (m.agenda ? `Agenda:\n${m.agenda}\n\n` : '') +
      (m.transcript ? `Transcript:\n${m.transcript}\n\n` : '') +
      `Format as a proper Belgian VME procès-verbal with: attendees section, agenda items with decisions, vote results (if any), and closing.`
    )
  }

  const isSaving = createMeeting.isPending || updateMeeting.isPending

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: active ? '#1E3A5F' : 'transparent',
    color:      active ? '#fff'    : '#6E6E73',
  })

  return (
    <Shell>
      <Topbar title={t('meetings.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            <button style={TAB_STYLE(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
              {t('meetings.upcoming')} ({upcoming.length})
            </button>
            <button style={TAB_STYLE(tab === 'past')} onClick={() => setTab('past')}>
              {t('meetings.past')} ({past.length})
            </button>
          </div>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <Plus size={15} /> {t('meetings.add')}
          </button>
        </div>

        {isLoading ? (
          <div style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
            <CalendarDays size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>{t('meetings.empty')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map(m => {
              const dateStr = new Date(m.date).toLocaleString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              const sc = STATUS_COLORS[m.status] ?? STATUS_COLORS['scheduled']
              return (
                <div key={m.id} style={{
                  background: '#fff', borderRadius: 12, padding: '14px 16px',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Date chip */}
                    <div style={{ width: 48, flexShrink: 0, textAlign: 'center', background: '#F5F5F7', borderRadius: 10, padding: '8px 0' }}>
                      <div style={{ fontSize: 11, color: '#6E6E73', textTransform: 'uppercase' }}>
                        {new Date(m.date).toLocaleString('fr-BE', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', lineHeight: 1.2 }}>
                        {new Date(m.date).getDate()}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1C1C1E', flex: 1 }}>{m.title}</div>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, ...sc, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {STATUS_ICONS[m.status]}
                          {t(`meetings.status_${m.status}`)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 3 }}>{dateStr}</div>
                      {m.agenda && (
                        <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 6, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{m.agenda}</div>
                      )}
                      {/* Lifecycle stepper */}
                      <LifecycleStepper meeting={m} t={t} />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {m.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => openWithPrompt(
                              `Generate a professional agenda for the VME general assembly meeting "${m.title}" ` +
                              `scheduled for ${new Date(m.date).toLocaleString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} ` +
                              `for building "${building?.name ?? ''}". ` +
                              (m.agenda ? `Current notes: ${m.agenda}. ` : '') +
                              `Format it as a proper Belgian VME general assembly agenda with numbered items, including standard items like approval of previous minutes, financial report, and AOB.`
                            )}
                            title={t('ai.generateAgenda')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#B45309', fontSize: 12, cursor: 'pointer' }}
                          >
                            <Sparkles size={12} /> {t('ai.generateAgenda')}
                          </button>
                          <button onClick={() => openEdit(m)}
                            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #D1D1D6', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#1C1C1E' }}>
                            {t('common.edit')}
                          </button>
                          <button onClick={() => handleStart(m)} disabled={startMeeting.isPending}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#F59E0B', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <Play size={12} /> {t('meetings.start')}
                          </button>
                        </>
                      )}
                      {m.status === 'in_progress' && (
                        <button onClick={() => navigate(`/meetings/${m.id}/room`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {t('meetings.joinRoom')} <ChevronRight size={13} />
                        </button>
                      )}
                      {m.status === 'completed' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Generate minutes from transcript if no minutes yet */}
                          {m.transcript && !m.minutes && (
                            <button
                              onClick={() => handleGenerateMinutes(m)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#B45309', fontSize: 12, cursor: 'pointer' }}
                            >
                              <Sparkles size={12} /> {t('meetings.generateMinutes')}
                            </button>
                          )}
                          {m.minutes ? (
                            <button onClick={() => setMinutesMeeting(m)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D1D6', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#1C1C1E' }}>
                              <FileText size={12} /> {t('meetings.viewMinutes')}
                            </button>
                          ) : (
                            <button onClick={() => handleGenerateMinutes(m)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.08)', color: '#B45309', fontSize: 12, cursor: 'pointer' }}>
                              <Sparkles size={12} /> {t('meetings.generateMinutes')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit / create modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>
                {editing ? t('meetings.edit') : t('meetings.add')}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#6E6E73" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('meetings.meetingTitle')} *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('meetings.titlePlaceholder')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('common.date')} *</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('meetings.agenda')}</label>
                <textarea value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  rows={5} placeholder={t('meetings.agendaPlaceholder')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D1D6', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={isSaving || !form.title.trim() || !form.date}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: isSaving || !form.title.trim() || !form.date ? 0.6 : 1 }}>
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minutes modal */}
      {minutesMeeting && (
        <MinutesModal meeting={minutesMeeting} onClose={() => setMinutesMeeting(undefined)} />
      )}
    </Shell>
  )
}
