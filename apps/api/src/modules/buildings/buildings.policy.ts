// ── Buildings resource policy (Layer 3) ───────────────────────
// Pure functions — no DB calls, no side effects. Easy to unit test.
// Called by route handlers after authorize() passes Layer 1 + 2.

import type { UserRole } from '@syndicsage/types'

// Can this member delete this building?
// Only syndicS can delete, and only if it's their building (enforced by middleware).
export function canDeleteBuilding(role: UserRole): boolean {
  return role === 'syndic'
}

// Can this member remove another member?
// Syndicss can remove anyone except themselves.
// Co-syndics cannot remove anyone.
export function canRemoveMember(
  actorRole:  UserRole,
  actorId:    string,
  targetUserId: string,
): boolean {
  if (actorRole !== 'syndic') return false
  if (actorId === targetUserId) return false  // cannot remove yourself
  return true
}

// Can this member update the building?
export function canUpdateBuilding(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
