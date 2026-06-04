import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useBuilding } from '../../shared/building/BuildingContext'
import { useUnreadCount } from '../../features/inbox/useInbox'
import type { MemberRole } from '../../shared/building/BuildingContext'
import { theme } from '../../lib/theme'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  FileText, Ticket, Bell, Clock, Map, Vote,
  CalendarDays, BarChart2, Globe, Sparkles,
  Settings, LogOut,
  Receipt, TrendingUp, PieChart,
  Shield, HardHat, FileEdit, UserCircle,
} from 'lucide-react'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const SIDEBAR_BG = `linear-gradient(180deg, #1a3357 0%, #1E3A5F 40%, #182f4e 100%)`

export function Sidebar() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const { myRole } = useBuilding()
  const unreadCount = useUnreadCount()
  const isResident = myRole === 'co_owner' || myRole === 'renter'

  // ── Resident nav (co_owner / renter) ────────────────────────
  const residentGroups: NavGroup[] = [
    {
      label: 'Portal',
      items: [
        { to: '/portal',          icon: <LayoutDashboard size={17} />, label: t('portal.home') },
        { to: '/portal/charges',  icon: <CreditCard      size={17} />, label: t('portal.myCharges') },
        { to: '/portal/messages', icon: <Bell            size={17} />, label: t('portal.messages'), badge: unreadCount || undefined },
        { to: '/portal/requests', icon: <Ticket          size={17} />, label: t('portal.requests') },
        { to: '/portal/documents',icon: <FileText        size={17} />, label: t('nav.documents') },
        { to: '/meetings',        icon: <CalendarDays    size={17} />, label: t('nav.meetings') },
      ],
    },
  ]

  // ── Syndic nav ────────────────────────────────────────────────
  const syndicGroups: NavGroup[] = [
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
        { to: '/inbox',     icon: <Bell            size={17} />, label: t('nav.inbox'),    badge: unreadCount || undefined },
        { to: '/timeline',  icon: <Clock           size={17} />, label: t('nav.timeline') },
        { to: '/roadmap',   icon: <Map             size={17} />, label: t('nav.roadmap')  },
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
        { to: '/votes',       icon: <Vote         size={17} />, label: t('nav.votes')      },
        { to: '/meetings',    icon: <CalendarDays size={17} />, label: t('nav.meetings')   },
        { to: '/reports',     icon: <BarChart2    size={17} />, label: t('nav.reports')    },
        { to: '/invitations', icon: <Globe        size={17} />, label: t('nav.invitations')},
        { to: '/ai',          icon: <Sparkles     size={17} />, label: t('nav.ai')         },
      ],
    },
  ]

  const groups = isResident ? residentGroups : syndicGroups

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
        <svg width="26" height="26" viewBox="0 0 1024 1024" style={{ flexShrink: 0, borderRadius: 6 }} xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" rx="230" fill="#1E3A5F"/>
          <radialGradient id="ssg" cx="50%" cy="42%" r="52%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0"/>
          </radialGradient>
          <rect width="1024" height="1024" rx="230" fill="url(#ssg)"/>
          <g transform="translate(512,512)" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M-220 -30 L0 -260 L220 -30" strokeWidth="48"/>
            <path d="M-178 -55 L-178 220 Q-178 242 -156 242 L-65 242 L-65 85 L65 85 L65 242 L156 242 Q178 242 178 220 L178 -55" strokeWidth="48"/>
          </g>
        </svg>
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
                      position:   'relative',
                    }}>
                      {item.icon}
                      {/* Unread badge — visible even when sidebar is collapsed */}
                      {item.badge && item.badge > 0 && (
                        <span style={{
                          position:   'absolute', top: 2, right: 2,
                          width: 7, height: 7, borderRadius: '50%',
                          background: '#ef4444',
                          border: '1.5px solid #1E3A5F',
                        }} />
                      )}
                    </span>
                    <span style={{
                      fontSize:   13,
                      fontWeight: isActive ? 600 : 500,
                      color:      isActive ? theme.colors.amber : 'rgba(255,255,255,0.65)',
                      opacity:    expanded ? 1 : 0,
                      maxWidth:   expanded ? 160 : 0,
                      overflow:   'hidden',
                      transition: `opacity ${theme.transition}, max-width ${theme.transition}`,
                      display:    'flex', alignItems: 'center', gap: 6,
                    }}>
                      {item.label}
                      {expanded && item.badge && item.badge > 0 && (
                        <span style={{
                          background: '#ef4444', color: '#fff',
                          borderRadius: 99, fontSize: 10, fontWeight: 700,
                          padding: '0 5px', lineHeight: '16px', flexShrink: 0,
                        }}>
                          {item.badge}
                        </span>
                      )}
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
          { to: '/profile',  icon: <UserCircle size={17} />, label: t('nav.profile'),  isLink: true  },
          { to: '/settings', icon: <Settings   size={17} />, label: t('nav.settings'), isLink: true  },
          { to: null,        icon: <LogOut     size={17} />, label: t('auth.signOut'),  isLink: false },
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
                to={item.to!}
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
