// ── AG Meeting Room ─────────────────────────────────────────────
// Daily.co iframe + live vote tally + agenda panel

import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThumbsUp, ThumbsDown, Minus, Plus, X, StopCircle } from 'lucide-react'
import { Shell }       from '../../components/layout/Shell'
import { Topbar }      from '../../components/layout/Topbar'
import { useBuilding } from '../../shared/building/BuildingContext'
import { useMeetings, useVotes, useEndMeeting, useCreateVote, useCastVote, useCloseVote } from './useMeetings'

interface LocationState {
  roomUrl?: string
  token?:   string | null
}

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

export default function MeetingRoomPage() {
  const { t }      = useTranslation()
  const { id: meetingId } = useParams<{ id: string }>()
  const location   = useLocation()
  const navigate   = useNavigate()
  const { selected: building } = useBuilding()
  const state      = (location.state ?? {}) as LocationState

  const { data: meetings = [] } = useMeetings(building?.id)
  const meeting = meetings.find(m => m.id === meetingId)

  const { data: votes = [] } = useVotes(building?.id, meetingId)

  const endMeeting  = useEndMeeting(building?.id ?? '')
  const createVote  = useCreateVote(building?.id ?? '', meetingId ?? '')
  const castVote    = useCastVote(building?.id ?? '', meetingId ?? '')
  const closeVote   = useCloseVote(building?.id ?? '', meetingId ?? '')

  const [showNewVote, setShowNewVote] = useState(false)
  const [voteQuestion, setVoteQuestion]     = useState('')
  const [voteDescription, setVoteDescription] = useState('')

  const roomUrl = state.roomUrl ?? meeting?.daily_room_url
  const iframeUrl = roomUrl && state.token
    ? `${roomUrl}?t=${state.token}`
    : roomUrl ?? null

  async function handleEnd() {
    if (!meetingId) return
    if (!confirm(t('meetings.endConfirm'))) return
    await endMeeting.mutateAsync(meetingId)
    navigate('/meetings')
  }

  async function handleCreateVote() {
    if (!voteQuestion.trim() || !meetingId) return
    await createVote.mutateAsync({ question: voteQuestion.trim(), description: voteDescription.trim() || undefined })
    setVoteQuestion('')
    setVoteDescription('')
    setShowNewVote(false)
  }

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('meetings.room')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Topbar title={meeting?.title ?? t('meetings.room')} subtitle={building.name} />
      <div style={{ padding: '0 0 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={() => setShowNewVote(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <Plus size={14} /> {t('meetings.addVote')}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleEnd}
            disabled={endMeeting.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <StopCircle size={14} /> {t('meetings.endMeeting')}
          </button>
        </div>

        {/* Main two-panel layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Video / iframe */}
          <div style={{ flex: 1, background: '#0f1825', position: 'relative' }}>
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)', gap: 12 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                </svg>
                <div style={{ fontSize: 14, textAlign: 'center' }}>{t('meetings.noRoom')}</div>
                <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', maxWidth: 260 }}>{t('meetings.noRoomHint')}</div>
                {meeting?.daily_room_url && (
                  <a href={meeting.daily_room_url} target="_blank" rel="noreferrer"
                    style={{ marginTop: 4, color: '#F59E0B', fontSize: 13 }}>
                    {t('meetings.openExternal')}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Side panel — agenda + votes */}
          <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid rgba(0,0,0,0.07)', overflowY: 'auto', background: '#FAFAFA' }}>

            {/* Agenda */}
            {meeting?.agenda && (
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('meetings.agenda')}</div>
                <div style={{ fontSize: 12, color: '#3C3C43', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{meeting.agenda}</div>
              </div>
            )}

            {/* Votes list */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                {t('meetings.votes')} ({votes.length})
              </div>

              {votes.length === 0 && (
                <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>
                  {t('meetings.noVotes')}
                </div>
              )}

              {votes.map(vote => {
                const tally = tallyVotes(vote.vote_casts ?? [])
                const isOpen = vote.status === 'open'
                return (
                  <div key={vote.id} style={{
                    background: '#fff', borderRadius: 10, padding: '12px', marginBottom: 10,
                    border: `1px solid ${isOpen ? 'rgba(245,158,11,0.3)' : 'rgba(0,0,0,0.07)'}`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', marginBottom: 4 }}>{vote.question}</div>
                    {vote.description && (
                      <div style={{ fontSize: 11, color: '#6E6E73', marginBottom: 8 }}>{vote.description}</div>
                    )}

                    {/* Tally bars */}
                    <div style={{ marginBottom: 10 }}>
                      {[
                        { label: t('meetings.yes'), value: tally.yes, pct: Math.round(tally.yes / tally.total * 100), color: '#15803D' },
                        { label: t('meetings.no'),  value: tally.no,  pct: Math.round(tally.no  / tally.total * 100), color: '#DC2626' },
                        { label: t('meetings.abstain'), value: tally.abstain, pct: Math.round(tally.abstain / tally.total * 100), color: '#6B7280' },
                      ].map(row => (
                        <div key={row.label} style={{ marginBottom: 5 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                            <span style={{ color: row.color, fontWeight: 500 }}>{row.label}</span>
                            <span style={{ color: '#6E6E73' }}>{row.value} ({row.pct}%)</span>
                          </div>
                          <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vote actions */}
                    {isOpen && (
                      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                        {(['yes', 'no', 'abstain'] as const).map(choice => (
                          <button key={choice} onClick={() => castVote.mutate({ voteId: vote.id, choice })}
                            disabled={castVote.isPending}
                            style={{
                              flex: 1, padding: '5px 0', borderRadius: 7, border: '1px solid',
                              fontSize: 11, fontWeight: 500, cursor: 'pointer',
                              background: choice === 'yes' ? 'rgba(21,128,61,0.08)' : choice === 'no' ? 'rgba(220,38,38,0.08)' : 'rgba(107,114,128,0.08)',
                              color:      choice === 'yes' ? '#15803D'              : choice === 'no' ? '#DC2626'              : '#6B7280',
                              borderColor: choice === 'yes' ? 'rgba(21,128,61,0.25)' : choice === 'no' ? 'rgba(220,38,38,0.25)' : 'rgba(107,114,128,0.25)',
                            }}>
                            {t(`meetings.${choice}`)}
                          </button>
                        ))}
                      </div>
                    )}

                    {isOpen && (
                      <button onClick={() => closeVote.mutate(vote.id)} disabled={closeVote.isPending}
                        style={{ width: '100%', padding: '5px 0', borderRadius: 7, border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        {t('meetings.closeVote')}
                      </button>
                    )}

                    {!isOpen && (
                      <div style={{ fontSize: 11, color: '#15803D', fontWeight: 500 }}>
                        {t('meetings.voteClosed')} — {tally.yes >= tally.no ? t('meetings.voteApproved') : t('meetings.voteRejected')} ({tally.yesPct}% {t('meetings.yes')})
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* New vote modal */}
      {showNewVote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>{t('meetings.addVote')}</h2>
              <button onClick={() => setShowNewVote(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#6E6E73" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('meetings.voteQuestion')} *</label>
                <input value={voteQuestion} onChange={e => setVoteQuestion(e.target.value)}
                  placeholder={t('meetings.voteQuestionPlaceholder')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('meetings.voteDescription')}</label>
                <textarea value={voteDescription} onChange={e => setVoteDescription(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowNewVote(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D1D1D6', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleCreateVote} disabled={createVote.isPending || !voteQuestion.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: !voteQuestion.trim() ? 0.6 : 1 }}>
                {createVote.isPending ? t('common.saving') : t('meetings.openVote')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
