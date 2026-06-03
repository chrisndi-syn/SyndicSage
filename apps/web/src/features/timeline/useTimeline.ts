import { useQuery } from '@tanstack/react-query'
import { fetchTimeline } from './timeline.api'

export function useTimeline(buildingId?: string) {
  return useQuery({
    queryKey: ['timeline', buildingId],
    queryFn:  () => fetchTimeline(buildingId!),
    enabled:  !!buildingId,
  })
}
