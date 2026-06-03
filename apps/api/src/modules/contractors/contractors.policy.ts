import type { UserRole } from '@syndicsage/types'

export function canWriteContractor(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
