import type { ReactNode } from 'react'
import { Sidebar }      from './Sidebar'
import { AiSagePanel } from '../../features/ai/AiSagePanel'
import { theme }        from '../../lib/theme'

interface Props {
  children: ReactNode
}

export function Shell({ children }: Props) {
  return (
    <div style={{
      display:    'flex',
      minHeight:  '100vh',
      background: theme.colors.bg,
    }}>
      <Sidebar />
      <main style={{
        flex:          1,
        minWidth:      0,
        display:       'flex',
        flexDirection: 'column',
        background:    theme.colors.bg,
      }}>
        {children}
      </main>
      <AiSagePanel />
    </div>
  )
}
