import { useAuth }     from '../../shared/auth/AuthContext'
import { useBuilding } from '../../shared/building/BuildingContext'
import { ChevronDown } from 'lucide-react'
import { useState }    from 'react'

interface Props {
  title:     string
  subtitle?: string
}

export function Topbar({ title, subtitle }: Props) {
  const { user }                    = useAuth()
  const { buildings, selected, setSelected } = useBuilding()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  // Show switcher only when there are multiple buildings
  const hasSwitcher = buildings.length > 1

  return (
    <header style={{
      height:         56,
      background:     '#FFFFFF',
      borderBottom:   '1px solid rgba(60,60,67,0.08)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 24px',
      flexShrink:     0,
      position:       'relative',
      zIndex:         50,
    }}>
      <div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize:   20, fontWeight: 700, color: '#1E3A5F',
          margin:     0, lineHeight: 1,
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: '#6E6E73', fontSize: 12, margin: '2px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Building switcher */}
        {hasSwitcher && selected && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSwitcher(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: '#F2F2F7',
                border: '1px solid rgba(60,60,67,0.10)',
                borderRadius: 7,
                fontSize: 12, color: '#1E3A5F', cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <span style={{
                maxWidth: 140, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {selected.name}
              </span>
              <ChevronDown size={14} />
            </button>

            {showSwitcher && (
              <>
                {/* Backdrop */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setShowSwitcher(false)}
                />
                {/* Dropdown */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#FFFFFF',
                  border: '1px solid rgba(60,60,67,0.10)',
                  borderRadius: 8, padding: '4px 0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  minWidth: 200, zIndex: 50,
                }}>
                  {buildings.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setSelected(b); setShowSwitcher(false) }}
                      style={{
                        display: 'block', width: '100%',
                        padding: '8px 14px', textAlign: 'left',
                        background: b.id === selected.id ? '#F2F2F7' : 'transparent',
                        border: 'none',
                        fontSize: 13, color: '#1E3A5F', cursor: 'pointer',
                        fontWeight: b.id === selected.id ? 600 : 400,
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

        {/* User avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#1E3A5F', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>
          {initials}
        </div>
      </div>
    </header>
  )
}
