import { createContext, useContext, useState, type ReactNode } from 'react'

interface AiSageCtx {
  isOpen:         boolean
  setOpen:        (open: boolean) => void
  pendingPrompt:  string | null
  openWithPrompt: (prompt: string) => void
  clearPending:   () => void
}

const AiSageContext = createContext<AiSageCtx>({
  isOpen:         false,
  setOpen:        () => {},
  pendingPrompt:  null,
  openWithPrompt: () => {},
  clearPending:   () => {},
})

export function AiSageProvider({ children }: { children: ReactNode }) {
  const [isOpen,         setOpen]          = useState(false)
  const [pendingPrompt,  setPendingPrompt] = useState<string | null>(null)

  function openWithPrompt(prompt: string) {
    setPendingPrompt(prompt)
    setOpen(true)
  }

  function clearPending() {
    setPendingPrompt(null)
  }

  return (
    <AiSageContext.Provider value={{ isOpen, setOpen, pendingPrompt, openWithPrompt, clearPending }}>
      {children}
    </AiSageContext.Provider>
  )
}

export function useAiSage() {
  return useContext(AiSageContext)
}
