// ── Portal — meetings for residents ──────────────────────────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { CalendarDays, Clock, FileText, Video } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface MeetingRow {
  id:              string
  title:           string
  date:            string
  status:          string
  agenda:          string | null
  minutes:         string | null
  daily_room_url:  string | null
}

const DEMO_UPCOMING: MeetingRow[] = [
  { id: '0', title: 'AG Extraordinaire — Ravalement',    date: '2026-06-24T19:00:00', status: 'in_progress', agenda: '1. Devis ravalement façade\n2. Vote des travaux', minutes: null, daily_room_url: 'https://syndicsage.daily.co/demo-room' },
  { id: '1', title: 'Assemblée Générale Ordinaire 2026', date: '2026-09-15T19:00:00', status: 'scheduled',   agenda: '1. Approbation des comptes\n2. Budget 2026–2027\n3. Travaux toiture\n4. Questions diverses', minutes: null, daily_room_url: null },
  { id: '2', title: 'AG Extraordinaire — Toiture',       date: '2026-07-10T18:30:00', status: 'scheduled',   agenda: null, minutes: null, daily_room_url: null },
]

const DEMO_PAST: MeetingRow[] = [
  { id: '3', title: 'Assemblée Générale Ordinaire 2025', date: '2025-09-08T19:00:00', status: 'completed', agenda: '1. Approbation des comptes\n2. Budget 2025–2026', minutes: 'Les comptes 2024–2025 ont été approuvés à l\'unanimité. Le budget 2025–2026 a été voté.', daily_room_url: null },
  { id: '4', title: 'AG Extraordinaire — Ascenseur',     date: '2025-03-12T18:00:00', status: 'completed', agenda: '1. Remplacement ascenseur\n2. Vote des travaux', minutes: 'Le remplacement de l\'ascenseur a été voté à la majorité.', daily_room_url: null },
]

export default function PortalMeetingsPage() {
  const { t }    = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const [upcoming, setUpcoming] = useState<MeetingRow[]>([])
  const [past,     setPast]     = useState<MeetingRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      setUpcoming(DEMO_UPCOMING)
      setPast(DEMO_PAST)
      setLoading(false)
      return
    }
    if (!building) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/v1/meetings?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then((data: MeetingRow[]) => {
          setUpcoming(data.filter(m => m.status !== 'completed').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
          setPast(data.filter(m => m.status === 'completed').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [building, isDemoMode])

  function MeetingCard({ meeting, past }: { meeting: MeetingRow; past?: boolean }) {
    const isOpen = expanded === meeting.id
    const isLive = meeting.status === 'in_progress'
    const d = new Date(meeting.date)
    return (
      <div style={{ background: '#fff', border: isLive ? '1px solid rgba(30,58,95,0.3)' : '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 12, overflow: 'hidden', opacity: past ? 0.75 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px' }}>
          {/* Date block */}
          <div style={{ width: 46, flexShrink: 0, background: past ? '#F3F4F6' : 'rgba(245,158,11,0.08)', borderRadius: 10, padding: '6px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: past ? '#9CA3AF' : '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {d.toLocaleString('fr-BE', { month: 'short' })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: past ? '#6B7280' : '#111827', lineHeight: 1.2 }}>{d.getDate()}</div>
            <div style={{ fontSize: 10, color: past ? '#9CA3AF' : '#6B7280' }}>{d.getFullYear()}</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{meeting.title}</div>
              {isLive && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#DC2626',
                  borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', flexShrink: 0 }}>
                  LIVE
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} color="#9CA3AF" />
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {meeting.status === 'in_progress' && meeting.daily_room_url && (
              <a
                href={meeting.daily_room_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E3A5F',
                  border: 'none', borderRadius: 99, padding: '7px 16px',
                  fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', textDecoration: 'none' }}
              >
                <Video size={12} /> {t('portal.joinOnline')}
              </a>
            )}
            {!past && meeting.agenda && (
              <button
                onClick={() => setExpanded(isOpen ? null : meeting.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none',
                  border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99, padding: '6px 14px',
                  fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
              >
                <FileText size={12} /> {t('portal.viewAgenda')}
              </button>
            )}
            {past && meeting.minutes && (
              <button
                onClick={() => setExpanded(isOpen ? null : meeting.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none',
                  border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99, padding: '6px 14px',
                  fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
              >
                <FileText size={12} /> {t('meetings.viewMinutes')}
              </button>
            )}
          </div>
        </div>

        {/* Expanded — agenda or minutes */}
        {isOpen && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '14px 18px',
            background: '#FAFAFA', fontSize: 13, color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
            {past ? meeting.minutes : meeting.agenda}
          </div>
        )}
      </div>
    )
  }

  return (
    <Shell>
      <Topbar title={t('portal.meetingsSection')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} color="#B45309" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.meetingsSection')}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              {upcoming.length > 0
                ? t('portal.meetingsSub', {
                    date: new Date(upcoming[0]!.date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }),
                    time: new Date(upcoming[0]!.date).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
                  })
                : t('portal.noMeetings')}
            </div>
          </div>
        </div>

        {loading && <div style={{ color: '#9CA3AF', fontSize: 13 }}>{t('common.loading')}</div>}

        {/* Upcoming */}
        {!loading && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em',
              textTransform: 'uppercase', marginBottom: 12 }}>{t('meetings.upcoming')}</div>
            {upcoming.length === 0
              ? <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 24 }}>{t('portal.noMeetings')}</div>
              : upcoming.map(m => <MeetingCard key={m.id} meeting={m} />)
            }

            {/* Past */}
            {past.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em',
                  textTransform: 'uppercase', margin: '24px 0 12px' }}>{t('meetings.past')}</div>
                {past.map(m => <MeetingCard key={m.id} meeting={m} past />)}
              </>
            )}
          </>
        )}

      </div>
    </Shell>
  )
}
