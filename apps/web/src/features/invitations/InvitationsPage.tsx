// ── Invitations page (syndic only) ─────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, X, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { useInvitations, useSendInvitation, useRevokeInvitation } from './useInvitations'

const ROLE_OPTIONS = ['co_owner', 'renter'] as const
type InviteRole = typeof ROLE_OPTIONS[number]

const STATUS_STYLES: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  pending:  { bg: 'rgba(245,158,11,0.10)',  color: '#B45309', icon: <Clock size={12} /> },
  accepted: { bg: 'rgba(34,197,94,0.10)',   color: '#15803D', icon: <CheckCircle size={12} /> },
  expired:  { bg: 'rgba(107,114,128,0.10)', color: '#6B7280', icon: <XCircle size={12} /> },
}

interface FormState { email: string; role: InviteRole; unit_id: string }
const EMPTY_FORM: FormState = { email: '', role: 'co_owner', unit_id: '' }

export default function InvitationsPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()

  const { data: invitations = [], isLoading } = useInvitations(building?.id)
  const sendInvitation   = useSendInvitation(building?.id ?? '')
  const revokeInvitation = useRevokeInvitation(building?.id ?? '')

  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM)
  const [error,    setError]    = useState('')

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('invitations.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSend() {
    setError('')
    if (!form.email.trim()) { setError(t('common.required')); return }

    try {
      await sendInvitation.mutateAsync({
        email:   form.email.trim().toLowerCase(),
        role:    form.role,
        unit_id: form.unit_id || undefined,
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (e: unknown) {
      setError((e as Error).message ?? t('common.error'))
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(t('invitations.revokeConfirm'))) return
    await revokeInvitation.mutateAsync(id)
  }

  const pending  = invitations.filter(i => i.status === 'pending')
  const accepted = invitations.filter(i => i.status === 'accepted')
  const expired  = invitations.filter(i => i.status === 'expired')

  return (
    <Shell>
      <Topbar title={t('invitations.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#6E6E73' }}>
            {pending.length} {t('invitations.pending')} · {accepted.length} {t('invitations.accepted')}
          </div>
          <button
            onClick={() => { setShowForm(true); setError('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#1E3A5F', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <UserPlus size={15} /> {t('invitations.invite')}
          </button>
        </div>

        {/* Inline invite form */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid rgba(245,158,11,0.3)', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{t('invitations.newInvite')}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#6E6E73" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('common.email')} *</label>
                <input
                  type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="owner@example.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3C3C43', marginBottom: 5 }}>{t('invitations.role')}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as InviteRole }))}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D1D6', fontSize: 14, background: '#fff', minWidth: 130 }}>
                  <option value="co_owner">{t('invitations.role_co_owner')}</option>
                  <option value="renter">{t('invitations.role_renter')}</option>
                </select>
              </div>
              <button
                onClick={handleSend}
                disabled={sendInvitation.isPending || !form.email.trim()}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1E3A5F', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: !form.email.trim() ? 0.6 : 1 }}
              >
                {sendInvitation.isPending ? t('invitations.sending') : t('invitations.send')}
              </button>
            </div>

            {error && <div style={{ marginTop: 10, fontSize: 13, color: '#DC2626' }}>{error}</div>}
            <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF' }}>{t('invitations.hint')}</div>
          </div>
        )}

        {isLoading ? (
          <div style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
        ) : invitations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
            <UserPlus size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>{t('invitations.empty')}</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
                  {[t('common.email'), t('invitations.role'), t('common.status'), t('invitations.sent'), t('common.actions')].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map(inv => {
                  const ss = STATUS_STYLES[inv.status] ?? STATUS_STYLES['pending']!
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1C1C1E' }}>{inv.email}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#6E6E73' }}>
                        {t(`invitations.role_${inv.role}`)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, ...ss }}>
                          {ss.icon} {t(`invitations.status_${inv.status}`)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#6E6E73' }}>
                        {new Date(inv.created_at).toLocaleDateString('fr-BE')}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {inv.status === 'pending' && (
                          <button onClick={() => handleRevoke(inv.id)} disabled={revokeInvitation.isPending}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Trash2 size={13} /> {t('invitations.revoke')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  )
}
