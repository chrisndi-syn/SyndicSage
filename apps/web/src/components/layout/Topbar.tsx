import { useAuth } from '../../shared/auth/AuthContext'

interface Props {
  title:    string
  subtitle?: string
}

export function Topbar({ title, subtitle }: Props) {
  const { user } = useAuth()

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <header style={{
      height:          56,
      background:      '#FFFFFF',
      borderBottom:    '1px solid rgba(60,60,67,0.08)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      padding:         '0 24px',
      flexShrink:      0,
    }}>
      <div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize:   20,
          fontWeight: 700,
          color:      '#1E3A5F',
          margin:     0,
          lineHeight: 1,
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: '#6E6E73', fontSize: 12, margin: '2px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* User avatar */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        background:     '#1E3A5F',
        color:          '#FFFFFF',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       12,
        fontWeight:     600,
        flexShrink:     0,
      }}>
        {initials}
      </div>
    </header>
  )
}
