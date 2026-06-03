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
import { MOCK_BUILDINGS } from '../../lib/mockData'

const STORAGE_KEY = 'syndicsage_selected_building'

export type MemberRole = 'syndic' | 'co_syndic' | 'co_owner' | 'renter' | null

interface BuildingContextValue {
  buildings:   Building[]
  selected:    Building | null
  setSelected: (b: Building) => void
  loading:     boolean
  refetch:     () => void
  myRole:      MemberRole
  orgPlan:     string | null   // null = not yet loaded; 'free' | 'starter' | 'pro' | 'enterprise'
}

const BuildingContext = createContext<BuildingContextValue>({
  buildings:   [],
  selected:    null,
  setSelected: () => {},
  loading:     true,
  refetch:     () => {},
  myRole:      null,
  orgPlan:     null,
})

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selected,  setSelectedState] = useState<Building | null>(null)
  const [loading,   setLoading]  = useState(true)
  const [myRole,    setMyRole]   = useState<MemberRole>(null)
  const [orgPlan,   setOrgPlan]  = useState<string | null>(null)

  const loadBuildings = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    let rows: Building[]
    if (!session) {
      rows = MOCK_BUILDINGS
      setOrgPlan('pro') // mock/dev: bypass paywall
    } else {
      const { data } = await supabase
        .from('buildings')
        .select('*')
        .is('deleted_at', null)
        .order('name')
      rows = (data ?? []) as Building[]

      // Load org plan via profile → organization
      Promise.resolve(
        supabase
          .from('profiles')
          .select('organization_id, organizations(plan)')
          .eq('id', session.user.id)
          .single()
      ).then(({ data: profileRow }) => {
        const plan = (profileRow as { organizations?: { plan?: string } } | null)?.organizations?.plan ?? null
        setOrgPlan(plan)
      }).catch(() => {
        // Query failed — default to 'free' so the paywall gate still activates
        // rather than silently bypassing it with null
        setOrgPlan('free')
      })
    }
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

  // Load the current user's role in the selected building
  useEffect(() => {
    if (!selected) { setMyRole(null); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setMyRole('syndic'); return } // mock/dev: assume syndic
      supabase
        .from('building_members')
        .select('role')
        .eq('building_id', selected.id)
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          setMyRole((data as { role: MemberRole } | null)?.role ?? null)
        })
    })
  }, [selected])

  function setSelected(b: Building) {
    setSelectedState(b)
    localStorage.setItem(STORAGE_KEY, b.id)
  }

  return (
    <BuildingContext.Provider value={{ buildings, selected, setSelected, loading, refetch: loadBuildings, myRole, orgPlan }}>
      {children}
    </BuildingContext.Provider>
  )
}

export function useBuilding(): BuildingContextValue {
  return useContext(BuildingContext)
}
