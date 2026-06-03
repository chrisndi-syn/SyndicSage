import type { UserRole } from '@syndicsage/types'
import type { DocumentRow } from './documents.api.js'

export function canReadDocument(role: UserRole, doc: DocumentRow): boolean {
  if (role === 'syndic' || role === 'co_syndic') return true
  if (role === 'co_owner' || role === 'renter') {
    return doc.visibility === 'all_residents'
  }
  return false
}

export function canUploadDocument(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}

export function canDeleteDocument(role: UserRole): boolean {
  return role === 'syndic' || role === 'co_syndic'
}
