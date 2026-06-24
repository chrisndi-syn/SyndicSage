// ── Journey Context ────────────────────────────────────────────
// Computes stage unlock status + manages the gate modal shown
// when a user clicks a locked sidebar section.

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Map, X } from 'lucide-react'
import { useBuilding } from '../../shared/building/BuildingContext'
import { useCharges }  from '../charges/useCharges'
import { useExpenses } from '../accounting/useExpenses'
import { useMeetings } from '../meetings/useMeetings'
import { theme }       from '../../lib/theme'

// ── Types ──────────────────────────────────────────────────────

export type StageStatus = 'done' | 'current' | 'locked'

export interface Stage {
  id:          string
  number:      number
  groupId:     string          // sidebar group this stage controls
  titleKey:    string
  descKey:     string
  status:      StageStatus
  proRequired: boolean
  tasks:       { labelKey: string; done: boolean }[]
}

interface JourneyContextValue {
  stages:           Stage[]
  isGroupUnlocked:  (groupId: string) => boolean
  openGate:         (groupId: string) => void
}

// ── Context ────────────────────────────────────────────────────

const JourneyContext = createContext<JourneyContextValue>({
  stages:          [],
  isGroupUnlocked: () => true,
  openGate:        () => {},
})

export function useJourney() {
  return useContext(JourneyContext)
}

// ── Gate Modal ─────────────────────────────────────────────────

function GateModal({ groupId, stages, onClose }: {
  groupId: string
  stages:  Stage[]
  onClose: () => void
}) {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const blockedStage  = stages.find(s => s.groupId === groupId)
  const requiredStage = stages.find(s => s.id === blockedStage?.id)
  const prevStage     = stages.find(s => s.number === (blockedStage?.number ?? 1) - 1)

  const label = prevStage
    ? t(prevStage.titleKey)
    : t('journey.stage1Title')

  return (
    <div
      onClick={onClose}
      style={{
        position:        'fixed', inset: 0, zIndex: 1000,
        background:      'rgba(0,0,0,0.45)',
        display:         'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter:  'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   '#fff', borderRadius: 20, padding: '32px 28px',
          width:        360, boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          textAlign:    'center', position: 'relative',
          animation:    'journeyGatePop 0.2s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#9CA3AF', padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {/* Lock icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
          background: 'rgba(245,158,11,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={28} color={theme.colors.amber} />
        </div>

        <h3 style={{
          margin: '0 0 8px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: theme.colors.navy,
        }}>
          {t('journey.gateTitle')}
        </h3>

        <p style={{ margin: '0 0 6px', fontSize: 14, color: '#6E6E73', lineHeight: 1.5 }}>
          {t('journey.gateDesc')}
        </p>

        {blockedStage?.proRequired && (
          <p style={{
            margin: '8px 0 0', fontSize: 12, fontWeight: 600,
            color: theme.colors.amber,
            background: 'rgba(245,158,11,0.08)',
            padding: '6px 12px', borderRadius: 8, display: 'inline-block',
          }}>
            {t('journey.proRequired')}
          </p>
        )}

        <div style={{
          margin: '20px 0',
          padding: '12px 16px',
          background: 'rgba(30,58,95,0.04)',
          borderRadius: 10, fontSize: 13, color: theme.colors.text,
          fontWeight: 500,
        }}>
          {t('journey.gateRequires', { stage: label })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1px solid rgba(30,58,95,0.12)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: '#6E6E73',
            }}
          >
            {t('common.close')}
          </button>
          <button
            onClick={() => { onClose(); navigate('/journey') }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: 'none', background: theme.colors.navy,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <Map size={14} />
            {t('journey.viewJourney')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Provider ───────────────────────────────────────────────────

export function JourneyProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { buildings, selected, orgPlan } = useBuilding()
  const { data: charges  = [] } = useCharges(selected?.id)
  const { data: expenses = [] } = useExpenses(selected?.id, new Date().getFullYear())
  const { data: meetings = [] } = useMeetings(selected?.id)

  const [gateGroupId, setGateGroupId] = useState<string | null>(null)

  // ── Stage completion ─────────────────────────────────────────
  const hasBuilding = buildings.length > 0
  const hasOwners   = (selected?.unit_count ?? 0) > 0
  const hasCharge   = charges.length > 0
  const hasExpense  = expenses.length > 0
  const hasMeeting  = meetings.length > 0
  const isPro       = orgPlan === 'pro' || orgPlan === 'enterprise'

  const stage1Done  = hasBuilding && hasOwners && hasCharge
  const stage2Done  = stage1Done && hasExpense
  const stage3Done  = stage2Done && hasMeeting
  const stage4Done  = stage3Done && isPro

  // ── Stages definition ────────────────────────────────────────
  const stages: Stage[] = [
    {
      id:          'foundation',
      number:      1,
      groupId:     'management',
      titleKey:    'journey.stage1Title',
      descKey:     'journey.stage1Desc',
      proRequired: false,
      status:      stage1Done ? 'done' : 'current',
      tasks: [
        { labelKey: 'journey.task1a', done: hasBuilding },
        { labelKey: 'journey.task1b', done: hasOwners   },
        { labelKey: 'journey.task1c', done: hasCharge   },
      ],
    },
    {
      id:          'finances',
      number:      2,
      groupId:     'accounting',
      titleKey:    'journey.stage2Title',
      descKey:     'journey.stage2Desc',
      proRequired: false,
      status:      stage2Done ? 'done' : stage1Done ? 'current' : 'locked',
      tasks: [
        { labelKey: 'journey.task2a', done: hasExpense },
      ],
    },
    {
      id:          'governance',
      number:      3,
      groupId:     'governance',
      titleKey:    'journey.stage3Title',
      descKey:     'journey.stage3Desc',
      proRequired: false,
      status:      stage3Done ? 'done' : stage2Done ? 'current' : 'locked',
      tasks: [
        { labelKey: 'journey.task3a', done: hasMeeting },
      ],
    },
    {
      id:          'community',
      number:      4,
      groupId:     'communication',
      titleKey:    'journey.stage4Title',
      descKey:     'journey.stage4Desc',
      proRequired: true,
      status:      stage4Done ? 'done' : stage3Done && isPro ? 'current' : 'locked',
      tasks: [
        { labelKey: 'journey.task4a', done: isPro    },
        { labelKey: 'journey.task4b', done: stage3Done },
      ],
    },
  ]

  function isGroupUnlocked(groupId: string) {
    const stage = stages.find(s => s.groupId === groupId)
    if (!stage) return true
    return stage.status !== 'locked'
  }

  function openGate(groupId: string) {
    setGateGroupId(groupId)
  }

  return (
    <JourneyContext.Provider value={{ stages, isGroupUnlocked, openGate }}>
      {children}
      {gateGroupId && (
        <GateModal
          groupId={gateGroupId}
          stages={stages}
          onClose={() => setGateGroupId(null)}
        />
      )}
      <style>{`
        @keyframes journeyGatePop {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes journeyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(245,158,11,0); }
        }
      `}</style>
    </JourneyContext.Provider>
  )
}
