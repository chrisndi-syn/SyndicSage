import { useEffect }                        from 'react'
import { useQuery, useQueryClient }          from '@tanstack/react-query'
import { supabase }                          from '../../lib/supabase'
import {
  fetchNotifications, markNotificationRead, markAllRead,
} from './inbox.api'

export function useNotifications() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => fetchNotifications(),
  })

  // Supabase Realtime — live unread badge
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { qc.invalidateQueries({ queryKey: ['notifications'] }) },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

export function useUnreadCount(): number {
  const { data = [] } = useNotifications()
  return data.filter(n => !n.read).length
}

export async function doMarkRead(id: string, qc: ReturnType<typeof useQueryClient>) {
  await markNotificationRead(id)
  qc.invalidateQueries({ queryKey: ['notifications'] })
}

export async function doMarkAllRead(qc: ReturnType<typeof useQueryClient>) {
  await markAllRead()
  qc.invalidateQueries({ queryKey: ['notifications'] })
}
