import type { UserRole } from '@syndicsage/types'

export function canWriteIncome(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
