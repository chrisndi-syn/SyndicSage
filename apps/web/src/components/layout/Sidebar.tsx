import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useBuilding } from '../../shared/building/BuildingContext'
import { theme } from '../../lib/theme'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  FileText, Ticket, Bell, Clock, Map, Vote,
  CalendarDays, BarChart2, Globe, Sparkles,
  Settings, LogOut, ChevronDown, Check, Plus,
  Receipt, TrendingUp, PieChart,
  Shield, HardHat, FileEdit,
} from 'lucide-react'

// Deterministic colour from building name
function avatarColor(name: string): string {
  const palette = ['#1E3A5F','#0891b2','#7c3aed','#059669','#d97706','#db2777','#dc2626']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return palette[Math.abs(h) % palette.length]!
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const SIDEBAR_BG = `linear-gradient(180deg, #1a3357 0%, #1E3A5F 40%, #182f4e 100%)`

export function Sidebar() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const [expanded, setExpanded]         = useState(false)
  const [buildingOpen, setBuildingOpen] = useState(false)
  const { buildings, selected, setSelected } = useBuilding()

  const groups: NavGroup[] = [
    {
      label: 'Management',
      items: [
        { to: '/',          icon: <LayoutDashboard size={17} />, label: t('nav.dashboard')  },
        { to: '/buildings', icon: <Building2       size={17} />, label: t('nav.buildings')  },
        { to: '/owners',    icon: <Users           size={17} />, label: t('nav.owners')     },
        { to: '/charges',   icon: <CreditCard      size={17} />, label: t('nav.charges')    },
        { to: '/documents',  icon: <FileText  size={17} />, label: t('nav.documents')  },
        { to: '/tickets',    icon: <Ticket    size={17} />, label: t('nav.tickets')    },
        { to: '/insurance',  icon: <Shield    size={17} />, label: t('nav.insurance')  },
        { to: '/contractors',icon: <HardHat   size={17} />, label: t('nav.contractors')},
        { to: '/templates',  icon: <FileEdit  size={17} />, label: t('nav.templates')  },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/inbox',     icon: <Bell            size={17} />, label: t('nav.inbox')      },
        { to: '/timeline',  icon: <Clock           size={17} />, label: t('nav.timeline')   },
        { to: '/roadmap',   icon: <Map             size={17} />, label: t('nav.roadmap')    },
      ],
    },
    {
      label: 'Accounting',
      items: [
        { to: '/expenses', icon: <Receipt    size={17} />, label: t('nav.expenses') },
        { to: '/income',   icon: <TrendingUp size={17} />, label: t('nav.income')   },
        { to: '/budget',   icon: <BarChart2  size={17} />, label: t('nav.budget')   },
        { to: '/bilan',    icon: <PieChart   size={17} />, label: t('nav.bilan')    },
      ],
    },
    {
      label: 'Governance',
      items: [
        { to: '/votes',     icon: <Vote            size={17} />, label: t('nav.votes')      },
        { to: '/meetings',  icon: <CalendarDays    size={17} />, label: t('nav.meetings')   },
        { to: '/reports',   icon: <BarChart2       size={17} />, label: t('nav.reports')    },
        { to: '/portal',    icon: <Globe           size={17} />, label: t('nav.portal')     },
        { to: '/ai',        icon: <Sparkles        size={17} />, label: t('nav.ai')         },
      ],
    },
  ]

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    navigate('/login', { replace: true })
  }

  const w = expanded ? theme.sidebarOpen : theme.sidebarW

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width:         w,
        minWidth:      w,
        height:        '100vh',
        background:    SIDEBAR_BG,
        boxShadow:     '1px 0 0 rgba(255,255,255,0.06)',
        display:       'flex',
        flexDirection: 'column',
        transition:    `width ${theme.transition}`,
        overflow:      'hidden',
        position:      'sticky',
        top:           0,
        flexShrink:    0,
        zIndex:        100,
      }}
    >
      {/* Logo row */}
      <div style={{
        height:       theme.topbarH,
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '0 13px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink:   0,
        overflow:     'hidden',
        whiteSpace:   'nowrap',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 26, height: 26, flexShrink: 0,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="14" width="24" height="14" rx="2" stroke="#F59E0B" strokeWidth="2"/>
            <rect x="12" y="20" width="8" height="8" rx="1" fill="#F59E0B"/>
            <path d="M2 14L16 4L30 14" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        {/* Logo text — fades in on expand */}
        <span style={{
          fontFamily:  "'Cormorant Garamond', Georgia, serif",
          fontSize:    22,
          fontWeight:  600,
          color:       '#fff',
          whiteSpace:  'nowrap',
          opacity:     expanded ? 1 : 0,
          maxWidth:    expanded ? 160 : 0,
          overflow:    'hidden',
          transition:  `opacity ${theme.transition}, max-width ${theme.transition}`,
          lineHeight:  1,
          paddingTop:  2,
        }}>
          Syndic<span style={{ color: theme.colors.amber }}>Sage</span>
        </span>
      </div>

      {/* Building selector */}
      {buildings.length > 0 && (
        <div style={{ margin: '8px 8px 4px', flexShrink: 0, position: 'relative' }}>
          {/* Section label */}
          <div style={{
            fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '0 4px 5px', whiteSpace: 'nowrap',
            opacity: expanded ? 1 : 0, transition: `opacity ${theme.transition}`,
          }}>
            Building
          </div>

          {/* Selector button */}
          <button
            onClick={() => expanded && setBuildingOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: expanded ? 8 : 0,
              width: '100%', padding: '7px 4px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: theme.radiusSm, cursor: 'pointer',
              transition: `gap ${theme.transition}, justify-content ${theme.transition}`,
            }}
          >
            {/* Initials avatar */}
            <div style={{
              width: 28, height: 28, flexShrink: 0,
              borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: selected ? avatarColor(selected.name) : 'rgba(255,255,255,0.15)',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {selected ? initials(selected.name) : '?'}
            </div>

            {/* Name + chevron */}
            <div style={{
              flex: 1, minWidth: 0,
              opacity: expanded ? 1 : 0, maxWidth: expanded ? 160 : 0, overflow: 'hidden',
              transition: `opacity ${theme.transition}, max-width ${theme.transition}`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.name ?? 'Select building'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  {selected ? `${selected.unit_count} units` : ''}
                </div>
              </div>
              <ChevronDown
                size={13}
                style={{
                  flexShrink: 0, color: 'rgba(255,255,255,0.45)',
                  transform: buildingOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.18s',
                }}
              />
            </div>
          </button>

          {/* Dropdown */}
          {buildingOpen && expanded && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setBuildingOpen(false)}
              />
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
                background: '#0f1f38',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: theme.radiusSm, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)', zIndex: 200,
              }}>
                {buildings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelected(b); setBuildingOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '9px 10px',
                      background: b.id === selected?.id ? 'rgba(245,158,11,0.14)' : 'transparent',
                      borderLeft: b.id === selected?.id ? `2px solid ${theme.colors.amber}` : '2px solid transparent',
                      border: 'none', cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, flexShrink: 0, borderRadius: 6,
                      background: avatarColor(b.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {initials(b.name)}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 12, fontWeight: 500, textAlign: 'left',
                      color: b.id === selected?.id ? theme.colors.amber : 'rgba(255,255,255,0.85)',
                    }}>
                      {b.name}
                    </span>
                    {b.id === selected?.id && (
                      <Check size={12} color={theme.colors.amber} />
                    )}
                  </button>
                ))}
                {/* Add building */}
                <button
                  onClick={() => { setBuildingOpen(false); navigate('/buildings') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 10px',
                    background: 'transparent', border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 24, height: 24, flexShrink: 0, borderRadius: 6,
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus size={12} color="rgba(255,255,255,0.45)" />
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    Add building…
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Nav groups */}
      <nav style={{
        flex:       1,
        overflowY:  'auto',
        overflowX:  'hidden',
        padding:    '6px 0',
      }}>
        {groups.map(group => (
          <div key={group.label}>
            {/* Group label */}
            <div style={{
              fontSize:      10,
              fontWeight:    600,
              color:         'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding:       '10px 16px 4px',
              whiteSpace:    'nowrap',
              opacity:       expanded ? 1 : 0,
              transition:    `opacity ${theme.transition}`,
            }}>
              {group.label}
            </div>

            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  gap:            10,
                  height:         38,
                  padding:        expanded ? '0 12px' : '0 6px',
                  borderRadius:   8,
                  margin:         '1px 6px',
                  textDecoration: 'none',
                  background:     isActive ? theme.colors.amberActive : 'transparent',
                  transition:     `background 0.12s, padding ${theme.transition}, justify-content ${theme.transition}`,
                  whiteSpace:     'nowrap',
                  overflow:       'hidden',
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{
                      width:      28,
                      height:     28,
                      flexShrink: 0,
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:      isActive ? theme.colors.amber : 'rgba(255,255,255,0.55)',
                      transition: 'color 0.15s',
                    }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize:   13,
                      fontWeight: isActive ? 600 : 500,
                      color:      isActive ? theme.colors.amber : 'rgba(255,255,255,0.65)',
                      opacity:    expanded ? 1 : 0,
                      maxWidth:   expanded ? 160 : 0,
                      overflow:   'hidden',
                      transition: `opacity ${theme.transition}, max-width ${theme.transition}`,
                    }}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom — settings + logout */}
      <div style={{
        borderTop:  '1px solid rgba(255,255,255,0.07)',
        padding:    '8px 0',
        flexShrink: 0,
      }}>
        {[
          { to: '/settings', icon: <Settings size={17} />, label: t('nav.settings'), isLink: true  },
          { to: null,        icon: <LogOut   size={17} />, label: t('auth.signOut'),  isLink: false },
        ].map((item, i) => {
          const inner = (isActive = false) => (
            <>
              <span style={{
                width:    28, height: 28, flexShrink: 0,
                display:  'flex', alignItems: 'center', justifyContent: 'center',
                color:    isActive ? theme.colors.amber : 'rgba(255,255,255,0.55)',
                transition: 'color 0.15s',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize:   13,
                fontWeight: 500,
                color:      isActive ? theme.colors.amber : 'rgba(255,255,255,0.55)',
                opacity:    expanded ? 1 : 0,
                maxWidth:   expanded ? 160 : 0,
                overflow:   'hidden',
                transition: `opacity ${theme.transition}, max-width ${theme.transition}`,
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            </>
          )

          if (item.isLink) {
            return (
              <NavLink
                key={i}
                to="/settings"
                style={({ isActive }) => ({
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  gap:            10,
                  height:         38,
                  padding:        expanded ? '0 12px' : '0 6px',
                  borderRadius:   8,
                  margin:         '1px 6px',
                  textDecoration: 'none',
                  background:     isActive ? theme.colors.amberActive : 'transparent',
                  transition:     `background 0.12s, padding ${theme.transition}`,
                })}
              >
                {({ isActive }) => inner(isActive)}
              </NavLink>
            )
          }

          return (
            <button
              key={i}
              onClick={handleLogout}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: expanded ? 'flex-start' : 'center',
                gap:            10,
                height:         38,
                padding:        expanded ? '0 12px' : '0 6px',
                borderRadius:   8,
                margin:         '1px 6px',
                border:         'none',
                background:     'transparent',
                cursor:         'pointer',
                width:          'calc(100% - 12px)',
                transition:     `background 0.12s, padding ${theme.transition}`,
              }}
            >
              {inner()}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
