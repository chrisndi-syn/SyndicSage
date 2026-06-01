// ── Building selection context ────────────────────────────────
// Stores the currently selected building across all feature pages.
// Auto-selects first building if the user has only one.
// Persists selection in localStorage so it survives page refreshes.

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import type { Building } from '@syndicsage/types'
import { supabase } from '../../lib/supabase'

const STORAGE_KEY = 'syndicsage_selected_building'

interface BuildingContextValue {
  buildings:   Building[]
  selected:    Building | null
  setSelected: (b: Building) => void
  loading:     boolean
  refetch:     () => void
}

const BuildingContext = createContext<BuildingContextValue>({
  buildings:   [],
  selected:    null,
  setSelected: () => {},
  loading:     true,
  refetch:     () => {},
})

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selected,  setSelectedState] = useState<Building | null>(null)
  const [loading,   setLoading]  = useState(true)

  const loadBuildings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('buildings')
      .select('*')
      .is('deleted_at', null)
      .order('name')

    const rows = (data ?? []) as Building[]
    setBuildings(rows)

    // Restore persisted selection, or auto-select if single building
    const savedId = localStorage.getItem(STORAGE_KEY)
    if (savedId) {
      const match = rows.find(b => b.id === savedId)
      if (match) {
        setSelectedState(match)
        setLoading(false)
        return
      }
    }
    if (rows.length === 1) {
      setSelectedState(rows[0]!)
      localStorage.setItem(STORAGE_KEY, rows[0]!.id)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadBuildings() }, [loadBuildings])

  function setSelected(b: Building) {
    setSelectedState(b)
    localStorage.setItem(STORAGE_KEY, b.id)
  }

  return (
    <BuildingContext.Provider value={{ buildings, selected, setSelected, loading, refetch: loadBuildings }}>
      {children}
    </BuildingContext.Provider>
  )
}

export function useBuilding(): BuildingContextValue {
  return useContext(BuildingContext)
}
