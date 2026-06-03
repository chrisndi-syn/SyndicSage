import type { UserRole } from '@syndicsage/types'

export function canManageTicket(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}

export function canSubmitTicket(role: UserRole): boolean {
  return ['syndic', 'co_syndic', 'co_owner', 'renter'].includes(role)
}
