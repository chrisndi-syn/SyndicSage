import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useBuilding } from '../../shared/building/BuildingContext'
import { useUnreadCount } from '../../features/inbox/useInbox'
import { theme } from '../../lib/theme'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  FileText, Ticket, Bell, Clock, Map, Vote,
  CalendarDays, BarChart2, Globe,
  Settings, LogOut,
  Receipt, TrendingUp, PieChart,
  Shield, HardHat, FileEdit, UserCircle, Wrench,
  ChevronDown, Lock, Pin, PinOff, Eye,
} from 'lucide-react'
import { useJourney } from '../../features/journey/JourneyContext'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
  badge?: number
}

interface NavGroup {
  id:    string
  label: string
  icon:  React.ReactNode   // representative icon shown when sidebar is collapsed
  items: NavItem[]
}

const SIDEBAR_COLLAPSED = 52
const SIDEBAR_EXPANDED  = 220
const SIDEBAR_BG        = '#ffffff'

export function Sidebar() {
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const location     = useLocation()
  const { myRole }   = useBuilding()
  const unreadCount  = useUnreadCount()
  const [searchParams] = useSearchParams()
  const isResident   = myRole === 'co_owner' || myRole === 'renter'
    || (location.pathname.startsWith('/portal') && searchParams.get('demo') === '1')
  const [pinned,   setPinned]   = useState(() => localStorage.getItem('syndicsage_sidebar_pinned') === '1')
  const [hovered,  setHovered]  = useState(false)
  const expanded = pinned || hovered

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('syndicsage_sidebar_pinned', next ? '1' : '0')
  }

  const { isGroupUnlocked, openGate } = useJourney()

  // ── Resident nav ────────────────────────────────────────────────
  const residentGroups: NavGroup[] = [
    {
      id: 'portal',
      label: t('nav.groupPortal'),
      icon: <LayoutDashboard size={17} />,
      items: [
        { to: '/portal',           icon: <LayoutDashboard size={16} />, label: t('portal.home') },
        { to: '/portal/charges',   icon: <CreditCard      size={16} />, label: t('portal.myCharges') },
        { to: '/portal/messages',  icon: <Bell            size={16} />, label: t('portal.messages'), badge: unreadCount || undefined },
        { to: '/portal/requests',  icon: <Ticket          size={16} />, label: t('portal.requests') },
        { to: '/portal/documents', icon: <FileText        size={16} />, label: t('nav.documents') },
        { to: '/meetings',         icon: <CalendarDays    size={16} />, label: t('nav.meetings') },
      ],
    },
  ]

  // ── Syndic nav ────────────────────────────────────────────────
  const syndicGroups: NavGroup[] = [
    {
      id: 'management',
      label: t('nav.groupManagement'),
      icon: <Building2 size={17} />,
      items: [
        { to: '/',            icon: <LayoutDashboard size={16} />, label: t('nav.dashboard')   },
        { to: '/buildings',   icon: <Building2       size={16} />, label: t('nav.buildings')   },
        { to: '/owners',      icon: <Users           size={16} />, label: t('nav.owners')      },
        { to: '/charges',     icon: <CreditCard      size={16} />, label: t('nav.charges')     },
        { to: '/documents',   icon: <FileText        size={16} />, label: t('nav.documents')   },
        { to: '/tickets',     icon: <Ticket          size={16} />, label: t('nav.tickets')     },
        { to: '/insurance',   icon: <Shield          size={16} />, label: t('nav.insurance')   },
        { to: '/contractors', icon: <HardHat         size={16} />, label: t('nav.contractors') },
        { to: '/templates',   icon: <FileEdit        size={16} />, label: t('nav.templates')   },
        { to: '/maintenance', icon: <Wrench          size={16} />, label: t('nav.maintenance') },
      ],
    },
    {
      id: 'communication',
      label: t('nav.groupCommunication'),
      icon: <Bell size={17} />,
      items: [
        { to: '/inbox',    icon: <Bell  size={16} />, label: t('nav.inbox'),    badge: unreadCount || undefined },
        { to: '/timeline', icon: <Clock size={16} />, label: t('nav.timeline') },
        { to: '/roadmap',  icon: <Map   size={16} />, label: t('nav.roadmap')  },
      ],
    },
    {
      id: 'accounting',
      label: t('nav.groupAccounting'),
      icon: <Receipt size={17} />,
      items: [
        { to: '/expenses', icon: <Receipt    size={16} />, label: t('nav.expenses') },
        { to: '/income',   icon: <TrendingUp size={16} />, label: t('nav.income')   },
        { to: '/budget',   icon: <BarChart2  size={16} />, label: t('nav.budget')   },
        { to: '/bilan',    icon: <PieChart   size={16} />, label: t('nav.bilan')    },
      ],
    },
    {
      id: 'governance',
      label: t('nav.groupGovernance'),
      icon: <Vote size={17} />,
      items: [
        { to: '/votes',       icon: <Vote         size={16} />, label: t('nav.votes')       },
        { to: '/meetings',    icon: <CalendarDays size={16} />, label: t('nav.meetings')    },
        { to: '/reports',     icon: <BarChart2    size={16} />, label: t('nav.reports')     },
        { to: '/invitations', icon: <Globe        size={16} />, label: t('nav.invitations') },
      ],
    },
  ]

  const groups = isResident ? residentGroups : syndicGroups

  // Auto-expand the section that contains the active route
  function getActiveGroupId() {
    for (const g of groups) {
      for (const item of g.items) {
        const exact = item.to === '/'
        if (exact ? location.pathname === '/' : location.pathname.startsWith(item.to)) {
          return g.id
        }
      }
    }
    return groups[0]?.id ?? ''
  }

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([getActiveGroupId()]))

  useEffect(() => {
    const activeId = getActiveGroupId()
    setOpenGroups(prev => {
      if (prev.has(activeId)) return prev
      const next = new Set(prev)
      next.add(activeId)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  function toggleGroup(id: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    navigate('/login', { replace: true })
  }

  const w = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED

  return (
    <aside
      onMouseEnter={() => !pinned && setHovered(true)}
      onMouseLeave={() => !pinned && setHovered(false)}
      style={{
        width:         w,
        minWidth:      w,
        height:        '100vh',
        background:    SIDEBAR_BG,
        boxShadow:     '1px 0 0 rgba(30,58,95,0.08)',
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
      {/* Logo */}
      <div style={{
        height:       theme.topbarH,
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '0 13px',
        borderBottom: '1px solid rgba(30,58,95,0.08)',
        flexShrink:   0,
        overflow:     'hidden',
        whiteSpace:   'nowrap',
      }}>
        <div style={{
          width: 27, height: 27, flexShrink: 0,
          background: theme.colors.amberDim,
          border: '1.5px solid rgba(245,158,11,0.5)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
          </svg>
        </div>
        <span style={{
          fontFamily:  "'Cormorant Garamond', Georgia, serif",
          fontSize:    21,
          fontWeight:  600,
          color:       theme.colors.navy,
          whiteSpace:  'nowrap',
          opacity:     expanded ? 1 : 0,
          maxWidth:    expanded ? 140 : 0,
          overflow:    'hidden',
          transition:  `opacity ${theme.transition}, max-width ${theme.transition}`,
          lineHeight:  1,
          paddingTop:  2,
          flex:        1,
        }}>
          Syndic<span style={{ color: theme.colors.amber }}>Sage</span>
        </span>

        {/* Pin button — visible when expanded */}
        <button
          onClick={togglePin}
          title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          style={{
            border:      'none',
            background:  'transparent',
            cursor:      'pointer',
            padding:     4,
            borderRadius: 6,
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
            color:       pinned ? theme.colors.amber : 'rgba(30,58,95,0.5)',
            opacity:     expanded ? 1 : 0,
            pointerEvents: expanded ? 'auto' : 'none',
            transition:  `opacity ${theme.transition}, color 0.15s`,
            flexShrink:  0,
          }}
        >
          {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </div>

      {/* Nav — collapsed: flat icon list | expanded: grouped sections */}
      <nav style={{
        flex:      1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding:   '6px 0 4px',
      }}>

        {/* ── Collapsed: one icon per section ── */}
        {!expanded && (
          <div>
            {groups.map(group => {
              const unlocked    = isGroupUnlocked(group.id)
              const isGroupActive = unlocked && group.items.some(item =>
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)
              )
              const hasBadge = unlocked && group.items.some(item => item.badge && item.badge > 0)
              const firstTo  = group.items[0]?.to ?? '/'

              const sharedIconStyle: React.CSSProperties = {
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                height:         40,
                margin:         '2px 6px',
                borderRadius:   8,
                textDecoration: 'none',
                background:     isGroupActive ? theme.colors.amberActive : 'transparent',
                transition:     'background 0.12s',
                opacity:        unlocked ? 1 : 0.5,
              }

              const iconContent = (
                <span style={{
                  width:    28, height: 28, flexShrink: 0,
                  display:  'flex', alignItems: 'center', justifyContent: 'center',
                  color:    !unlocked ? 'rgba(30,58,95,0.25)'
                          : isGroupActive ? theme.colors.amber
                          : 'rgba(30,58,95,0.65)',
                  position: 'relative',
                }}>
                  {unlocked ? group.icon : <Lock size={15} />}
                  {hasBadge && (
                    <span style={{
                      position:   'absolute', top: 2, right: 2,
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#ef4444',
                      border:     '1.5px solid #fff',
                    }} />
                  )}
                </span>
              )

              if (!unlocked) {
                return (
                  <button
                    key={group.id}
                    title={group.label}
                    onClick={() => openGate(group.id)}
                    style={{ ...sharedIconStyle, border: 'none', cursor: 'pointer', width: 'calc(100% - 12px)' }}
                  >
                    {iconContent}
                  </button>
                )
              }

              return (
                <NavLink
                  key={group.id}
                  to={firstTo}
                  end={firstTo === '/'}
                  title={group.label}
                  style={sharedIconStyle}
                >
                  {iconContent}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* ── Expanded: grouped sections with chevrons ── */}
        {expanded && groups.map(group => {
          const unlocked = isGroupUnlocked(group.id)
          const isOpen   = unlocked && openGroups.has(group.id)
          return (
            <div key={group.id} style={{ opacity: unlocked ? 1 : 0.55 }}>

              {/* Section header */}
              <button
                onClick={() => unlocked ? toggleGroup(group.id) : openGate(group.id)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  width:          '100%',
                  padding:        '8px 16px 6px',
                  border:         'none',
                  background:     'transparent',
                  cursor:         'pointer',
                  marginTop:      8,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                    {unlocked ? group.icon : <Lock size={13} />}
                  </span>
                  <span style={{
                    fontSize:      11,
                    fontWeight:    600,
                    color:         '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    whiteSpace:    'nowrap',
                  }}>
                    {group.label}
                  </span>
                </span>
                <ChevronDown
                  size={11}
                  color="#C4C9D4"
                  style={{
                    transform:  isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: `transform ${theme.transition}`,
                    flexShrink: 0,
                  }}
                />
              </button>

              {/* Section items */}
              <div style={{
                overflow:   'hidden',
                maxHeight:  isOpen ? group.items.length * 38 + 4 + 'px' : '0px',
                transition: `max-height ${theme.transition}`,
              }}>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    style={({ isActive }) => ({
                      display:        'flex',
                      alignItems:     'center',
                      gap:            10,
                      height:         36,
                      padding:        '0 14px',
                      textDecoration: 'none',
                      borderLeft:     isActive ? `3px solid ${theme.colors.amber}` : '3px solid transparent',
                      background:     isActive ? 'rgba(245,158,11,0.06)' : 'transparent',
                      transition:     'background 0.12s, border-color 0.12s',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={{
                          width:          18, flexShrink: 0,
                          display:        'flex', alignItems: 'center', justifyContent: 'center',
                          color:          isActive ? theme.colors.amber : '#9CA3AF',
                          position:       'relative',
                        }}>
                          {item.icon}
                          {item.badge && item.badge > 0 && (
                            <span style={{
                              position:   'absolute', top: 0, right: -2,
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#ef4444',
                              border:     '1.5px solid #fff',
                            }} />
                          )}
                        </span>
                        <span style={{
                          fontSize:     13,
                          fontWeight:   isActive ? 600 : 400,
                          color:        isActive ? theme.colors.amber : '#374151',
                          flex:         1,
                          minWidth:     0,
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                        }}>
                          {item.label}
                        </span>
                        {item.badge && item.badge > 0 && (
                          <span style={{
                            background: '#ef4444', color: '#fff',
                            borderRadius: 99, fontSize: 10, fontWeight: 700,
                            padding: '0 5px', lineHeight: '16px', flexShrink: 0,
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>

            </div>
          )
        })}

      </nav>

      {/* Preview portal — syndic only */}
      {!isResident && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => navigate('/portal?demo=1')}
            title="Preview resident portal"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap:            10,
              height:         36,
              padding:        expanded ? '0 14px' : '0 6px',
              border:         'none',
              borderLeft:     `3px solid transparent`,
              background:     'transparent',
              cursor:         'pointer',
              width:          '100%',
              transition:     `padding ${theme.transition}`,
            }}
          >
            <span style={{
              width: 22, height: 22, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.colors.amber,
            }}>
              <Eye size={15} />
            </span>
            <span style={{
              fontSize:   13, fontWeight: 500,
              color:      theme.colors.amber,
              opacity:    expanded ? 1 : 0,
              maxWidth:   expanded ? 160 : 0,
              overflow:   'hidden',
              transition: `opacity ${theme.transition}, max-width ${theme.transition}`,
              whiteSpace: 'nowrap',
            }}>
              Preview Portal
            </span>
          </button>
        </div>
      )}

      {/* Bottom — profile, settings, logout */}
      <div style={{
        borderTop:  '1px solid rgba(30,58,95,0.08)',
        padding:    '6px 0',
        flexShrink: 0,
      }}>
        {([
          { to: '/profile',  icon: <UserCircle size={16} />, label: t('nav.profile'),  isLink: true  },
          { to: '/settings', icon: <Settings   size={16} />, label: t('nav.settings'), isLink: true  },
          { to: null,        icon: <LogOut     size={16} />, label: t('auth.signOut'),  isLink: false },
        ] as const).map((item, i) => {
          const inner = (isActive = false) => (
            <>
              <span style={{
                width:    22, height: 22, flexShrink: 0,
                display:  'flex', alignItems: 'center', justifyContent: 'center',
                color:    isActive ? theme.colors.amber : '#9CA3AF',
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize:   13,
                fontWeight: isActive ? 600 : 400,
                color:      isActive ? theme.colors.amber : '#374151',
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

          const sharedStyle = {
            display:        'flex',
            alignItems:     'center',
            justifyContent: expanded ? 'flex-start' : 'center',
            gap:            10,
            height:         36,
            padding:        expanded ? '0 14px' : '0 6px',
            cursor:         'pointer',
            transition:     `background 0.12s, padding ${theme.transition}`,
          } as const

          if (item.isLink) {
            return (
              <NavLink
                key={i}
                to={item.to!}
                style={({ isActive }) => ({
                  ...sharedStyle,
                  textDecoration: 'none',
                  borderLeft:     isActive ? `3px solid ${theme.colors.amber}` : '3px solid transparent',
                  background:     isActive ? 'rgba(245,158,11,0.06)' : 'transparent',
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
                ...sharedStyle,
                border:     'none',
                background: 'transparent',
                width:      '100%',
                borderLeft: '3px solid transparent',
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
