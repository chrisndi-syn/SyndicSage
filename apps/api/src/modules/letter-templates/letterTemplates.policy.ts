import type { UserRole } from '@syndicsage/types'

export function canWriteTemplate(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
