// ── Messages page (co-owner portal) ─────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Send, X } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useMessages, useSendMessage, useMarkRead } from '../messages/useMessages'
import type { Message }   from '../messages/messages.api'

const DEMO_MESSAGES: Message[] = [
  { id: 't1m1', thread_id: 't1', subject: 'Travaux ascenseur — semaine du 12 mai', body: "Les travaux de maintenance de l'ascenseur auront lieu du 12 au 14 mai. Merci pour votre compréhension.", read_at: null, created_at: '2025-05-08T09:00:00', sender_user_id: 'syndic', building_id: 'demo', organization_id: 'demo' },
  { id: 't2m1', thread_id: 't2', subject: 'Rappel — AG du 15 juin', body: "Nous vous rappelons que l'Assemblée Générale se tiendra le 15 juin à 18h. Ordre du jour en pièce jointe.", read_at: null, created_at: '2025-05-01T10:00:00', sender_user_id: 'syndic', building_id: 'demo', organization_id: 'demo' },
  { id: 't3m1', thread_id: 't3', subject: 'Décompte annuel 2024 disponible', body: 'Votre décompte annuel 2024 est disponible dans la section Documents.', read_at: '2025-02-10T10:00:00', created_at: '2025-02-05T14:00:00', sender_user_id: 'syndic', building_id: 'demo', organization_id: 'demo' },
]

type Thread = { threadId: string; subject: string | null; messages: Message[] }

function groupByThread(messages: Message[]): Thread[] {
  const map = new Map<string, Message[]>()
  for (const m of messages) {
    const arr = map.get(m.thread_id) ?? []
    arr.push(m)
    map.set(m.thread_id, arr)
  }
  return Array.from(map.entries())
    .map(([threadId, msgs]) => ({
      threadId,
      subject: msgs.find(m => m.subject)?.subject ?? null,
      messages: msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }))
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_at ?? ''
      const bLast = b.messages[b.messages.length - 1]?.created_at ?? ''
      return bLast.localeCompare(aLast)
    })
}

export default function MessagesPage() {
  const { t }      = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const { data: realMessages = [], isLoading } = useMessages(isDemoMode ? null : building?.id)
  const messages    = isDemoMode ? DEMO_MESSAGES : realMessages
  const sendMessage = useSendMessage(building?.id ?? '')
  const markRead    = useMarkRead(building?.id ?? '')

  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [replyBody,    setReplyBody]    = useState('')
  const [showNew,      setShowNew]      = useState(false)
  const [newSubject,   setNewSubject]   = useState('')
  const [newBody,      setNewBody]      = useState('')

  if (!building && !isDemoMode) {
    return (
      <Shell>
        <Topbar title={t('messages.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  const threads = groupByThread(messages)
  const active  = threads.find(t => t.threadId === activeThread)

  async function openThread(thread: Thread) {
    setActiveThread(thread.threadId)
    // Mark all unread in thread as read
    for (const m of thread.messages) {
      if (!m.read_at) markRead.mutate(m.id)
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || !activeThread) return
    await sendMessage.mutateAsync({ body: replyBody.trim(), thread_id: activeThread })
    setReplyBody('')
  }

  async function handleNewMessage() {
    if (!newBody.trim()) return
    await sendMessage.mutateAsync({ body: newBody.trim(), subject: newSubject.trim() || undefined })
    setNewSubject('')
    setNewBody('')
    setShowNew(false)
  }

  return (
    <Shell>
      <Topbar title={t('messages.title')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

        {/* Thread list */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => { if (!isDemoMode) { setShowNew(true); setActiveThread(null) } }}
              disabled={isDemoMode}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: isDemoMode ? 'default' : 'pointer', fontSize: 13, fontWeight: 500, opacity: isDemoMode ? 0.5 : 1 }}
            >
              <MessageSquare size={14} /> {t('messages.newMessage')}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading && <div style={{ padding: 16, color: '#6E6E73', fontSize: 13 }}>{t('common.loading')}</div>}
            {!isLoading && threads.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>{t('messages.empty')}</div>
            )}
            {threads.map(thread => {
              const hasUnread = thread.messages.some(m => !m.read_at)
              const lastMsg   = thread.messages[thread.messages.length - 1]
              return (
                <div
                  key={thread.threadId}
                  onClick={() => openThread(thread)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    background: thread.threadId === activeThread ? 'rgba(30,58,95,0.07)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: hasUnread ? 700 : 500, color: '#1C1C1E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {thread.subject ?? t('messages.noSubject')}
                    </div>
                    {hasUnread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 3 }} />}
                  </div>
                  {lastMsg && (
                    <div style={{ fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastMsg.body}
                    </div>
                  )}
                  {lastMsg && (
                    <div style={{ fontSize: 11, color: '#C0C0C5', marginTop: 3 }}>
                      {new Date(lastMsg.created_at).toLocaleDateString('fr-BE')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Message view */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showNew ? (
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1E3A5F' }}>{t('messages.newMessage')}</div>
                <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} color="#6E6E73" />
                </button>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('messages.subject')}</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder={t('messages.subjectPlaceholder')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('messages.body')}</label>
                <textarea value={newBody} onChange={e => setNewBody(e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleNewMessage} disabled={sendMessage.isPending || !newBody.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: !newBody.trim() ? 0.6 : 1 }}>
                  <Send size={14} /> {sendMessage.isPending ? t('common.saving') : t('messages.send')}
                </button>
              </div>
            </div>
          ) : active ? (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1E3A5F', paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  {active.subject ?? t('messages.noSubject')}
                </div>
                {active.messages.map(msg => (
                  <div key={msg.id} style={{ maxWidth: '72%', alignSelf: 'flex-start' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(0,0,0,0.07)', fontSize: 14, color: '#1C1C1E', lineHeight: 1.55 }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      {new Date(msg.created_at).toLocaleString('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {!isDemoMode && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: '12px 24px', display: 'flex', gap: 10, background: '#fff' }}>
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder={t('messages.replyPlaceholder')}
                    rows={2}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, resize: 'none', boxSizing: 'border-box' }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply() }}
                  />
                  <button onClick={handleReply} disabled={sendMessage.isPending || !replyBody.trim()}
                    style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, opacity: !replyBody.trim() ? 0.6 : 1 }}>
                    <Send size={14} /> {t('messages.send')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>{t('messages.selectThread')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
