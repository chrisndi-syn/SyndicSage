// ── AI Sage side panel ────────────────────────────────────────
// Floating amber button (bottom-right) → slides in from the right.
// Scoped to the currently selected building.
// Conversation persists across panel open/close within the same session.
// Pages can trigger contextual prompts via useAiSage().openWithPrompt()

import { useState, useRef, useEffect } from 'react'
import { useTranslation }              from 'react-i18next'
import { Sparkles, X, Send, Loader2 }  from 'lucide-react'
import { useBuilding }                 from '../../shared/building/BuildingContext'
import { sendChatMessage }             from './ai.api'
import { useAiSage }                   from './AiSageContext'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

export function AiSagePanel() {
  const { t }                      = useTranslation()
  const { selected: building }     = useBuilding()
  const { isOpen, setOpen, pendingPrompt, clearPending } = useAiSage()

  const [input,   setInput]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [messages, setMessages]     = useState<Message[]>([])
  const [convId,   setConvId]       = useState<string | undefined>()
  const [error,    setError]        = useState('')
  const bottomRef                   = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send contextual prompts triggered from other pages
  useEffect(() => {
    if (pendingPrompt && isOpen) {
      clearPending()
      sendMessage(pendingPrompt)
    }
  }, [pendingPrompt, isOpen, clearPending]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(text: string) {
    if (!text || loading) return

    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await sendChatMessage(text, convId, building?.id)
      setConvId(res.conversation_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.message }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    await sendMessage(input.trim())
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!isOpen)}
        title={t('ai.openSage')}
        style={{
          position:       'fixed',
          bottom:         24,
          right:          24,
          zIndex:         200,
          width:          48,
          height:         48,
          borderRadius:   '50%',
          background:     'linear-gradient(135deg, #F59E0B, #D97706)',
          border:         'none',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          boxShadow:      '0 4px 20px rgba(245,158,11,0.45)',
          transition:     'transform 0.15s, box-shadow 0.15s',
        }}
      >
        <Sparkles size={20} color="#fff" />
      </button>

      {/* Side panel */}
      {isOpen && (
        <div style={{
          position:   'fixed',
          top:        0,
          right:      0,
          bottom:     0,
          width:      380,
          zIndex:     150,
          display:    'flex',
          flexDirection: 'column',
          background: '#fff',
          boxShadow:  '-4px 0 24px rgba(0,0,0,0.12)',
          borderLeft: '1px solid rgba(60,60,67,0.1)',
        }}>
          {/* Header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '14px 16px',
            borderBottom:   '1px solid rgba(60,60,67,0.08)',
            flexShrink:     0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#F59E0B" />
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 600, color: '#1E3A5F' }}>
                AI Sage
              </span>
              {building && (
                <span style={{ fontSize: 11, color: '#6E6E73', background: '#F2F2F7', padding: '2px 7px', borderRadius: 99 }}>
                  {building.name}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#6E6E73' }}>
                <Sparkles size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
                  {t('ai.emptyHint')}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display:       'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom:  10,
                }}
              >
                <div style={{
                  maxWidth:     '82%',
                  padding:      '9px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background:   msg.role === 'user' ? '#1E3A5F' : '#F2F2F7',
                  color:        msg.role === 'user' ? '#fff' : '#1E3A5F',
                  fontSize:     13,
                  lineHeight:   1.5,
                  whiteSpace:   'pre-wrap',
                  wordBreak:    'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                <div style={{ background: '#F2F2F7', borderRadius: '12px 12px 12px 2px', padding: '9px 12px' }}>
                  <Loader2 size={14} color="#6E6E73" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}

            {error && (
              <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              display:      'flex',
              gap:          8,
              padding:      '12px 16px',
              borderTop:    '1px solid rgba(60,60,67,0.08)',
              flexShrink:   0,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('ai.inputPlaceholder')}
              disabled={loading}
              style={{
                flex:         1,
                padding:      '8px 12px',
                borderRadius: 8,
                border:       '1px solid rgba(60,60,67,0.2)',
                fontSize:     13,
                outline:      'none',
                background:   loading ? '#F2F2F7' : '#fff',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width:          36,
                height:         36,
                borderRadius:   8,
                background:     loading || !input.trim() ? '#F2F2F7' : '#F59E0B',
                border:         'none',
                cursor:         loading || !input.trim() ? 'not-allowed' : 'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                flexShrink:     0,
              }}
            >
              <Send size={14} color={loading || !input.trim() ? '#9CA3AF' : '#fff'} />
            </button>
          </form>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
