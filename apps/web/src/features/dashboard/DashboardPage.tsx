// ── Dashboard page ────────────────────────────────────────────

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import { supabase }       from '../../lib/supabase'

interface ActivityEntry {
  id:           string
  action:       string
  resource_type: string
  created_at:   string
  metadata:     Record<string, unknown> | null
}

export default function DashboardPage() {
  const { t }                   = useTranslation()
  const navigate                = useNavigate()
  const { buildings, selected, loading } = useBuilding()

  const [activity, setActivity] = useState<ActivityEntry[]>([])

  // Load recent activity for the selected building
  useEffect(() => {
    if (!selected) return
    supabase
      .from('audit_log')
      .select('id, action, resource_type, created_at, metadata')
      .eq('building_id', selected.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setActivity((data ?? []) as ActivityEntry[]))
  }, [selected?.id])

  if (loading) {
    return (
      <Shell>
        <Topbar title={t('nav.dashboard')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</div>
      </Shell>
    )
  }

  // No buildings yet → guide user to add one
  if (buildings.length === 0) {
    return (
      <Shell>
        <Topbar title={t('nav.dashboard')} />
        <div style={{ padding: 24 }}>
          <WelcomeCard onAdd={() => navigate('/buildings')} t={t} />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <Topbar
        title={t('nav.dashboard')}
        subtitle={selected?.name}
      />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Building cards (small) */}
        {!selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6E6E73' }}>{t('common.selectBuilding')}</p>
          </div>
        )}

        {selected && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard label={t('buildings.unitCount')} value={selected.unit_count.toString()} />
              {selected.vme_number && (
                <StatCard label="KBO" value={selected.vme_number} />
              )}
              <StatCard
                label={t('nav.charges')}
                value="—"
                link="/charges"
                onClick={() => navigate('/charges')}
              />
              <StatCard
                label={t('nav.owners')}
                value="—"
                link="/owners"
                onClick={() => navigate('/owners')}
              />
            </div>

            {/* Recent activity */}
            <div style={{
              background: '#FFFFFF', borderRadius: 10,
              border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid rgba(60,60,67,0.08)',
              }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>
                  {t('dashboard.activity')}
                </h3>
              </div>
              {activity.length === 0 ? (
                <p style={{ padding: '20px', margin: 0, fontSize: 13, color: '#6E6E73' }}>
                  {t('dashboard.noActivity')}
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {activity.map(entry => (
                    <li key={entry.id} style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(60,60,67,0.05)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13, color: '#1E3A5F' }}>
                        {formatAction(entry, t)}
                      </span>
                      <span style={{ fontSize: 11, color: '#6E6E73', whiteSpace: 'nowrap', marginLeft: 16 }}>
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}

// ── Helpers ────────────────────────────────────────────────────

function formatAction(entry: ActivityEntry, t: (k: string) => string): string {
  const meta = entry.metadata ?? {}
  switch (entry.action) {
    case 'charge_create':    return `${t('dashboard.events.chargeCreated')} "${meta['title'] ?? ''}" — €${meta['amount'] ?? ''}`
    case 'charge_mark_paid': return t('dashboard.events.chargePaid')
    case 'charge_delete':    return t('dashboard.events.chargeDeleted')
    case 'owner_add':        return `${t('dashboard.events.ownerAdded')} ${meta['full_name'] ?? ''}`
    case 'owner_remove':     return t('dashboard.events.ownerRemoved')
    case 'document_upload':  return t('dashboard.events.documentUploaded')
    case 'document_download':return t('dashboard.events.documentDownloaded')
    case 'building_update':  return t('dashboard.events.buildingUpdated')
    case 'member_remove':    return t('dashboard.events.memberRemoved')
    default:                 return entry.action.replace(/_/g, ' ')
  }
}

function StatCard({ label, value, onClick }: {
  label:    string
  value:    string
  link?:    string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF', borderRadius: 10, padding: '16px 20px',
        border: '1px solid rgba(60,60,67,0.10)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(30,58,95,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <p style={{ margin: 0, fontSize: 11, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#1E3A5F', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function WelcomeCard({ onAdd, t }: { onAdd: () => void; t: (key: string) => string }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, padding: '40px 32px',
      border: '1px solid rgba(60,60,67,0.10)', textAlign: 'center', maxWidth: 480,
    }}>
      <h2 style={{
        margin: '0 0 8px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 24, fontWeight: 700, color: '#1E3A5F',
      }}>
        {t('dashboard.welcome')}
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6E6E73' }}>
        {t('dashboard.welcomeDesc')}
      </p>
      <button onClick={onAdd} style={{
        padding: '10px 20px', background: '#1E3A5F',
        border: 'none', borderRadius: 7,
        color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {t('buildings.add')}
      </button>
    </div>
  )
}
