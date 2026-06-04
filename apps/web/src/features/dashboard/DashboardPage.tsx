// ── Dashboard page ────────────────────────────────────────────

import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { ChevronRight, AlertTriangle, CheckCircle2, Circle, CalendarDays, Users, CreditCard, FileText } from 'lucide-react'
import { Shell }           from '../../components/layout/Shell'
import { Topbar }          from '../../components/layout/Topbar'
import { useBuilding }     from '../../shared/building/BuildingContext'
import { useAuth }         from '../../shared/auth/AuthContext'
import { useDocuments }    from '../documents/useDocuments'
import { useCharges }      from '../charges/useCharges'
import { useMeetings }     from '../meetings/useMeetings'
import { theme }           from '../../lib/theme'

// ── Helpers ────────────────────────────────────────────────────

function greetingKey(): string {
  const h = new Date().getHours()
  if (h < 12) return 'dashboard.greetMorning'
  if (h < 18) return 'dashboard.greetAfternoon'
  return 'dashboard.greetEvening'
}

function firstName(fullName?: string | null, email?: string | null): string {
  if (fullName) return fullName.split(' ')[0] ?? fullName
  if (email)    return email.split('@')[0] ?? ''
  return ''
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, onClick, accent,
}: {
  icon:     React.ReactNode
  label:    string
  value:    string | number
  sub?:     string
  onClick?: () => void
  accent?:  string
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 12, padding: '16px 18px',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,58,95,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: accent ? `${accent}18` : 'rgba(30,58,95,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ?? '#1E3A5F',
        }}>
          {icon}
        </div>
        {onClick && <ChevronRight size={14} color="#C7C7CC" />}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? '#1C1C1E', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: accent ?? '#9CA3AF', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function ActionItem({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.7)', borderRadius: 10,
        padding: '10px 12px', cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: 'rgba(220,38,38,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={13} color="#DC2626" />
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>{text}</span>
      <ChevronRight size={13} color="#DC2626" />
    </div>
  )
}

