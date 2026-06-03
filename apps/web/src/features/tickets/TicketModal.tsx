import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { Ticket }          from './useTickets'

export const TICKET_TYPES = [
  'complaint',
  'charge_dispute',
  'document_request',
  'administrative',
  'general_inquiry',
] as const

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const

interface Props {
  ticket?:  Ticket
  onSave:   (data: TicketFormData) => void
  onClose:  () => void
  saving:   boolean
}

export interface TicketFormData {
  type:        string
  title:       string
  description: string
  status?:     string
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function TicketModal({ ticket, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit = !!ticket

  const [form, setForm] = useState<TicketFormData>({
    type:        ticket?.type        ?? '',
    title:       ticket?.title       ?? '',
    description: ticket?.description ?? '',
    status:      ticket?.status      ?? 'open',
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (ticket) {
      setForm({
        type:        ticket.type,
        title:       ticket.title,
        description: ticket.description,
        status:      ticket.status,
      })
    }
  }, [ticket])

  function set(key: keyof TicketFormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type) { setErr(t('common.required')); return }
    if (!form.title.trim()) { setErr(t('common.required')); return }
    if (!form.description.trim()) { setErr(t('common.required')); return }
    setErr('')
    onSave(form)
  }

  const title = isEdit ? t('tickets.editTicket') : t('tickets.addTicket')

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {title}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={FIELD}>
            <label style={LABEL}>{t('tickets.type')}</label>
            <select style={INPUT} value={form.type} onChange={e => set('type', e.target.value)} required>
              <option value="">— select —</option>
              {TICKET_TYPES.map(tp => (
                <option key={tp} value={tp}>{t(`tickets.type_${tp}`)}</option>
              ))}
            </select>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('tickets.title')}</label>
            <input style={INPUT} value={form.title} onChange={e => set('title', e.target.value)} required maxLength={300} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('tickets.description')}</label>
            <textarea
              style={{ ...INPUT, resize: 'vertical', minHeight: 100 }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required
              maxLength={2000}
            />
          </div>

          {isEdit && (
            <div style={FIELD}>
              <label style={LABEL}>{t('tickets.status')}</label>
              <select style={INPUT} value={form.status ?? ''} onChange={e => set('status', e.target.value)}>
                {TICKET_STATUSES.map(s => (
                  <option key={s} value={s}>{t(`tickets.status_${s}`)}</option>
                ))}
              </select>
            </div>
          )}

          {err && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 7, background: '#1E3A5F', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
