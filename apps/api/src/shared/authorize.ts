import type { UserRole } from '@syndicsage/types'
import { Errors } from './errors.js'

// ── RBAC permission map ───────────────────────────────────────
// Maps action strings to the minimum roles that may perform them.
// Any role listed or higher in the hierarchy may act.
// Default deny: if an action is not listed, no one can do it.

const PERMISSIONS: Record<string, UserRole[]> = {
  // Buildings
  'building.read':   ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'building.create': ['syndic'],
  'building.update': ['syndic', 'co_syndic'],
  'building.delete': ['syndic'],

  // Members
  'member.read':     ['syndic', 'co_syndic'],
  'member.invite':   ['syndic', 'co_syndic'],
  'member.remove':   ['syndic'],
  'member.self':     ['syndic', 'co_syndic', 'co_owner', 'renter'],

  // Owners
  'owner.read':      ['syndic', 'co_syndic'],
  'owner.create':    ['syndic', 'co_syndic'],
  'owner.update':    ['syndic', 'co_syndic'],
  'owner.delete':    ['syndic'],

  // Charges
  'charge.read.all':  ['syndic', 'co_syndic'],
  'charge.read.own':  ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'charge.create':    ['syndic', 'co_syndic'],
  'charge.update':    ['syndic', 'co_syndic'],
  'charge.delete':    ['syndic'],
  'charge.mark_paid': ['syndic', 'co_syndic'],

  // Documents
  'document.read.syndic_only': ['syndic', 'co_syndic'],
  'document.read.all':         ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'document.upload':           ['syndic', 'co_syndic'],
  'document.delete':           ['syndic', 'co_syndic'],
  'document.download':         ['syndic', 'co_syndic', 'co_owner', 'renter'],

  // Tickets
  'ticket.read.all':  ['syndic', 'co_syndic'],
  'ticket.read.own':  ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'ticket.create':    ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'ticket.update':    ['syndic', 'co_syndic'],
  'ticket.close':     ['syndic', 'co_syndic'],

  // Votes
  'vote.read':   ['syndic', 'co_syndic', 'co_owner'],
  'vote.create': ['syndic', 'co_syndic'],
  'vote.cast':   ['syndic', 'co_syndic', 'co_owner'],
  'vote.close':  ['syndic', 'co_syndic'],

  // Meetings
  'meeting.read':   ['syndic', 'co_syndic', 'co_owner'],
  'meeting.create': ['syndic', 'co_syndic'],
  'meeting.update': ['syndic', 'co_syndic'],

  // Roadmap
  'roadmap.read':   ['syndic', 'co_syndic', 'co_owner'],
  'roadmap.create': ['syndic', 'co_syndic'],
  'roadmap.update': ['syndic', 'co_syndic'],

  // Audit log
  'audit.read': ['syndic', 'co_syndic'],

  // Settings / org
  'settings.read':   ['syndic'],
  'settings.update': ['syndic'],
  'org.update':      ['syndic'],

  // Invitations
  'invitation.create': ['syndic', 'co_syndic'],
  'invitation.revoke': ['syndic'],

  // Exports
  'export.data':    ['syndic', 'co_syndic'],
  'export.access':  ['syndic'],

  // AI
  'ai.chat':    ['syndic', 'co_syndic'],
  'ai.extract': ['syndic', 'co_syndic'],
  'ai.suggest': ['syndic', 'co_syndic'],

  // GDPR
  'gdpr.request': ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'gdpr.process': ['syndic'],

  // Maintenance
  'maintenance.read.all':  ['syndic', 'co_syndic'],
  'maintenance.read.own':  ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'maintenance.create':    ['syndic', 'co_syndic', 'co_owner', 'renter'],
  'maintenance.update':    ['syndic', 'co_syndic'],

  // Notifications
  'notification.read.own': ['syndic', 'co_syndic', 'co_owner', 'renter'],

  // Accounting
  'expense.read':          ['syndic', 'co_syndic'],
  'expense.create':        ['syndic', 'co_syndic'],
  'expense.update':        ['syndic', 'co_syndic'],
  'expense.delete':        ['syndic', 'co_syndic'],
  'income.read':           ['syndic', 'co_syndic'],
  'income.create':         ['syndic', 'co_syndic'],
  'income.update':         ['syndic', 'co_syndic'],
  'income.delete':         ['syndic', 'co_syndic'],
  'budget_line.read':      ['syndic', 'co_syndic'],
  'budget_line.create':    ['syndic', 'co_syndic'],
  'budget_line.update':    ['syndic', 'co_syndic'],
  'budget_line.delete':    ['syndic', 'co_syndic'],
  'bilan.read':            ['syndic', 'co_syndic'],

  // Insurance
  'insurance_policy.read':   ['syndic', 'co_syndic', 'co_owner'],
  'insurance_policy.create': ['syndic', 'co_syndic'],
  'insurance_policy.update': ['syndic', 'co_syndic'],
  'insurance_policy.delete': ['syndic', 'co_syndic'],
  'insurance_claim.read':    ['syndic', 'co_syndic'],
  'insurance_claim.create':  ['syndic', 'co_syndic'],
  'insurance_claim.update':  ['syndic', 'co_syndic'],
  'insurance_claim.delete':  ['syndic', 'co_syndic'],

  // Contractors
  'contractor.read':   ['syndic', 'co_syndic'],
  'contractor.create': ['syndic', 'co_syndic'],
  'contractor.update': ['syndic', 'co_syndic'],
  'contractor.delete': ['syndic', 'co_syndic'],

  // Supplier contracts
  'supplier_contract.read':   ['syndic', 'co_syndic', 'co_owner'],
  'supplier_contract.create': ['syndic', 'co_syndic'],
  'supplier_contract.update': ['syndic', 'co_syndic'],
  'supplier_contract.delete': ['syndic', 'co_syndic'],

  // Letter templates
  'letter_template.read':   ['syndic', 'co_syndic'],
  'letter_template.create': ['syndic', 'co_syndic'],
  'letter_template.update': ['syndic', 'co_syndic'],
  'letter_template.delete': ['syndic', 'co_syndic'],
  'letter_template.render': ['syndic', 'co_syndic'],

  // Timeline
  'timeline.read': ['syndic', 'co_syndic'],
}

// ── 3-layer authorization ─────────────────────────────────────
// Layer 1: tenant scope (building_id must match — enforced by middleware)
// Layer 2: role/permission (this function)
// Layer 3: resource policy (*.policy.ts — called by the route handler)
//
// Usage:
//   authorize(member.role, 'document.upload')
//   // throws 403 if not allowed

export function authorize(role: UserRole, action: string): void {
  const allowed = PERMISSIONS[action]

  if (!allowed) {
    // Action not in the permission map → default deny
    throw Errors.forbidden()
  }

  if (!allowed.includes(role)) {
    throw Errors.forbidden()
  }
}

// ── canDo — boolean variant for conditional logic ─────────────
// Use sparingly — prefer authorize() which throws.
// Useful for building filtered lists or conditional UI data.
export function canDo(role: UserRole, action: string): boolean {
  const allowed = PERMISSIONS[action]
  return allowed ? allowed.includes(role) : false
}
