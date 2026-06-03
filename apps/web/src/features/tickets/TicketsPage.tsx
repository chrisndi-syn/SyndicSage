// ── Tickets page ───────────────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { Ticket as TicketIcon } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useTickets, useCreateTicket, useUpdateTicket, useCloseTicket } from './useTickets'
import { TicketModal }    from './TicketModal'
import type { Ticket }    from './tickets.api'
import type { TicketFormData } from './TicketModal'

type FilterTab = 'all' | 'open' | 'in_progress' | 'closed'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  open:        { bg: 'rgba(59,130,246,0.12)',  color: '#2563EB' },
  in_progress: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  resolved:    { bg: 'rgba(34,197,94,0.12)',  color: '#15803D' },
  closed:      { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  complaint:         { bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
  charge_dispute:    { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  document_request:  { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  administrative:    { bg: 'rgba(139,92,246,0.10)',  color: '#7C3AED' },
  general_inquiry:   { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

const FILTER_TABS: FilterTab[] = ['all', 'open', 'in_progress', 'closed']

export default function TicketsPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()

  const { data: tickets = [], isLoading, error } = useTickets(building?.id)
  const createTicket = useCreateTicket(building?.id ?? '')
  const updateTicket = useUpdateTicket(building?.id ?? '')
  const closeTicket  = useCloseTicket(building?.id ?? '')

  const [showModal,  setShowModal]  = useState(false)
  const [editTicket, setEditTicket] = useState<Ticket | undefined>()
  const [tab,        setTab]        = useState<FilterTab>('all')

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('tickets.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSave(data: TicketFormData) {
    if (editTicket) {
      await updateTicket.mutateAsync({ id: editTicket.id, body: data })
    } else {
      await createTicket.mutateAsync(data)
    }
    setShowModal(false)
    setEditTicket(undefined)
  }

  const isSaving = createTicket.isPending || updateTicket.isPending

  const filtered = tab === 'all'
    ? tickets
    : tab === 'closed'
      ? tickets.filter(t => t.status === 'closed' || t.status === 'resolved')
      : tickets.filter(tk => tk.status === tab)

  return (
    <Shell>
      <Topbar title={t('tickets.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {FILTER_TABS.map(tabKey => (
              <button key={tabKey} onClick={() => setTab(tabKey)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: tab === tabKey ? '#1E3A5F' : '#FFFFFF',
                color:      tab === tabKey ? '#FFFFFF' : '#6E6E73',
                boxShadow:  '0 0 0 1px rgba(60,60,67,0.15)',
              }}>
                {t(`tickets.tab_${tabKey}`)}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditTicket(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F', border: 'none',
              borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('tickets.addTicket')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <TicketIcon size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('tickets.empty')}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9FB' }}>
                  {[
                    t('tickets.type'), t('tickets.title'), t('tickets.status'),
                    t('common.date'), t('common.actions'),
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
                {filtered.map((ticket, i) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isLast={i === filtered.length - 1}
                    onEdit={() => { setEditTicket(ticket); setShowModal(true) }}
                    onClose={async () => { await closeTicket.mutateAsync(ticket.id) }}
                    closing={closeTicket.isPending}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TicketModal
          ticket={editTicket}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTicket(undefined) }}
          saving={isSaving}
        />
      )}
    </Shell>
  )
}

function TicketRow({ ticket, isLast, onEdit, onClose, closing, t }: {
  ticket:  Ticket
  isLast:  boolean
  onEdit:  () => void
  onClose: () => void
  closing: boolean
  t:       (key: string) => string
}) {
  const typeColor   = TYPE_COLORS[ticket.type]   ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
  const statusColor = STATUS_COLORS[ticket.status] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
  const isClosed    = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(60,60,67,0.06)' }}>
      <td style={tdStyle}>
        <span style={{
          borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          background: typeColor.bg, color: typeColor.color,
        }}>
          {t(`tickets.type_${ticket.type}`)}
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{ fontWeight: 500 }}>{ticket.title}</span>
        <span style={{ fontSize: 11, color: '#6E6E73', display: 'block' }}>
          {ticket.submitted_by.slice(0, 8)}…
        </span>
      </td>
      <td style={tdStyle}>
        <span style={{
          borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          background: statusColor.bg, color: statusColor.color,
        }}>
          {t(`tickets.status_${ticket.status}`)}
        </span>
      </td>
      <td style={{ ...tdStyle, color: '#6E6E73' }}>
        {new Date(ticket.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <SmallBtn onClick={onEdit} label={t('common.edit')} />
          {!isClosed && (
            <SmallBtn onClick={onClose} label={t('tickets.close')} disabled={closing} />
          )}
        </div>
      </td>
    </tr>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

function SmallBtn({ onClick, label, danger, disabled }: {
  onClick: () => void; label: string; danger?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '4px 10px', background: 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5,
      color: danger ? '#DC2626' : '#6E6E73',
      fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
      opacity: disabled ? 0.6 : 1,
    }}>
      {label}
    </button>
  )
}
