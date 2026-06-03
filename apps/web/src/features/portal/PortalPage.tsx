// ── Resident Portal — combined dashboard for co_owner / renter ─
// Shows: charges, upcoming meetings, documents, messages

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { useNavigate }         from 'react-router-dom'
import { CreditCard, CalendarDays, FileText, MessageSquare, ExternalLink } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'
import { MOCK_BUILDINGS }      from '../../lib/mockData'

// ── Mock portal data ──────────────────────────────────────────
const MOCK_PORTAL_DATA = {
  'mock-building-1': {
    building: { id: 'mock-building-1', name: 'Résidence les Acacias', address: 'Rue des Acacias 12', city: 'Bruxelles', ag_date: '2026-09-15' },
    unit: { unit_number: '3B', floor: 3, unit_type: 'apartment', ownership_share: 75 },
    charges: [
      { id: 'c1', title: 'Provision Q2 2026', amount: 480, status: 'pending', due_date: '2026-06-30', period: 'quarterly' },
      { id: 'c2', title: 'Provision Q1 2026', amount: 480, status: 'paid', due_date: '2026-03-31', period: 'quarterly' },
    ],
    meetings: [
      { id: 'mtg-1', title: 'Assemblée Générale Ordinaire 2026', date: '2026-09-15T18:00:00Z', status: 'scheduled', agenda: '1. Approbation des comptes\n2. Budget 2027' },
    ],
    documents: [
      { id: 'doc-1', name: 'PV AG 2025.pdf', category: 'minutes', created_at: '2026-01-15T00:00:00Z' },
      { id: 'doc-2', name: 'Budget 2026.pdf', category: 'budget', created_at: '2026-01-10T00:00:00Z' },
    ],
    messages: [
      { id: 'msg-1', subject: 'Bruit au 3ème étage', body: 'Bonjour, merci pour votre signalement.', read_at: null, created_at: '2026-06-03T08:45:00Z', thread_id: 'msg-1', sender_user_id: 'syndic-1' },
    ],
  },
}

interface PortalData {
  building:  { name: string; address: string; city: string; ag_date: string | null }
  unit:      { unit_number: string; floor: number | null; unit_type: string; ownership_share: number } | null
  charges:   Array<{ id: string; title: string; amount: number; status: string; due_date: string; period: string }>
  meetings:  Array<{ id: string; title: string; date: string; status: string; agenda: string | null }>
  documents: Array<{ id: string; name: string; category: string; created_at: string }>
  messages:  Array<{ id: string; subject: string | null; body: string; read_at: string | null; created_at: string; thread_id: string; sender_user_id: string }>
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)', color: '#B45309' },
  paid:     { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
  overdue:  { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626' },
}

export default function PortalPage() {
  const { t }  = useTranslation()
  const navigate = useNavigate()
  const { selected: building } = useBuilding()
  const [data, setData] = useState<PortalData | null>(null)

  useEffect(() => {
    if (!building) return
    if (building.id.startsWith('mock-')) {
      setData((MOCK_PORTAL_DATA as Record<string, PortalData>)[building.id] ?? null)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch(`/api/v1/portal/me?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(setData)
        .catch(console.error)
    })
  }, [building])

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('portal.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  if (!data) {
    return (
      <Shell>
        <Topbar title={t('portal.title')} subtitle={building.name} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  const pendingCharges  = data.charges.filter(c => c.status !== 'paid')
  const pendingTotal    = pendingCharges.reduce((s, c) => s + c.amount, 0)
  const unreadMessages  = data.messages.filter(m => !m.read_at).length

  return (
    <Shell>
      <Topbar title={t('portal.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Unit info */}
        {data.unit && (
          <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2d5491 100%)', borderRadius: 14, padding: '18px 22px', marginBottom: 20, color: '#fff' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('portal.myUnit')}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{t('portal.unitLabel', { number: data.unit.unit_number })}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
              {data.building.address} · {data.building.city}
            </div>
            {data.unit.ownership_share && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                {data.unit.ownership_share}‰ {t('portal.ownershipShare')}
              </div>
            )}
          </div>
        )}

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <CreditCard size={18} />, label: t('portal.pendingCharges'), value: `€${pendingTotal.toLocaleString()}`, color: pendingTotal > 0 ? '#DC2626' : '#15803D' },
            { icon: <MessageSquare size={18} />, label: t('portal.unreadMessages'), value: String(unreadMessages), color: unreadMessages > 0 ? '#B45309' : '#15803D' },
            { icon: <CalendarDays size={18} />, label: t('portal.nextMeeting'), value: data.meetings[0] ? new Date(data.meetings[0].date).toLocaleDateString('fr-BE') : '—', color: '#1E3A5F' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ color: '#6E6E73', marginBottom: 8 }}>{kpi.icon}</div>
              <div style={{ fontSize: 11, color: '#6E6E73', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Charges */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{t('portal.myCharges')}</div>
              <button onClick={() => navigate('/portal/charges')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#F59E0B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('portal.viewAll')} <ExternalLink size={11} />
              </button>
            </div>
            {data.charges.slice(0, 4).map(charge => {
              const cs = STATUS_COLORS[charge.status] ?? STATUS_COLORS['pending']!
              return (
                <div key={charge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{charge.title}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{t(`charges.${charge.period}`)} · {charge.due_date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>€{charge.amount.toLocaleString()}</div>
                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, fontWeight: 500, ...cs }}>
                      {t(`charges.${charge.status}`)}
                    </span>
                  </div>
                </div>
              )
            })}
            {data.charges.length === 0 && <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>{t('common.noData')}</div>}
          </div>

          {/* Messages */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{t('portal.messages')}</div>
              <button onClick={() => navigate('/portal/messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#F59E0B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('portal.viewAll')} <ExternalLink size={11} />
              </button>
            </div>
            {data.messages.slice(0, 4).map(msg => (
              <div key={msg.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: msg.read_at ? 400 : 600, color: '#1C1C1E', flex: 1 }}>
                    {msg.subject ?? t('portal.noSubject')}
                    {!msg.read_at && <span style={{ display: 'inline-block', width: 6, height: 6, background: '#F59E0B', borderRadius: '50%', marginLeft: 6, verticalAlign: 'middle' }} />}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginLeft: 8 }}>
                    {new Date(msg.created_at).toLocaleDateString('fr-BE')}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.body}</div>
              </div>
            ))}
            {data.messages.length === 0 && (
              <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>{t('portal.noMessages')}</div>
            )}
          </div>
        </div>

        {/* Upcoming meetings */}
        {data.meetings.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)', marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 12 }}>{t('portal.upcomingMeetings')}</div>
            {data.meetings.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '8px 0' }}>
                <div style={{ width: 44, textAlign: 'center', background: '#F5F5F7', borderRadius: 8, padding: '6px 0', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#6E6E73', textTransform: 'uppercase' }}>
                    {new Date(m.date).toLocaleString('fr-BE', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F' }}>{new Date(m.date).getDate()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{m.title}</div>
                  {m.agenda && <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 3, whiteSpace: 'pre-line' }}>{m.agenda}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Documents */}
        {data.documents.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)', marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 12 }}>{t('portal.recentDocuments')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F5F5F7', borderRadius: 8, padding: '7px 12px' }}>
                  <FileText size={13} color="#6E6E73" />
                  <span style={{ fontSize: 12, color: '#1C1C1E' }}>{doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
