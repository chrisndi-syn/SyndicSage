// ── Inbox / Notifications page ────────────────────────────────

import { useQueryClient }    from '@tanstack/react-query'
import { useTranslation }    from 'react-i18next'
import { Bell, CheckCheck }  from 'lucide-react'
import { Shell }             from '../../components/layout/Shell'
import { Topbar }            from '../../components/layout/Topbar'
import { useNotifications, doMarkRead, doMarkAllRead } from './useInbox'
import type { Notification } from './inbox.api'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  charge_overdue:      { bg: '#fee2e2', color: '#991b1b' },
  charge_paid:         { bg: '#d1fae5', color: '#065f46' },
  new_document:        { bg: '#dbeafe', color: '#1d4ed8' },
  maintenance_request: { bg: '#fef3c7', color: '#92400e' },
  general:             { bg: '#f3f4f6', color: '#374151' },
}

function dot(type: string): string {
  return TYPE_COLORS[type]?.color ?? '#6E6E73'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function InboxPage() {
  const { t }   = useTranslation()
  const qc      = useQueryClient()
  const { data: notifications = [], isLoading } = useNotifications()

  const unread = notifications.filter(n => !n.read).length

  async function handleMarkRead(n: Notification) {
    if (n.read) return
    try { await doMarkRead(n.id, qc) } catch { /* silent */ }
  }

  async function handleMarkAllRead() {
    try { await doMarkAllRead(qc) } catch { /* silent */ }
  }

  return (
    <Shell>
      <Topbar title={t('nav.inbox')} />
      <div style={{ padding: 24, maxWidth: 680 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', margin: 0 }}>
              {t('inbox.title')}
            </h2>
            {unread > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff',
                borderRadius: 99, fontSize: 11, fontWeight: 700,
                padding: '1px 7px', lineHeight: '18px',
              }}>
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid rgba(60,60,67,0.2)',
                background: '#fff', cursor: 'pointer', fontSize: 12, color: '#1E3A5F',
              }}
            >
              <CheckCheck size={13} />
              {t('inbox.markAllRead')}
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6E6E73' }}>
            <Bell size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{t('inbox.empty')}</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(60,60,67,0.1)', overflow: 'hidden' }}>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n)}
                style={{
                  display:    'flex',
                  gap:        12,
                  padding:    '14px 16px',
                  borderTop:  i === 0 ? 'none' : '1px solid rgba(60,60,67,0.06)',
                  background: n.read ? '#fff' : 'rgba(30,58,95,0.03)',
                  cursor:     n.read ? 'default' : 'pointer',
                  transition: 'background 0.12s',
                }}
              >
                {/* Dot indicator */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: n.read ? 'transparent' : dot(n.type),
                  border:     n.read ? '1.5px solid rgba(60,60,67,0.2)' : 'none',
                }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: n.read ? 500 : 600,
                      color: n.read ? '#374151' : '#1E3A5F',
                    }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6E6E73', margin: '2px 0 0', lineHeight: 1.5 }}>
                    {n.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
