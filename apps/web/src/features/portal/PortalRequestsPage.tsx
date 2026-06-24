// ── Portal — resident requests/tickets ──────────────────────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { Ticket, Plus, Clock, X } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface TicketRow {
  id:          string
  title:       string
  type:        string
  status:      string
  description: string
  created_at:  string
}

const DEMO_TICKETS: TicketRow[] = [
  { id: '1', title: 'Broken hallway light — floor 2', type: 'complaint',       status: 'in_progress', description: 'The light on the 2nd floor hallway has been broken for 2 weeks.',    created_at: '2026-06-10T10:00:00' },
  { id: '2', title: 'Leak under kitchen sink',        type: 'complaint',       status: 'open',        description: 'There is a slow drip under the kitchen sink. Needs urgent attention.', created_at: '2026-06-18T14:00:00' },
  { id: '3', title: 'Intercom not working',           type: 'complaint',       status: 'resolved',    description: 'The intercom unit in unit 3B is not functioning.',                     created_at: '2026-05-28T09:00:00' },
  { id: '4', title: 'Request for parking documents',  type: 'document_request', status: 'closed',     description: 'Please provide the parking allocation document for my unit.',           created_at: '2026-05-10T11:00:00' },
]

const STATUS: Record<string, { bg: string; color: string }> = {
  open:        { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  in_progress: { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  resolved:    { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
  closed:      { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

const TICKET_TYPES = [
  { value: 'complaint',        labelKey: 'tickets.complaint'       },
  { value: 'charge_dispute',   labelKey: 'tickets.chargeDispute'   },
  { value: 'document_request', labelKey: 'tickets.documentRequest' },
  { value: 'administrative',   labelKey: 'tickets.administrative'  },
  { value: 'general_inquiry',  labelKey: 'tickets.generalInquiry'  },
]

export default function PortalRequestsPage() {
  const { t }      = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const [tickets,    setTickets]    = useState<TicketRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const [newType,    setNewType]    = useState('complaint')
  const [newTitle,   setNewTitle]   = useState('')
  const [newDesc,    setNewDesc]    = useState('')

  useEffect(() => {
    if (isDemoMode) { setTickets(DEMO_TICKETS); setLoading(false); return }
    if (!building) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/v1/tickets?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then((data: TicketRow[]) => { setTickets(data); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [building, isDemoMode])

  async function handleSubmit() {
    if (!newTitle.trim() || !newDesc.trim()) return
    setSubmitting(true)
    try {
      if (isDemoMode) {
        // Demo: add locally without API call
        const fake: TicketRow = { id: Date.now().toString(), title: newTitle.trim(), type: newType, status: 'open', description: newDesc.trim(), created_at: new Date().toISOString() }
        setTickets(prev => [fake, ...prev])
      } else {
        if (!building) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`/api/v1/tickets?building_id=${building.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: newType, title: newTitle.trim(), description: newDesc.trim() }),
        })
        if (res.ok) {
          const created = await res.json() as TicketRow
          setTickets(prev => [created, ...prev])
        }
      }
      setShowForm(false)
      setNewTitle('')
      setNewDesc('')
      setNewType('complaint')
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      open: t('tickets.open'), in_progress: t('tickets.inProgress'),
      resolved: t('tickets.resolved'), closed: t('tickets.closed'),
    }
    return map[s] ?? s
  }

  return (
    <Shell>
      <Topbar title={t('portal.requests')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={20} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.requests')}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{t('portal.requestsSub')}</div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E3A5F',
              color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13,
              fontWeight: 500, cursor: 'pointer' }}
          >
            <Plus size={14} /> {t('portal.newRequest')}
          </button>
        </div>

        {/* New request modal */}
        {showForm && (
          <div
            onClick={() => setShowForm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, maxWidth: '90vw',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{t('portal.newRequest')}</div>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} color="#6B7280" />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{t('tickets.type')}</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, background: '#fff' }}>
                    {TICKET_TYPES.map(opt => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{t('portal.requestTitleLabel')}</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder={t('portal.requestTitlePlaceholder')}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{t('portal.requestDetailsLabel')}</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder={t('portal.requestDetailsPlaceholder')}
                    rows={4}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || !newTitle.trim() || !newDesc.trim()}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (!newTitle.trim() || !newDesc.trim()) ? 0.5 : 1 }}>
                    {submitting ? t('common.saving') : t('common.submit')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket list */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, color: '#9CA3AF', fontSize: 13 }}>{t('common.loading')}</div>}
          {!loading && tickets.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>{t('tickets.empty')}</div>
          )}
          {tickets.map((req, i) => {
            const s = STATUS[req.status] ?? STATUS['open']!
            const isOpen = expanded === req.id
            return (
              <div key={req.id} style={{ borderBottom: i < tickets.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{req.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={11} color="#9CA3AF" />
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {new Date(req.created_at).toLocaleDateString('fr-BE')}
                      </span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {t(`tickets.${req.type === 'charge_dispute' ? 'chargeDispute' : req.type === 'document_request' ? 'documentRequest' : req.type === 'general_inquiry' ? 'generalInquiry' : req.type}`)}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99,
                    background: s.bg, color: s.color }}>
                    {statusLabel(req.status)}
                  </span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 14px', fontSize: 13, color: '#6B7280', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    {req.description}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </Shell>
  )
}
