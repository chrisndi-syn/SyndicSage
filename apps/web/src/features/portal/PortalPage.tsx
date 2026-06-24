// ── Resident Portal — combined dashboard for co_owner / renter ─
// Shows: charges, upcoming meetings, documents, messages

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CreditCard, CalendarDays, FileText, MessageSquare, Download, AlertCircle, Video } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { useAuth }             from '../../shared/auth/AuthContext'
import { supabase }            from '../../lib/supabase'

interface PortalData {
  building:  { name: string; address: string; city: string; ag_date: string | null }
  unit:      { unit_number: string; floor: number | null; unit_type: string; ownership_share: number } | null
  charges:   Array<{ id: string; title: string; amount: number; status: string; due_date: string; paid_date: string | null; period: string }>
  meetings:  Array<{ id: string; title: string; date: string; status: string; agenda: string | null }>
  documents: Array<{ id: string; name: string; category: string; created_at: string; download_url: string | null }>
  messages:  Array<{ id: string; subject: string | null; body: string; read_at: string | null; created_at: string; thread_id: string; sender_user_id: string }>
}

const DEMO_DATA: PortalData = {
  building:  { name: 'Résidence Les Érables', address: 'Rue de la Loi 42', city: 'Bruxelles', ag_date: '2025-06-15' },
  unit:      { unit_number: '3B', floor: 3, unit_type: 'apartment', ownership_share: 85 },
  charges: [
    { id: '1', title: 'Charges communes Q2 2025', amount: 320, status: 'overdue',  due_date: '2025-04-01', paid_date: null,         period: 'quarterly' },
    { id: '2', title: 'Charges communes Q3 2025', amount: 320, status: 'pending',  due_date: '2025-07-01', paid_date: null,         period: 'quarterly' },
    { id: '3', title: 'Charges communes Q1 2025', amount: 310, status: 'paid',     due_date: '2025-01-01', paid_date: '2025-01-08', period: 'quarterly' },
    { id: '4', title: 'Fonds de réserve 2025',    amount: 150, status: 'paid',     due_date: '2025-01-01', paid_date: '2025-01-08', period: 'annual'    },
  ],
  meetings: [
    { id: '1', title: 'Assemblée Générale Ordinaire 2025', date: '2025-06-15T18:00:00', status: 'scheduled', agenda: '1. Approbation des comptes\n2. Budget 2025–2026\n3. Travaux toiture' },
    { id: '2', title: 'AG Extraordinaire — Toiture',      date: '2025-08-20T17:00:00', status: 'scheduled', agenda: '1. Devis toiture\n2. Vote des travaux' },
  ],
  documents: [
    { id: '1', name: 'PV Assemblée Générale 2024',  category: 'minutes',       created_at: '2024-06-20', download_url: null },
    { id: '2', name: 'Acte de base — Les Érables',  category: 'acte_de_base',  created_at: '2023-01-10', download_url: null },
    { id: '3', name: 'Règlement de copropriété',    category: 'legal',         created_at: '2023-01-10', download_url: null },
    { id: '4', name: 'Décompte charges 2024',       category: 'accounting',    created_at: '2025-02-01', download_url: null },
  ],
  messages: [
    { id: '1', subject: 'Travaux ascenseur — semaine du 12 mai', body: "Les travaux de maintenance de l'ascenseur auront lieu du 12 au 14 mai. Merci pour votre compréhension.", read_at: null,                  created_at: '2025-05-08', thread_id: 't1', sender_user_id: 'syndic' },
    { id: '2', subject: 'Rappel — AG du 15 juin',                body: "Nous vous rappelons que l'Assemblée Générale se tiendra le 15 juin à 18h. Ordre du jour en pièce jointe.",     read_at: null,                  created_at: '2025-05-01', thread_id: 't2', sender_user_id: 'syndic' },
    { id: '3', subject: 'Décompte annuel 2024 disponible',       body: 'Votre décompte annuel 2024 est disponible dans la section Documents.',                                            read_at: '2025-02-10T10:00:00', created_at: '2025-02-05', thread_id: 't3', sender_user_id: 'syndic' },
  ],
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)', color: '#B45309' },
  paid:     { bg: 'rgba(34,197,94,0.10)',  color: '#15803D' },
  overdue:  { bg: 'rgba(239,68,68,0.10)',  color: '#DC2626' },
}

