// ── Building Timeline page ─────────────────────────────────────

import { useTranslation }  from 'react-i18next'
import { Clock }           from 'lucide-react'
import { Shell }           from '../../components/layout/Shell'
import { Topbar }          from '../../components/layout/Topbar'
import { useBuilding }     from '../../shared/building/BuildingContext'
import { useTimeline }     from './useTimeline'
import type { AuditEntry } from './timeline.api'

// Map action → human label
const ACTION_LABELS: Record<string, string> = {
  'charge.created':    'Charge created',
  'charge.paid':       'Charge marked paid',
  'charge.deleted':    'Charge deleted',
  'owner.created':     'Owner added',
  'owner.updated':     'Owner updated',
  'owner.deleted':     'Owner removed',
  'document.uploaded': 'Document uploaded',
  'document.deleted':  'Document deleted',
  'building.updated':  'Building updated',
  'ticket.created':    'Ticket opened',
  'ticket.updated':    'Ticket updated',
  'ticket.closed':     'Ticket closed',
  'expense.created':   'Expense added',
  'expense.deleted':   'Expense deleted',
  'income.created':    'Income entry added',
  'income.deleted':    'Income entry deleted',
  'member.invited':    'Member invited',
  'member.removed':    'Member removed',
}

// Map resource_type → colour dot
const RESOURCE_COLORS: Record<string, string> = {
  charge:   '#1d4ed8',
  owner:    '#059669',
  document: '#7c3aed',
  building: '#0369a1',
  ticket:   '#d97706',
  expense:  '#dc2626',
  income:   '#065f46',
  member:   '#92400e',
}

function formatLabel(entry: AuditEntry): string {
  const base  = ACTION_LABELS[entry.action] ?? entry.action.replace(/\./g, ' ')
  const extra = entry.metadata?.name ?? entry.metadata?.title ?? null
  return extra ? `${base}: ${extra}` : base
}

function dot(type: string): string {
  return RESOURCE_COLORS[type] ?? '#6E6E73'
}

function groupByDate(entries: AuditEntry[]): { date: string; items: AuditEntry[] }[] {
  const map = new Map<string, AuditEntry[]>()
  for (const e of entries) {
    const d = new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(e)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TimelinePage() {
  const { t }                          = useTranslation()
  const { selected: building }         = useBuilding()
  const { data: entries = [], isLoading } = useTimeline(building?.id)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('nav.timeline')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  const groups = groupByDate(entries)

  return (
    <Shell>
      <Topbar title={t('nav.timeline')} subtitle={building.name} />
      <div style={{ padding: 24, maxWidth: 680 }}>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
          {t('timeline.title')}
        </h2>

        {isLoading ? (
          <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6E6E73' }}>
            <Clock size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{t('timeline.empty')}</p>
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.date} style={{ marginBottom: 28 }}>
                {/* Date heading */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6E6E73',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  marginBottom: 10,
                }}>
                  {group.date}
                </div>

                {/* Entries */}
                <div style={{
                  background: '#fff', borderRadius: 10,
                  border: '1px solid rgba(60,60,67,0.1)', overflow: 'hidden',
                }}>
                  {group.items.map((entry, i) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '11px 16px',
                        borderTop: i === 0 ? 'none' : '1px solid rgba(60,60,67,0.06)',
                      }}
                    >
                      {/* Colour dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                        background: dot(entry.resource_type),
                      }} />

                      {/* Label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 500 }}>
                          {formatLabel(entry)}
                        </span>
                      </div>

                      {/* Time */}
                      <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {timeStr(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
