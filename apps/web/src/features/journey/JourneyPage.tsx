// ── Journey Page ───────────────────────────────────────────────
// Visual game-map style progress page showing all 4 stages.

import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2, Receipt, Vote, Bell,
  CheckCircle2, Lock, ChevronRight, ArrowRight, Star,
} from 'lucide-react'
import { Shell }        from '../../components/layout/Shell'
import { Topbar }       from '../../components/layout/Topbar'
import { useJourney, type Stage, type StageStatus } from './JourneyContext'
import { theme }        from '../../lib/theme'

// ── Stage icon map ─────────────────────────────────────────────
const STAGE_ICONS: Record<string, React.ReactNode> = {
  foundation: <Building2 size={22} />,
  finances:   <Receipt   size={22} />,
  governance: <Vote      size={22} />,
  community:  <Bell      size={22} />,
}

// ── Stage colours ─────────────────────────────────────────────
const STAGE_COLORS: Record<StageStatus, { bg: string; border: string; text: string; dot: string }> = {
  done:    { bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.25)',   text: '#15803D', dot: '#16A34A' },
  current: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  text: '#B45309', dot: '#F59E0B' },
  locked:  { bg: 'rgba(30,58,95,0.03)',    border: 'rgba(30,58,95,0.08)',    text: '#9CA3AF', dot: '#D1D5DB' },
}

