import type { UserRole } from '@syndicsage/types'

export function canWriteSupplierContract(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