function firstName(fullName?: string | null, email?: string | null): string {
  if (fullName) return fullName.split(' ')[0] ?? fullName
  if (email)    return email.split('@')[0] ?? ''
  return ''
}

export default function PortalPage() {
  const { t }  = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemoMode = searchParams.get('demo') === '1'
  const { selected: building } = useBuilding()
  const { user } = useAuth()
  const [data, setData]     = useState<PortalData | null>(isDemoMode ? DEMO_DATA : null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const meta   = user?.user_metadata ?? {}
  const name   = firstName(meta['full_name'] as string, user?.email)
  const h      = new Date().getHours()
  const greetKey = h < 12 ? 'portal.greetMorning' : h < 18 ? 'portal.greetAfternoon' : 'portal.greetEvening'

  useEffect(() => {
    if (isDemoMode) return
    if (!building) return
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

  async function handlePayNow(chargeId: string) {
    if (!building) return
    setPayingId(chargeId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/v1/payments/create?building_id=${building.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ charge_id: chargeId }),
      })
      const json = await res.json() as { checkout_url?: string }
      if (json.checkout_url && /^https:\/\//.test(json.checkout_url)) window.location.href = json.checkout_url
    } finally {
      setPayingId(null)
    }
  }

  async function handleDownload(doc: PortalData['documents'][number]) {
    if (!building) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`/api/v1/portal/document/${doc.id}/url?building_id=${building.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
  }

  if (!building && !isDemoMode) {
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
        <Topbar title={t('portal.title')} subtitle={building?.name ?? (isDemoMode ? DEMO_DATA.building.name : undefined)} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  const pendingCharges  = data.charges.filter(c => c.status !== 'paid')
  const overdueCharge   = data.charges.find(c => c.status === 'overdue')
  const pendingCharge   = pendingCharges.find(c => c.status === 'pending')
  const pendingTotal    = pendingCharges.reduce((s, c) => s + c.amount, 0)
  const unreadMessages  = data.messages.filter(m => !m.read_at).length
  const nextMeeting     = data.meetings[0]
  const latestDoc       = data.documents[0]

  type BtnDef = { label: string; icon: React.ReactNode; danger?: boolean; disabled?: boolean; pro?: boolean; onClick?: () => void }

  // Shared pill button style
  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 99,
    border: '1px solid rgba(0,0,0,0.16)', background: '#fff',
    color: '#374151', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'background 0.12s',
  }

  const sections: Array<{ icon: React.ReactNode; iconBg: string; iconColor: string; title: string; sub?: string; badge?: number; buttons: BtnDef[] }> = [
    {
      icon: <CreditCard size={20} />,
      iconBg: 'rgba(59,130,246,0.10)',
      iconColor: '#2563EB',
      title: t('portal.chargesSection'),
      buttons: [
        ...(overdueCharge ? [{
          label: t('portal.payOverdue', { amount: overdueCharge.amount.toLocaleString() }),
          icon: <AlertCircle size={14} />,
          danger: true,
          onClick: () => handlePayNow(overdueCharge.id),
          disabled: payingId === overdueCharge.id,
        }] : []),
        ...(!overdueCharge && pendingCharge ? [{
          label: payingId === pendingCharge.id ? t('portal.paymentProcessing') : t('portal.payNow'),
          icon: <CreditCard size={14} />,
          onClick: () => handlePayNow(pendingCharge.id),
          disabled: payingId === pendingCharge.id,
        }] : []),
        { label: t('portal.viewAll'), icon: <FileText size={14} />, onClick: () => navigate('/portal/charges') },
      ],
    },
    {
      icon: <MessageSquare size={20} />,
      iconBg: 'rgba(59,130,246,0.10)',
      iconColor: '#2563EB',
      title: t('portal.messagesSection'),
      badge: unreadMessages > 0 ? unreadMessages : undefined,
      buttons: [
        { label: t('portal.openMessages'), icon: <MessageSquare size={14} />, onClick: () => navigate('/portal/messages') },
      ],
    },
    {
      icon: <FileText size={20} />,
      iconBg: 'rgba(59,130,246,0.10)',
      iconColor: '#2563EB',
      title: t('portal.documentsSection'),
      buttons: [
        ...(latestDoc ? [{
          label: t('portal.downloadLatest'),
          icon: <Download size={14} />,
          onClick: () => handleDownload(latestDoc),
        }] : []),
        { label: t('portal.browseAll'), icon: <FileText size={14} />, onClick: () => navigate('/portal/documents') },
      ],
    },
    {
      icon: <CalendarDays size={20} />,
      iconBg: 'rgba(59,130,246,0.10)',
      iconColor: '#2563EB',
      title: t('portal.meetingsSection'),
      sub: nextMeeting
        ? t('portal.meetingsSub', {
            date: new Date(nextMeeting.date).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }),
            time: new Date(nextMeeting.date).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
          })
        : t('portal.noMeetings'),
      buttons: [
        ...(nextMeeting ? [{ label: t('portal.viewAgenda'), icon: <CalendarDays size={14} />, onClick: () => navigate('/portal/meetings') }] : []),
        { label: t('portal.joinOnline'), icon: <Video size={14} />, pro: true, disabled: true },
      ],
    },
  ]

  return (
    <Shell>
      <Topbar title={t('portal.title')} subtitle={building?.name ?? DEMO_DATA.building.name} />
      <div style={{ padding: '40px 48px', background: '#fff', minHeight: '100%' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1.15 }}>
            {t(greetKey)}{name ? `, ${name}` : ''}
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#6B7280' }}>
            {t('portal.title')}
            {data.unit && <> · <strong style={{ color: '#374151' }}>{t('portal.unitLabel', { number: data.unit.unit_number })}</strong></>}
            {' · '}{data.building.name}
          </p>
        </div>

        {/* Overdue alert banner */}
        {overdueCharge && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.20)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 32,
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#991B1B' }}>{overdueCharge.title}</div>
              <div style={{ fontSize: 13, color: '#B91C1C', marginTop: 2 }}>
                €{overdueCharge.amount.toLocaleString()} · {t('charges.dueDate')}: {overdueCharge.due_date}
              </div>
            </div>
            <button
              onClick={() => handlePayNow(overdueCharge.id)}
              disabled={payingId === overdueCharge.id}
              style={{ padding: '8px 18px', borderRadius: 99, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: payingId === overdueCharge.id ? 0.6 : 1 }}
            >
              {payingId === overdueCharge.id ? t('portal.paymentProcessing') : t('portal.payNow')}
            </button>
          </div>
        )}

        {/* Action rows — SD Worx style */}
        <div>
          {sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '22px 0',
                borderTop: idx === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 13, flexShrink: 0,
                background: section.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: section.iconColor,
              }}>
                {section.icon}
              </div>

              {/* Title + sub */}
              <div style={{ minWidth: 180, flex: '0 0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{section.title}</span>
                  {section.badge !== undefined && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#EF4444', color: '#fff', borderRadius: 99, padding: '1px 7px', lineHeight: 1.6 }}>{section.badge}</span>
                  )}
                </div>
                {section.sub && (
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{section.sub}</div>
                )}
              </div>

              {/* Pill buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                {section.buttons.map((btn, bi) => (
                  <button
                    key={bi}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                    style={{
                      ...pill,
                      ...(btn.danger ? { background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626' } : {}),
                      opacity: btn.disabled ? 0.45 : 1,
                      cursor: btn.disabled ? 'default' : 'pointer',
                    }}
                  >
                    {btn.icon}
                    {btn.label}
                    {btn.pro && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.18)', color: '#B45309', padding: '1px 5px', borderRadius: 99 }}>PRO</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Full detail sections ── */}
      <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 40 }}>

        {/* Charges */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{t('portal.chargesSection')}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            {pendingTotal > 0
              ? t('portal.chargesPendingSub', { count: pendingCharges.length, amount: pendingTotal.toLocaleString() })
              : t('portal.chargesAllGood')}
          </div>
          {data.charges.map((charge, i) => {
            const cs = STATUS_COLORS[charge.status] ?? STATUS_COLORS['pending']!
            const canPay = charge.status === 'overdue' || charge.status === 'pending'
            return (
              <div key={charge.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: i === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.08)', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{charge.title}</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    {t('charges.dueDate')}: {charge.due_date}
                    {charge.paid_date && <span style={{ marginLeft: 8, color: '#15803D' }}>· {t('portal.paidOn', { date: charge.paid_date })}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>€{charge.amount.toLocaleString()}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, ...cs }}>{t(`charges.${charge.status}`)}</span>
                  </div>
                  {canPay && (
                    <button
                      onClick={() => handlePayNow(charge.id)}
                      disabled={payingId === charge.id}
                      style={{ padding: '7px 16px', borderRadius: 99, border: 'none', background: charge.status === 'overdue' ? '#DC2626' : '#1E3A5F', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: payingId === charge.id ? 0.6 : 1 }}
                    >
                      {payingId === charge.id ? t('portal.paymentProcessing') : t('portal.payNow')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {data.charges.length === 0 && <div style={{ fontSize: 14, color: '#9CA3AF', paddingTop: 16 }}>{t('common.noData')}</div>}
        </div>

        {/* Messages */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{t('portal.messagesSection')}</div>
          {data.messages.map((msg, i) => (
            <div key={msg.id} style={{ padding: '14px 0', borderTop: i === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!msg.read_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, display: 'inline-block' }} />}
                  <span style={{ fontSize: 14, fontWeight: msg.read_at ? 400 : 600, color: '#111827' }}>{msg.subject ?? t('portal.noSubject')}</span>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{new Date(msg.created_at).toLocaleDateString('fr-BE')}</span>
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6, paddingLeft: msg.read_at ? 0 : 16 }}>{msg.body}</div>
            </div>
          ))}
          {data.messages.length === 0 && <div style={{ fontSize: 14, color: '#9CA3AF', paddingTop: 16 }}>{t('portal.noMessages')}</div>}
        </div>

        {/* Documents */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{t('portal.documentsSection')}</div>
          {data.documents.map((doc, i) => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: i === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.08)', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{new Date(doc.created_at).toLocaleDateString('fr-BE')}</div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(doc)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, border: '1px solid rgba(0,0,0,0.16)', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
              >
                <Download size={13} /> {t('portal.download')}
              </button>
            </div>
          ))}
          {data.documents.length === 0 && <div style={{ fontSize: 14, color: '#9CA3AF', paddingTop: 16 }}>{t('common.noData')}</div>}
        </div>

        {/* Meetings */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{t('portal.meetingsSection')}</div>
          {data.meetings.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 0', borderTop: i === 0 ? '1px solid rgba(0,0,0,0.08)' : 'none', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width: 48, textAlign: 'center', background: '#F3F4F6', borderRadius: 10, padding: '6px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>{new Date(m.date).toLocaleString('fr-BE', { month: 'short' })}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{new Date(m.date).getDate()}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{m.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {new Date(m.date).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {m.agenda && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6, whiteSpace: 'pre-line' }}>{m.agenda}</div>}
              </div>
            </div>
          ))}
          {data.meetings.length === 0 && <div style={{ fontSize: 14, color: '#9CA3AF', paddingTop: 16 }}>{t('portal.noMeetings')}</div>}
        </div>

      </div>
    </Shell>
  )
}
