// ── Votes page ──────────────────────────────────────────────────
// Shows all votes across all meetings for the selected building

import { useTranslation }    from 'react-i18next'
import { useNavigate }       from 'react-router-dom'
import { Vote as VoteIcon, CalendarDays, ChevronRight } from 'lucide-react'
import { Shell }             from '../../components/layout/Shell'
import { Topbar }            from '../../components/layout/Topbar'
import { useBuilding }       from '../../shared/building/BuildingContext'
import { useMeetings, useVotes } from '../meetings/useMeetings'
import type { Meeting, Vote } from '../meetings/meetings.api'

type MajorityType = 'simple_50' | 'two_thirds' | 'four_fifths'

function tallyVotes(casts: { choice: string; vote_weight: number }[]) {
  let yes = 0, no = 0, abstain = 0
  for (const c of casts) {
    if (c.choice === 'yes')     yes     += c.vote_weight
    if (c.choice === 'no')      no      += c.vote_weight
    if (c.choice === 'abstain') abstain += c.vote_weight
  }
  const total = yes + no + abstain || 1
  return { yes, no, abstain, total, yesPct: Math.round(yes / total * 100) }
}

function isPassed(tally: { yes: number; no: number; total: number }, type: MajorityType): boolean {
  const threshold = type === 'two_thirds' ? 2 / 3 : type === 'four_fifths' ? 4 / 5 : 0.5
  const denominator = type === 'simple_50' ? tally.total : (tally.yes + tally.no) || 1
  return tally.yes / denominator > threshold
}

function VoteCard({ vote }: { vote: Vote }) {
  const { t } = useTranslation()
  const tally  = tallyVotes(vote.vote_casts ?? [])
  const isOpen = vote.status === 'open'

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 16px',
      border: `1px solid ${isOpen ? 'rgba(245,158,11,0.3)' : 'rgba(0,0,0,0.07)'}`,
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', marginBottom: 2 }}>
            {vote.question}
          </div>
          {vote.description && (
            <div style={{ fontSize: 12, color: '#6E6E73', lineHeight: 1.5 }}>{vote.description}</div>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, flexShrink: 0,
          background: isOpen ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.10)',
          color:      isOpen ? '#B45309'                : '#15803D',
        }}>
          {isOpen ? t('meetings.status_in_progress') : t('meetings.status_completed')}
        </span>
      </div>

      {/* Tally bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { label: t('meetings.yes'),     value: tally.yes,     pct: Math.round(tally.yes     / tally.total * 100), color: '#15803D' },
          { label: t('meetings.no'),      value: tally.no,      pct: Math.round(tally.no      / tally.total * 100), color: '#DC2626' },
          { label: t('meetings.abstain'), value: tally.abstain, pct: Math.round(tally.abstain / tally.total * 100), color: '#6B7280' },
        ].map(row => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: row.color, fontWeight: 600 }}>{row.label}</span>
              <span style={{ color: '#6E6E73' }}>{row.value} pts ({row.pct}%)</span>
            </div>
            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Majority type */}
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
        {t(`meetings.majority_${vote.majority_type ?? 'simple_50'}`)}
      </div>

      {/* Result */}
      {!isOpen && (vote.vote_casts ?? []).length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: isPassed(tally, (vote.majority_type ?? 'simple_50') as MajorityType) ? '#15803D' : '#DC2626' }}>
          {isPassed(tally, (vote.majority_type ?? 'simple_50') as MajorityType) ? `✓ ${t('meetings.majorityReached')}` : `✗ ${t('meetings.majorityNotReached')}`}
          {' '}— {tally.yesPct}% {t('meetings.yes')} · {(vote.vote_casts ?? []).length} {t('meetings.voters')}
        </div>
      )}
      {!isOpen && (vote.vote_casts ?? []).length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF' }}>{t('meetings.noVoters')}</div>
      )}
    </div>
  )
}

function MeetingVotes({ meeting, buildingId }: { meeting: Meeting; buildingId: string }) {
  const { t }              = useTranslation()
  const navigate           = useNavigate()
  const { data: votes = [] } = useVotes(buildingId, meeting.id)

  if (votes.length === 0) return null

  const dateStr = new Date(meeting.date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Meeting header */}
      <div
        onClick={() => navigate(`/meetings`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer',
        }}
      >
        <CalendarDays size={14} color="#6E6E73" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{meeting.title}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>— {dateStr}</span>
        <ChevronRight size={13} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
      </div>

      {votes.map(v => <VoteCard key={v.id} vote={v} />)}
    </div>
  )
}

export default function VotesPage() {
  const { t }                        = useTranslation()
  const { selected: building }       = useBuilding()
  const { data: meetings = [], isLoading } = useMeetings(building?.id)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('nav.votes')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  // Meetings that have votes (all statuses)
  const allMeetings = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <Shell>
      <Topbar title={t('nav.votes')} subtitle={building.name} />
      <div style={{ padding: 24, maxWidth: 720 }}>

        {isLoading ? (
          <div style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
        ) : allMeetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
            <VoteIcon size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>{t('meetings.noVotes')}</div>
          </div>
        ) : (
          allMeetings.map(m => (
            <MeetingVotes key={m.id} meeting={m} buildingId={building.id} />
          ))
        )}
      </div>
    </Shell>
  )
}
