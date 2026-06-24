// ── Resident Portal — combined dashboard for co_owner / renter ─
// Shows: charges, upcoming meetings, documents, messages

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { useNavigate }         from 'react-router-dom'
import { CreditCard, CalendarDays, FileText, MessageSquare, ExternalLink, Download, CheckCircle } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface PortalData {
  building:  { name: string; address: string; city: string; ag_date: string | null }
  unit:      { unit_number: string; floor: number | null; unit_type: string; ownership_share: number } | null
  charges:   Array<{ id: string; title: string; amount: number; status: string; due_date: string; paid_date: string | null; period: string }>
  meetings:  Array<{ id: string; title: string; date: string; status: string; agenda: string | null }>
  documents: Array<{ id: string; name: string; category: string; created_at: string; download_url: string | null }>
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
  const [data, setData]     = useState<PortalData | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
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
  const visibleCharges  = data.charges.slice(0, 3)

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
            {visibleCharges.map(charge => {
              const cs = STATUS_COLORS[charge.status] ?? STATUS_COLORS['pending']!
              const canPay = charge.status === 'pending' || charge.status === 'overdue'
              return (
                <div key={charge.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{charge.title}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        {t(`charges.${charge.period}`)} · {t('charges.dueDate')}: {charge.due_date}
                        {charge.paid_date && (
                          <span style={{ marginLeft: 6, color: '#15803D' }}>
                            · <CheckCircle size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('portal.paidOn', { date: charge.paid_date })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', marginBottom: 3 }}>€{charge.amount.toLocaleString()}</div>
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, fontWeight: 500, ...cs }}>
                        {t(`charges.${charge.status}`)}
                      </span>
                    </div>
                  </div>
                  {canPay && (
                    <button
                      onClick={() => handlePayNow(charge.id)}
                      disabled={payingId === charge.id}
                      style={{
                        marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 7,
                        border: 'none', background: charge.status === 'overdue' ? '#DC2626' : '#1E3A5F',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        opacity: payingId === charge.id ? 0.6 : 1,
                      }}
                    >
                      {payingId === charge.id ? t('portal.paymentProcessing') : t('portal.payNow')}
                    </button>
                  )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F5F5F7', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={13} color="#6E6E73" />
                    <div>
                      <div style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(doc.created_at).toLocaleDateString('fr-BE')}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(30,58,95,0.2)', background: '#fff', color: '#1E3A5F', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Download size={12} /> {t('portal.download')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
