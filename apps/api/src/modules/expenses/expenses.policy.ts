import type { UserRole } from '@syndicsage/types'

export function canWriteExpense(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}

export function canDeleteExpense(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
