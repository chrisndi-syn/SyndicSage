import type { UserRole } from '@syndicsage/types'

export function canWriteInsurance(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
