import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import {
  Building2, Users, CreditCard, FileText, Bell,
  Settings, LogOut, LayoutDashboard,
} from 'lucide-react'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
}

export function Sidebar() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const navItems: NavItem[] = [
    { to: '/',          icon: <LayoutDashboard size={18} />, label: t('nav.dashboard')  },
    { to: '/buildings', icon: <Building2       size={18} />, label: t('nav.buildings')  },
    { to: '/owners',    icon: <Users           size={18} />, label: t('nav.owners')     },
    { to: '/charges',   icon: <CreditCard      size={18} />, label: t('nav.charges')    },
    { to: '/documents', icon: <FileText        size={18} />, label: t('nav.documents')  },
    { to: '/inbox',     icon: <Bell            size={18} />, label: t('nav.inbox')      },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const width = expanded ? 220 : 52

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width,
        minWidth:        width,
        height:          '100vh',
        background:      '#F0F0F5',
        borderRight:     '1px solid rgba(60,60,67,0.08)',
        display:         'flex',
        flexDirection:   'column',
        transition:      'width 0.2s ease',
        overflow:        'hidden',
        position:        'sticky',
        top:             0,
        flexShrink:      0,
      }}
    >
      {/* Logo mark */}
      <div style={{
        height:         56,
        display:        'flex',
        alignItems:     'center',
        paddingLeft:    14,
        borderBottom:   '1px solid rgba(60,60,67,0.08)',
        overflow:       'hidden',
        whiteSpace:     'nowrap',
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize:   expanded ? 18 : 0,
          fontWeight: 700,
          color:      '#1E3A5F',
          transition: 'font-size 0.2s ease',
          lineHeight: 1,
        }}>
          Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
        </span>
        {!expanded && (
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize:   20,
            fontWeight: 700,
            color:      '#1E3A5F',
          }}>S</span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display:        'flex',
              alignItems:     'center',
              gap:            10,
              padding:        '8px 10px',
              borderRadius:   6,
              textDecoration: 'none',
              background:     isActive ? '#1E3A5F' : 'transparent',
              color:          isActive ? '#FFFFFF' : '#1E3A5F',
              fontWeight:     isActive ? 600 : 400,
              fontSize:       13,
              whiteSpace:     'nowrap',
              overflow:       'hidden',
              transition:     'background 0.15s',
            })}
          >
            {item.icon}
            {expanded && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '8px 6px', borderTop: '1px solid rgba(60,60,67,0.08)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display:        'flex',
            alignItems:     'center',
            gap:            10,
            padding:        '8px 10px',
            borderRadius:   6,
            textDecoration: 'none',
            background:     isActive ? '#1E3A5F' : 'transparent',
            color:          isActive ? '#FFFFFF' : '#1E3A5F',
            fontSize:       13,
            whiteSpace:     'nowrap',
            overflow:       'hidden',
          })}
        >
          <Settings size={18} />
          {expanded && <span>{t('nav.settings')}</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         10,
            padding:     '8px 10px',
            borderRadius: 6,
            border:      'none',
            background:  'transparent',
            color:       '#6E6E73',
            fontSize:    13,
            cursor:      'pointer',
            whiteSpace:  'nowrap',
            overflow:    'hidden',
            width:       '100%',
          }}
        >
          <LogOut size={18} />
          {expanded && <span>{t('auth.signOut')}</span>}
        </button>
      </div>
    </aside>
  )
}
