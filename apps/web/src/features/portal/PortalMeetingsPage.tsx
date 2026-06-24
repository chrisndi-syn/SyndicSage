// ── Portal — upcoming meetings for residents ─────────────────────

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, MapPin, FileText } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'

const DEMO_MEETINGS = [
  {
    id: '1',
    title: 'Annual General Meeting 2026',
    date: '2026-09-15',
    time: '19:00',
    location: 'Meeting room — Rue de la Loi 42, 1000 Brussels',
    status: 'scheduled',
    hasAgenda: true,
  },
  {
    id: '2',
    title: 'Extraordinary General Meeting',
    date: '2026-07-10',
    time: '18:30',
    location: 'Online (video link will be sent)',
    status: 'scheduled',
    hasAgenda: false,
  },
]

const PAST_MEETINGS = [
  {
    id: '3',
    title: 'Annual General Meeting 2025',
    date: '2025-09-08',
    time: '19:00',
    location: 'Meeting room — Rue de la Loi 42, 1000 Brussels',
    status: 'completed',
    hasAgenda: true,
  },
]

export default function PortalMeetingsPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  function MeetingCard({ meeting, past }: { meeting: typeof DEMO_MEETINGS[0]; past?: boolean }) {
    return (
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
        padding: '16px 18px', marginBottom: 12,
        opacity: past ? 0.7 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 8 }}>{meeting.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={13} color="#9CA3AF" />
                <span style={{ fontSize: 13, color: '#6B7280' }}>{meeting.date}</span>
                <Clock size={13} color="#9CA3AF" style={{ marginLeft: 4 }} />
                <span style={{ fontSize: 13, color: '#6B7280' }}>{meeting.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="#9CA3AF" />
                <span style={{ fontSize: 13, color: '#6B7280' }}>{meeting.location}</span>
              </div>
            </div>
          </div>
          {!past && meeting.hasAgenda && (
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99,
              padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <FileText size={12} /> {t('portal.viewAgenda')}
            </button>
          )}
          {past && (
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99,
              padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <FileText size={12} /> Minutes
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Shell>
      <Topbar title={t('portal.meetingsSection')} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} color="#B45309" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.meetingsSection')}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{t('portal.meetingsSub', { date: '15 Sep', time: '19:00' })}</div>
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 10 }}>Upcoming</div>
        {DEMO_MEETINGS.map(m => <MeetingCard key={m.id} meeting={m} />)}

        {/* Past */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em',
          textTransform: 'uppercase', margin: '20px 0 10px' }}>Past meetings</div>
        {PAST_MEETINGS.map(m => <MeetingCard key={m.id} meeting={m} past />)}

      </div>
    </Shell>
  )
}
