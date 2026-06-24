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
  if (!session) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.warn('[inbox] notifications query failed:', error.message)
    return []
  }
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

