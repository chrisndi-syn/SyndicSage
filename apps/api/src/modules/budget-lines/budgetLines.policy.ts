import type { UserRole } from '@syndicsage/types'

export function canWriteBudgetLine(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
