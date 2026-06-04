import { useAuth }     from '../../shared/auth/AuthContext'
import { useBuilding } from '../../shared/building/BuildingContext'
import { theme }       from '../../lib/theme'
import { ChevronDown } from 'lucide-react'
import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

interface Props {
  title:     string
  subtitle?: string
}

export function Topbar({ title, subtitle }: Props) {
  const { user }                             = useAuth()
  const { buildings, selected, setSelected } = useBuilding()
  const { t }                                = useTranslation()
  const navigate                             = useNavigate()
  const [showSwitcher, setShowSwitcher]      = useState(false)
  const [showUserMenu, setShowUserMenu]      = useState(false)

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??'

  const hasSwitcher = buildings.length > 1

  return (
    <header style={{
      height:         theme.topbarH,
      background:     theme.colors.surface,
      borderBottom:   `1px solid ${theme.colors.border}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 20px',
      flexShrink:     0,
      position:       'sticky',
      top:            0,
      zIndex:         90,
    }}>

      {/* Breadcrumb / title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: theme.colors.textMuted, fontSize: 13 }}>SyndicSage</span>
        <span style={{ color: theme.colors.textMuted, opacity: 0.4, fontSize: 13 }}>/</span>
        <span style={{ color: theme.colors.text, fontSize: 13, fontWeight: 600 }}>{title}</span>
        {subtitle && (
          <>
            <span style={{ color: theme.colors.textMuted, opacity: 0.4, fontSize: 13 }}>/</span>
            <span style={{ color: theme.colors.textMuted, fontSize: 13 }}>{subtitle}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Building switcher */}
        {hasSwitcher && selected && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSwitcher(s => !s)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                padding:      '5px 10px',
                background:   theme.colors.bgLight,
                border:       `1px solid ${theme.colors.border}`,
                borderRadius: theme.radiusSm,
                fontSize:     12,
                color:        theme.colors.text,
                cursor:       'pointer',
                fontWeight:   500,
                fontFamily:   'inherit',
                transition:   'border-color 0.15s',
              }}
            >
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
              </span>
              <ChevronDown size={13} />
            </button>

            {showSwitcher && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setShowSwitcher(false)}
                />
                <div style={{
                  position:     'absolute',
                  top:          'calc(100% + 6px)',
                  right:        0,
                  background:   theme.colors.surface,
                  border:       `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radiusSm,
                  padding:      '4px 0',
                  boxShadow:    theme.shadow,
                  minWidth:     200,
                  zIndex:       50,
                }}>
                  {buildings.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setSelected(b); setShowSwitcher(false) }}
                      style={{
                        display:    'block',
                        width:      '100%',
                        padding:    '8px 14px',
                        textAlign:  'left',
                        background: b.id === selected.id ? theme.colors.amberDim : 'transparent',
                        border:     'none',
                        fontSize:   13,
                        color:      b.id === selected.id ? theme.colors.amber : theme.colors.text,
                        cursor:     'pointer',
                        fontWeight: b.id === selected.id ? 600 : 400,
                        fontFamily: 'inherit',
                        transition: 'background 0.12s',
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* User avatar + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(m => !m)}
            style={{
              width:          32,
              height:         32,
              borderRadius:   '50%',
              background:     `linear-gradient(135deg, ${theme.colors.amber}, #D97706)`,
              color:          theme.colors.navy,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       11,
              fontWeight:     700,
              flexShrink:     0,
              cursor:         'pointer',
              border:         'none',
            }}
          >
            {initials}
          </button>

          {showUserMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setShowUserMenu(false)}
              />
              <div style={{
                position:     'absolute',
                top:          'calc(100% + 6px)',
                right:        0,
                background:   theme.colors.surface,
                border:       `1px solid ${theme.colors.border}`,
                borderRadius: theme.radiusSm,
                padding:      '4px 0',
                boxShadow:    theme.shadow,
                minWidth:     160,
                zIndex:       50,
              }}>
                {user?.email && (
                  <div style={{ padding: '8px 14px 6px', borderBottom: `1px solid ${theme.colors.border}` }}>
                    <div style={{ fontSize: 11, color: theme.colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {user.email}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/profile') }}
                  style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 13, color: theme.colors.text, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {t('nav.profile')}
                </button>
                <button
                  onClick={async () => { setShowUserMenu(false); await supabase.auth.signOut() }}
                  style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 13, color: '#DC2626', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {t('auth.signOut')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
