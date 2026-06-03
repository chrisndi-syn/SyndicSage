// ── Inbox / Notifications client API ─────────────────────────

import { supabase } from '../../lib/supabase'

export interface Notification {
  id:          string
  user_id:     string
  building_id: string | null
  type:        string
  title:       string
  body:        string
  read:        boolean
  created_at:  string
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return MOCK_NOTIFICATIONS

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as Notification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function markAllRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', session.user.id)
    .eq('read', false)

  if (error) throw new Error(error.message)
}

// ── Mock data ─────────────────────────────────────────────────
const now = Date.now()
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'mock-notif-1', user_id: 'mock-user-1', building_id: 'mock-building-1',
    type: 'charge_overdue', title: 'Charge overdue', body: 'Q2 common area charge is now overdue for unit 4B.',
    read: false, created_at: new Date(now - 2 * 3600000).toISOString(),
  },
  {
    id: 'mock-notif-2', user_id: 'mock-user-1', building_id: 'mock-building-1',
    type: 'new_document', title: 'New document uploaded', body: 'AG Minutes — May 2026 has been uploaded.',
    read: false, created_at: new Date(now - 24 * 3600000).toISOString(),
  },
  {
    id: 'mock-notif-3', user_id: 'mock-user-1', building_id: 'mock-building-1',
    type: 'charge_paid', title: 'Charge paid', body: 'Maria Dupont has paid Q1 common area charge.',
    read: true, created_at: new Date(now - 3 * 86400000).toISOString(),
  },
  {
    id: 'mock-notif-4', user_id: 'mock-user-1', building_id: 'mock-building-1',
    type: 'maintenance_request', title: 'Maintenance request opened', body: 'Unit 2A reported a leak in the basement.',
    read: true, created_at: new Date(now - 5 * 86400000).toISOString(),
  },
  {
    id: 'mock-notif-5', user_id: 'mock-user-1', building_id: null,
    type: 'general', title: 'Welcome to SyndicSage V5', body: 'Your account is ready. Start by adding your first building.',
    read: true, created_at: new Date(now - 7 * 86400000).toISOString(),
  },
]