function CheckItem({ label, done, onClick }: { label: string; done: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={!done ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 0',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        cursor: !done && onClick ? 'pointer' : 'default',
      }}
    >
      {done
        ? <CheckCircle2 size={17} color="#16A34A" style={{ flexShrink: 0 }} />
        : <Circle       size={17} color="#D1D1D6" style={{ flexShrink: 0 }} />
      }
      <span style={{
        fontSize: 13, flex: 1,
        color:      done ? '#6E6E73'  : '#1C1C1E',
        fontWeight: done ? 400        : 500,
        textDecoration: done ? 'line-through' : 'none',
      }}>
        {label}
      </span>
      {!done && onClick && <ChevronRight size={13} color="#C7C7CC" />}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function DashboardPage() {
  const { t }                            = useTranslation()
  const navigate                         = useNavigate()
  const { user }                         = useAuth()
  const { buildings, selected, loading } = useBuilding()

  const meta = user?.user_metadata ?? {}
  const name = firstName(meta['full_name'] as string, user?.email)

  const { data: docs     = [] } = useDocuments(selected?.id)
  const { data: charges  = [] } = useCharges(selected?.id)
  const { data: meetings = [] } = useMeetings(selected?.id)

  if (loading) {
    return (
      <Shell>
        <Topbar title={t('nav.dashboard')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  // ── Stats ──────────────────────────────────────────────────
  const overdueCharges  = charges.filter(c => c.status === 'overdue')
  const pendingCharges  = charges.filter(c => c.status === 'pending')
  const upcomingMeeting = meetings
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  // ── Actions required ───────────────────────────────────────
  const hasInsuranceDoc = docs.some(d => d.category === 'insurance')
  const hasActeDeBase   = docs.some(d => d.category === 'acte_de_base')

  const actions: { text: string; route: string }[] = []
  if (!hasInsuranceDoc)
    actions.push({ text: t('dashboard.actionMissingInsurance'), route: '/documents' })
  if (!hasActeDeBase)
    actions.push({ text: t('dashboard.actionMissingActe'), route: '/documents' })
  if (overdueCharges.length > 0)
    actions.push({ text: t('dashboard.actionOverdueCharges', { count: overdueCharges.length }), route: '/charges' })

  // ── Onboarding checklist ───────────────────────────────────
  const checks = [
    { label: t('dashboard.checkBuilding'),   done: buildings.length > 0,     route: '/buildings' },
    { label: t('dashboard.checkOwners'),     done: (selected?.unit_count ?? 0) > 0, route: '/owners' },
    { label: t('dashboard.checkDocument'),   done: docs.length > 0,          route: '/documents' },
    { label: t('dashboard.checkInsurance'),  done: hasInsuranceDoc,           route: '/documents' },
    { label: t('dashboard.checkActe'),       done: hasActeDeBase || (meta['ob_has_acte'] === true), route: '/documents' },
    { label: t('dashboard.checkMeeting'),    done: meetings.length > 0,      route: '/meetings' },
  ]
  const doneCount = checks.filter(c => c.done).length

  return (
    <Shell>
      <Topbar title={t('nav.dashboard')} subtitle={selected?.name} />
      <div style={{ padding: 24, maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Greeting hero ── */}
        <div style={{
          background: `linear-gradient(135deg, #1E3A5F 0%, #243f6a 100%)`,
          borderRadius: 16, padding: '28px 28px 24px',
          boxShadow: '0 4px 24px rgba(30,58,95,0.18)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative amber circle */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(245,158,11,0.08)',
            pointerEvents: 'none',
          }} />

          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
            {t(greetingKey())}{name ? ',' : ''}
          </p>
          <h1 style={{
            margin: '0 0 10px',
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 36, fontWeight: 600, color: '#fff', lineHeight: 1.1,
          }}>
            {name || 'Welcome back'}
          </h1>

          {selected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 13, color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.08)',
                padding: '4px 12px', borderRadius: 99,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.colors.amber, display: 'inline-block' }} />
                {selected.name}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                {selected.unit_count} {t('buildings.unitCount').toLowerCase()}
              </span>
              {upcomingMeeting && (
                <span
                  onClick={() => navigate('/meetings')}
                  style={{
                    fontSize: 12, color: theme.colors.amber, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.12)',
                    padding: '4px 12px', borderRadius: 99,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <CalendarDays size={12} />
                  {t('dashboard.nextMeeting')}: {new Date(upcomingMeeting.date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {t('common.selectBuilding')}
            </p>
          )}
        </div>

        {/* ── Actions required ── */}
        {actions.length > 0 && (
          <div style={{
            background: 'rgba(220,38,38,0.04)',
            border: '1px solid rgba(220,38,38,0.18)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('dashboard.actionRequired')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {actions.map((a, i) => (
                <ActionItem key={i} text={a.text} onClick={() => navigate(a.route)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            <StatCard
              icon={<Users size={16} />}
              label={t('nav.owners')}
              value={selected.unit_count}
              sub={t('buildings.unitCount').toLowerCase()}
              onClick={() => navigate('/owners')}
            />
            <StatCard
              icon={<CreditCard size={16} />}
              label={t('dashboard.pendingCharges')}
              value={pendingCharges.length}
              sub={pendingCharges.length > 0 ? `€ ${pendingCharges.reduce((s, c) => s + c.amount, 0).toLocaleString('fr-BE')}` : undefined}
              onClick={() => navigate('/charges')}
            />
            <StatCard
              icon={<CreditCard size={16} />}
              label={t('dashboard.overdueCharges')}
              value={overdueCharges.length}
              sub={overdueCharges.length > 0 ? `€ ${overdueCharges.reduce((s, c) => s + c.amount, 0).toLocaleString('fr-BE')}` : t('dashboard.allGood')}
              onClick={() => navigate('/charges')}
              accent={overdueCharges.length > 0 ? '#DC2626' : '#16A34A'}
            />
            <StatCard
              icon={<FileText size={16} />}
              label={t('nav.documents')}
              value={docs.length}
              sub={t('dashboard.uploaded')}
              onClick={() => navigate('/documents')}
            />
          </div>
        )}

        {/* ── Two-column bottom: Checklist + Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Onboarding checklist */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>
                {t('dashboard.setupChecklist')}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: doneCount === checks.length ? 'rgba(22,163,74,0.10)' : 'rgba(245,158,11,0.12)',
                color:      doneCount === checks.length ? '#15803D'               : '#B45309',
              }}>
                {doneCount}/{checks.length}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.round(doneCount / checks.length * 100)}%`,
                background: doneCount === checks.length ? '#16A34A' : theme.colors.amber,
                borderRadius: 99, transition: 'width 0.4s',
              }} />
            </div>

            {checks.map((c, i) => (
              <CheckItem key={i} label={c.label} done={c.done} onClick={() => navigate(c.route)} />
            ))}
          </div>

          {/* Quick links */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: '18px 20px',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', display: 'block', marginBottom: 14 }}>
              {t('dashboard.quickLinks')}
            </span>

            {[
              { label: t('nav.charges'),     route: '/charges',    color: '#2563EB' },
              { label: t('nav.owners'),       route: '/owners',     color: '#7C3AED' },
              { label: t('nav.documents'),    route: '/documents',  color: '#0369A1' },
              { label: t('nav.meetings'),     route: '/meetings',   color: '#B45309' },
              { label: t('nav.votes'),        route: '/votes',      color: '#065F46' },
              { label: t('nav.inbox'),        route: '/inbox',      color: '#9D174D' },
            ].map((item, i) => (
              <div
                key={i}
                onClick={() => navigate(item.route)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < 5 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: item.color, flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{item.label}</span>
                <ChevronRight size={13} color="#C7C7CC" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </Shell>
  )
}
