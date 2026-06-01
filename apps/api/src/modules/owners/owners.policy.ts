// ── Owners resource policy (Layer 3) ─────────────────────────
import type { UserRole } from '@syndicsage/types'

export function canManageOwners(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}

export function canDeleteOwner(role: UserRole): boolean {
  return role === 'syndic'
}
