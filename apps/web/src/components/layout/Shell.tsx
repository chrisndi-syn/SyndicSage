import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface Props {
  children: ReactNode
}

// Shell wraps every authenticated page.
// Sidebar is sticky; main content scrolls independently.
export function Shell({ children }: Props) {
  return (
    <div style={{
      display:   'flex',
      minHeight: '100vh',
      background: '#F2F2F7',
    }}>
      <Sidebar />
      <main style={{
        flex:     1,
        minWidth: 0,
        display:  'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  )
}
