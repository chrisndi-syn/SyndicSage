// ── Portal — resident requests/tickets ──────────────────────────

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { ArrowLeft, Ticket, Plus, Clock, CheckCircle } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'

const DEMO_REQUESTS = [
  { id: '1', title: 'Broken hallway light — floor 2', status: 'in_progress', date: '2026-06-10' },
  { id: '2', title: 'Leak under kitchen sink',        status: 'open',        date: '2026-06-18' },
  { id: '3', title: 'Intercom not working',           status: 'resolved',    date: '2026-05-28' },
]

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  open:        { label: 'Open',        bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  in_progress: { label: 'In progress', bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  resolved:    { label: 'Resolved',    bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
}

export default function PortalRequestsPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  return (
    <Shell>
      <Topbar title={t('portal.requests')} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/portal')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: '#6B7280', fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={15} /> {t('portal.backToPortal')}
        </button>

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
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111827',
            color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13,
            fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={14} /> {t('portal.newRequest')}
          </button>
        </div>

        {/* List */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {DEMO_REQUESTS.map((req, i) => {
            const s = STATUS[req.status] ?? { label: req.status, bg: 'rgba(0,0,0,0.06)', color: '#374151' }
            return (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                borderBottom: i < DEMO_REQUESTS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{req.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={11} color="#9CA3AF" />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{req.date}</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99,
                  background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </Shell>
  )
}
