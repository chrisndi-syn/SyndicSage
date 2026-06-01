// ── Charges resource policy (Layer 3) ────────────────────────
import type { UserRole } from '@syndicsage/types'

export function canWriteCharge(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}

export function canDeleteCharge(role: UserRole): boolean {
  return role === 'syndic'
}

export function canMarkPaid(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