// ── Stage card ─────────────────────────────────────────────────
function StageCard({ stage, isLast }: { stage: Stage; isLast: boolean }) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const c        = STAGE_COLORS[stage.status]
  const icon     = STAGE_ICONS[stage.id]
  const doneTasks  = stage.tasks.filter(t => t.done).length
  const totalTasks = stage.tasks.length

  return (
    <div style={{ display: 'flex', gap: 20 }}>

      {/* ── Left: connector line + circle ── */}
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        flexShrink:     0,
        width:          48,
      }}>
        {/* Circle */}
        <div style={{
          width:        48, height: 48, borderRadius: '50%', flexShrink: 0,
          background:   stage.status === 'done'    ? '#16A34A'
                      : stage.status === 'current' ? theme.colors.amber
                      : '#E5E7EB',
          display:      'flex', alignItems: 'center', justifyContent: 'center',
          color:        stage.status === 'locked'  ? '#9CA3AF' : '#fff',
          boxShadow:    stage.status === 'current'
                          ? '0 0 0 6px rgba(245,158,11,0.15)'
                          : 'none',
          animation:    stage.status === 'current' ? 'journeyPulse 2.4s ease-in-out infinite' : 'none',
          transition:   'all 0.3s',
          position:     'relative',
        }}>
          {stage.status === 'done'   && <CheckCircle2 size={22} />}
          {stage.status === 'locked' && <Lock size={18} />}
          {stage.status === 'current' && icon}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div style={{
            flex:       1,
            width:      2,
            minHeight:  32,
            background: stage.status === 'done'
                          ? 'linear-gradient(180deg, #16A34A, rgba(22,163,74,0.2))'
                          : 'rgba(30,58,95,0.08)',
            margin:     '6px 0',
            borderRadius: 1,
          }} />
        )}
      </div>

      {/* ── Right: stage card ── */}
      <div style={{
        flex:         1,
        marginBottom: isLast ? 0 : 16,
        background:   c.bg,
        border:       `1.5px solid ${c.border}`,
        borderRadius: 16,
        padding:      '20px 22px',
        opacity:      stage.status === 'locked' ? 0.7 : 1,
        transition:   'opacity 0.2s',
        position:     'relative',
        overflow:     'hidden',
      }}>

        {/* Pro badge */}
        {stage.proRequired && (
          <div style={{
            position:   'absolute', top: 14, right: 14,
            background: 'rgba(245,158,11,0.12)',
            border:     '1px solid rgba(245,158,11,0.3)',
            borderRadius: 99, padding: '2px 10px',
            fontSize: 10, fontWeight: 700,
            color: '#B45309', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Star size={9} fill="#B45309" />
            PRO
          </div>
        )}

        {/* Stage header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: c.text,
          }}>
            {t('journey.stageLabel', { n: stage.number })}
          </span>
          {stage.status === 'done' && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#15803D',
              background: 'rgba(22,163,74,0.12)', borderRadius: 99,
              padding: '1px 8px',
            }}>
              {t('journey.complete')}
            </span>
          )}
        </div>

        <h3 style={{
          margin: '0 0 4px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 20, fontWeight: 700,
          color: stage.status === 'locked' ? '#9CA3AF' : theme.colors.navy,
        }}>
          {t(stage.titleKey)}
        </h3>

        <p style={{
          margin: '0 0 16px', fontSize: 13, lineHeight: 1.55,
          color: stage.status === 'locked' ? '#9CA3AF' : '#4B5563',
        }}>
          {t(stage.descKey)}
        </p>

        {/* Task list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {stage.tasks.map((task, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: task.done ? '#16A34A' : 'rgba(30,58,95,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {task.done
                  ? <CheckCircle2 size={12} color="#fff" />
                  : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D1D5DB' }} />
                }
              </div>
              <span style={{
                fontSize: 13,
                color: task.done ? '#6B7280' : stage.status === 'locked' ? '#9CA3AF' : '#1C1C1E',
                fontWeight: task.done ? 400 : 500,
                textDecoration: task.done ? 'line-through' : 'none',
              }}>
                {t(task.labelKey)}
              </span>
            </div>
          ))}
        </div>

        {/* CTA — current stage only */}
        {stage.status === 'current' && (
          <button
            onClick={() => {
              const routeMap: Record<string, string> = {
                management:   '/buildings',
                accounting:   '/expenses',
                governance:   '/meetings',
                communication:'/inbox',
              }
              navigate(routeMap[stage.groupId] ?? '/')
            }}
            style={{
              marginTop:    16,
              display:      'flex', alignItems: 'center', gap: 6,
              padding:      '9px 16px', borderRadius: 10,
              border:       'none', background: theme.colors.amber,
              color:        '#fff', cursor: 'pointer',
              fontSize:     13, fontWeight: 600,
              width:        'fit-content',
            }}
          >
            {t('journey.continueStage')}
            <ArrowRight size={14} />
          </button>
        )}

        {/* Progress indicator for multi-task stages */}
        {totalTasks > 1 && stage.status !== 'locked' && (
          <div style={{
            position: 'absolute', bottom: 14, right: 16,
            fontSize: 11, fontWeight: 600, color: c.text,
          }}>
            {doneTasks}/{totalTasks}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function JourneyPage() {
  const { t }             = useTranslation()
  const navigate          = useNavigate()
  const [searchParams]    = useSearchParams()
  const { stages: real }  = useJourney()

  // ?demo=1 forces a "fresh account" view so you can see locked states
  const isDemoMode = searchParams.get('demo') === '1'
  const stages: Stage[] = isDemoMode
    ? real.map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'locked', tasks: s.tasks.map(t => ({ ...t, done: false })) }))
    : real

  const doneCount    = stages.filter(s => s.status === 'done').length
  const currentStage = stages.find(s => s.status === 'current')
  const allDone      = doneCount === stages.length

  return (
    <Shell>
      <Topbar title={t('journey.title')} />
      <div style={{ padding: '24px 24px 48px', maxWidth: 640 }}>

        {/* ── Hero ── */}
        <div style={{
          background:   `linear-gradient(135deg, ${theme.colors.navy} 0%, #243f6a 100%)`,
          borderRadius: 20, padding: '28px 28px 26px',
          marginBottom: 32,
          boxShadow:    '0 8px 32px rgba(30,58,95,0.20)',
          position:     'relative', overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(245,158,11,0.07)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(245,158,11,0.04)', pointerEvents: 'none',
          }} />

          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {t('journey.subtitle')}
          </p>
          <h1 style={{
            margin: '0 0 16px',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.1,
          }}>
            {t('journey.title')}
          </h1>

          {/* Overall progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {t('journey.progress')}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: theme.colors.amber }}>
                {doneCount}/{stages.length}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width:  `${Math.round(doneCount / stages.length * 100)}%`,
                background: allDone
                  ? '#16A34A'
                  : `linear-gradient(90deg, ${theme.colors.amber}, #fbbf24)`,
                transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>

          {currentStage && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {t('journey.currentStageHint', { stage: t(currentStage.titleKey) })}
            </p>
          )}
          {allDone && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: theme.colors.amber, fontWeight: 600 }}>
              🎉 {t('journey.allDone')}
            </p>
          )}
        </div>

        {/* ── Stage map ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {stages.map((stage, i) => (
            <StageCard key={stage.id} stage={stage} isLast={i === stages.length - 1} />
          ))}
        </div>

      </div>
    </Shell>
  )
}
