// ── DEV MOCK DATA — remove before launch ──────────────────────
import type { Building }       from '@syndicsage/types'
import type { OwnerWithUnit }  from '../features/owners/owners.api'
import type { ChargeWithOwner } from '../features/charges/charges.api'
import type { Expense }         from '../features/accounting/expenses.api'
import type { Income }          from '../features/accounting/income.api'
import type { BudgetLineWithActual } from '../features/accounting/budgetLines.api'
import type { BilanSummary }    from '../features/accounting/bilan.api'
import type { Ticket }          from '../features/tickets/tickets.api'
import type { InsurancePolicy, InsuranceClaim } from '../features/insurance/insurance.api'
import type { Contractor, SupplierContract }    from '../features/contractors/contractors.api'
import type { LetterTemplate }  from '../features/letter-templates/letterTemplates.api'

export const MOCK_BUILDINGS: Building[] = [
  {
    id:              'mock-building-1',
    organization_id: 'mock-org-1',
    name:            'Résidence les Acacias',
    address:         'Rue des Acacias 12',
    city:            'Bruxelles',
    unit_count:      24,
    vme_number:      'BE0123456789',
    building_type:   'apartment',
    year_built:      1978,
    floors:          6,
    ag_date:         '2026-09-15',
    mandate_start:   '2024-01-01',
    mandate_expiry:  '2027-01-01',
    annual_budget:   48000,
    reserve_fund_balance: 12400,
    bank_iban:       'BE68 5390 0754 7034',
    bank_name:       'ING',
    auto_remind_enabled: true,
    auto_remind_days: 7,
    created_at:      '2026-01-01T00:00:00Z',
    updated_at:      '2026-01-01T00:00:00Z',
    deleted_at:      null,
  },
  {
    id:              'mock-building-2',
    organization_id: 'mock-org-1',
    name:            'Copropriété du Parc',
    address:         'Avenue du Parc 7',
    city:            'Liège',
    unit_count:      12,
    vme_number:      undefined,
    building_type:   'mixed',
    year_built:      1995,
    floors:          4,
    ag_date:         '2026-11-20',
    mandate_start:   '2025-01-01',
    mandate_expiry:  '2028-01-01',
    annual_budget:   24000,
    reserve_fund_balance: 3200,
    bank_iban:       'BE43 0689 9999 8765',
    bank_name:       'KBC',
    auto_remind_enabled: false,
    auto_remind_days: 7,
    created_at:      '2026-02-01T00:00:00Z',
    updated_at:      '2026-02-01T00:00:00Z',
    deleted_at:      null,
  },
]

export const MOCK_OWNERS: Record<string, OwnerWithUnit[]> = {
  'mock-building-1': [
    {
      id: 'mock-owner-1', building_id: 'mock-building-1', unit_id: 'mock-unit-1',
      full_name: 'Jean Dupont', email: 'jean.dupont@example.com', phone: '+32 471 11 22 33',
      is_renter: false, bank_account: 'BE68 5390 0754 7034',
      preferred_language: 'fr', mailing_address: null, has_no_email: false,
      created_at: '2026-01-10T00:00:00Z',
      units: { id: 'mock-unit-1', unit_number: 'A01', unit_type: 'apartment', ownership_share: 250 },
    },
    {
      id: 'mock-owner-2', building_id: 'mock-building-1', unit_id: 'mock-unit-2',
      full_name: 'Marie Lambert', email: 'marie.lambert@example.com', phone: null,
      is_renter: false, bank_account: null,
      preferred_language: 'nl', mailing_address: null, has_no_email: false,
      created_at: '2026-01-11T00:00:00Z',
      units: { id: 'mock-unit-2', unit_number: 'A02', unit_type: 'apartment', ownership_share: 260 },
    },
    {
      id: 'mock-owner-3', building_id: 'mock-building-1', unit_id: 'mock-unit-3',
      full_name: 'Pierre Martin', email: 'pierre.martin@example.com', phone: '+32 495 44 55 66',
      is_renter: true, bank_account: null,
      preferred_language: 'fr', mailing_address: 'Rue de la Paix 3, 1000 Bruxelles', has_no_email: false,
      created_at: '2026-02-01T00:00:00Z',
      units: { id: 'mock-unit-3', unit_number: 'B01', unit_type: 'apartment', ownership_share: 240 },
    },
    {
      id: 'mock-owner-4', building_id: 'mock-building-1', unit_id: 'mock-unit-4',
      full_name: 'Sophie Lecomte', email: '', phone: '+32 478 77 88 99',
      is_renter: false, bank_account: 'BE43 0689 9999 8765',
      preferred_language: 'en', mailing_address: null, has_no_email: true,
      created_at: '2026-02-15T00:00:00Z',
      units: { id: 'mock-unit-4', unit_number: 'P01', unit_type: 'parking', ownership_share: 50 },
    },
    {
      id: 'mock-owner-5', building_id: 'mock-building-1', unit_id: 'mock-unit-5',
      full_name: 'Thomas Renard', email: 'thomas.renard@example.com', phone: null,
      is_renter: false, bank_account: null,
      preferred_language: 'fr', mailing_address: null, has_no_email: false,
      created_at: '2026-03-01T00:00:00Z',
      units: { id: 'mock-unit-5', unit_number: 'C01', unit_type: 'apartment', ownership_share: 200 },
    },
  ],
  'mock-building-2': [
    {
      id: 'mock-owner-6', building_id: 'mock-building-2', unit_id: 'mock-unit-6',
      full_name: 'Luc Fontaine', email: 'luc.fontaine@example.com', phone: null,
      is_renter: false, bank_account: 'BE68 3200 1234 5678',
      preferred_language: 'fr', mailing_address: null, has_no_email: false,
      created_at: '2026-02-05T00:00:00Z',
      units: { id: 'mock-unit-6', unit_number: '101', unit_type: 'apartment', ownership_share: 500 },
    },
    {
      id: 'mock-owner-7', building_id: 'mock-building-2', unit_id: 'mock-unit-7',
      full_name: 'Anne Renard', email: 'anne.renard@example.com', phone: '+32 486 12 34 56',
      is_renter: false, bank_account: null,
      preferred_language: 'nl', mailing_address: null, has_no_email: false,
      created_at: '2026-02-06T00:00:00Z',
      units: { id: 'mock-unit-7', unit_number: '102', unit_type: 'apartment', ownership_share: 500 },
    },
  ],
}

export const MOCK_EXPENSES: Record<string, Expense[]> = {
  'mock-building-1': [
    {
      id: 'mock-exp-1', building_id: 'mock-building-1',
      date: '2026-05-28', description: 'Electricity — common areas', amount: 412.50,
      category: 'Utilities', accounting_code: '61043',
      supplier: 'Engie', reference: 'INV-2026-0542', notes: null, created_at: '2026-05-28T00:00:00Z',
    },
    {
      id: 'mock-exp-2', building_id: 'mock-building-1',
      date: '2026-05-15', description: 'Lift maintenance — May', amount: 285.00,
      category: 'Maintenance', accounting_code: '61011',
      supplier: 'Otis Belgium', reference: 'OT-MAY-2026', notes: 'Monthly contract', created_at: '2026-05-15T00:00:00Z',
    },
    {
      id: 'mock-exp-3', building_id: 'mock-building-1',
      date: '2026-04-30', description: 'Cleaning service — April', amount: 640.00,
      category: 'Cleaning', accounting_code: '61012',
      supplier: 'CleanPro SPRL', reference: null, notes: null, created_at: '2026-04-30T00:00:00Z',
    },
    {
      id: 'mock-exp-4', building_id: 'mock-building-1',
      date: '2026-04-10', description: 'Building insurance renewal', amount: 1840.00,
      category: 'Insurance', accounting_code: '61300',
      supplier: 'AXA Belgium', reference: 'POL-2026-AXA', notes: 'Annual premium', created_at: '2026-04-10T00:00:00Z',
    },
    {
      id: 'mock-exp-5', building_id: 'mock-building-1',
      date: '2026-03-22', description: 'Roof repair — water damage', amount: 2200.00,
      category: 'Repairs', accounting_code: '61022',
      supplier: 'Toitures Lecomte', reference: 'TL-0298', notes: 'Storm damage March 18', created_at: '2026-03-22T00:00:00Z',
    },
    {
      id: 'mock-exp-6', building_id: 'mock-building-1',
      date: '2026-02-14', description: 'Accounting software subscription', amount: 99.00,
      category: 'Admin', accounting_code: '61600',
      supplier: null, reference: null, notes: null, created_at: '2026-02-14T00:00:00Z',
    },
  ],
  'mock-building-2': [
    {
      id: 'mock-exp-7', building_id: 'mock-building-2',
      date: '2026-05-20', description: 'Water — common areas', amount: 88.40,
      category: 'Utilities', accounting_code: '61044',
      supplier: 'SWDE', reference: 'SW-2026-0301', notes: null, created_at: '2026-05-20T00:00:00Z',
    },
  ],
}

export const MOCK_INCOME: Record<string, Income[]> = {
  'mock-building-1': [
    {
      id: 'mock-inc-1', building_id: 'mock-building-1',
      date: '2026-05-15', type: 'provision', description: 'Q2 provisions — all owners',
      amount: 9240.00, owner_id: null, reference: 'PROV-Q2-2026', notes: null, created_at: '2026-05-15T00:00:00Z',
    },
    {
      id: 'mock-inc-2', building_id: 'mock-building-1',
      date: '2026-04-03', type: 'insurance_refund', description: 'AXA refund — roof claim',
      amount: 1650.00, owner_id: null, reference: 'AXA-CLAIM-0042', notes: 'Partial refund', created_at: '2026-04-03T00:00:00Z',
    },
    {
      id: 'mock-inc-3', building_id: 'mock-building-1',
      date: '2026-02-28', type: 'interest', description: 'Savings account interest — Q1',
      amount: 62.30, owner_id: null, reference: null, notes: null, created_at: '2026-02-28T00:00:00Z',
    },
    {
      id: 'mock-inc-4', building_id: 'mock-building-1',
      date: '2026-02-15', type: 'provision', description: 'Q1 provisions — all owners',
      amount: 9240.00, owner_id: null, reference: 'PROV-Q1-2026', notes: null, created_at: '2026-02-15T00:00:00Z',
    },
  ],
  'mock-building-2': [
    {
      id: 'mock-inc-5', building_id: 'mock-building-2',
      date: '2026-05-01', type: 'provision', description: 'May provisions',
      amount: 2520.00, owner_id: null, reference: 'PROV-MAY-2026', notes: null, created_at: '2026-05-01T00:00:00Z',
    },
  ],
}

export const MOCK_BILAN: Record<string, BilanSummary> = {
  'mock-building-1': {
    year: 2026, building_id: 'mock-building-1',
    bank_vue:              8420.50,
    bank_epargne:          12400.00,
    total_receivables:     1155.00,
    total_actif:           21975.50,
    reserve_fund_balance:  12400.00,
    total_income:          20192.30,
    total_expenses:        5476.50,
    net_result:            14715.80,
    total_passif:          27115.80,
    expenses_by_code: {
      '61011': 285.00,
      '61012': 640.00,
      '61022': 2200.00,
      '61043': 412.50,
      '61300': 1840.00,
      '61600': 99.00,
    },
  },
  'mock-building-2': {
    year: 2026, building_id: 'mock-building-2',
    bank_vue:              1840.00,
    bank_epargne:          3200.00,
    total_receivables:     210.00,
    total_actif:           5250.00,
    reserve_fund_balance:  3200.00,
    total_income:          2520.00,
    total_expenses:        88.40,
    net_result:            2431.60,
    total_passif:          5631.60,
    expenses_by_code: { '61044': 88.40 },
  },
}

export const MOCK_BUDGET_LINES: Record<string, BudgetLineWithActual[]> = {
  'mock-building-1': [
    {
      id: 'mock-bl-1', building_id: 'mock-building-1', year: 2026,
      category: 'Utilities', description: 'Electricity & water — common areas',
      amount_budgeted: 2400.00, amount_actual: 412.50, variance: 1987.50, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-bl-2', building_id: 'mock-building-1', year: 2026,
      category: 'Maintenance', description: 'Lift maintenance contract',
      amount_budgeted: 3420.00, amount_actual: 285.00, variance: 3135.00, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-bl-3', building_id: 'mock-building-1', year: 2026,
      category: 'Cleaning', description: 'Cleaning service',
      amount_budgeted: 7680.00, amount_actual: 640.00, variance: 7040.00, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-bl-4', building_id: 'mock-building-1', year: 2026,
      category: 'Insurance', description: 'Building insurance',
      amount_budgeted: 1800.00, amount_actual: 1840.00, variance: -40.00, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-bl-5', building_id: 'mock-building-1', year: 2026,
      category: 'Repairs', description: 'Unplanned repairs reserve',
      amount_budgeted: 2000.00, amount_actual: 2200.00, variance: -200.00, created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-bl-6', building_id: 'mock-building-1', year: 2026,
      category: 'Admin', description: 'Administrative costs',
      amount_budgeted: 300.00, amount_actual: 99.00, variance: 201.00, created_at: '2026-01-01T00:00:00Z',
    },
  ],
  'mock-building-2': [
    {
      id: 'mock-bl-7', building_id: 'mock-building-2', year: 2026,
      category: 'Utilities', description: 'Water & electricity',
      amount_budgeted: 1200.00, amount_actual: 88.40, variance: 1111.60, created_at: '2026-01-01T00:00:00Z',
    },
  ],
}

export const MOCK_CHARGES: Record<string, ChargeWithOwner[]> = {
  'mock-building-1': [
    {
      id: 'mock-charge-1', building_id: 'mock-building-1', owner_id: 'mock-owner-1',
      title: 'Q2 2026 — Common area charges', amount: 385.00, status: 'pending',
      period: 'quarterly', due_date: '2026-06-30', paid_date: null,
      notes: null, created_at: '2026-05-01T00:00:00Z',
      owners: { full_name: 'Jean Dupont', units: { unit_number: 'A01' } },
    },
    {
      id: 'mock-charge-2', building_id: 'mock-building-1', owner_id: 'mock-owner-2',
      title: 'Q2 2026 — Common area charges', amount: 400.00, status: 'paid',
      period: 'quarterly', due_date: '2026-06-30', paid_date: '2026-05-15',
      notes: null, created_at: '2026-05-01T00:00:00Z',
      owners: { full_name: 'Marie Lambert', units: { unit_number: 'A02' } },
    },
    {
      id: 'mock-charge-3', building_id: 'mock-building-1', owner_id: 'mock-owner-1',
      title: 'Q1 2026 — Common area charges', amount: 385.00, status: 'overdue',
      period: 'quarterly', due_date: '2026-03-31', paid_date: null,
      notes: 'Second reminder sent', created_at: '2026-02-01T00:00:00Z',
      owners: { full_name: 'Jean Dupont', units: { unit_number: 'A01' } },
    },
    {
      id: 'mock-charge-4', building_id: 'mock-building-1', owner_id: null,
      title: 'Lift maintenance contract 2026', amount: 1200.00, status: 'paid',
      period: 'annual', due_date: '2026-01-31', paid_date: '2026-01-20',
      notes: 'Otis contract renewal', created_at: '2026-01-01T00:00:00Z',
      owners: null,
    },
  ],
  'mock-building-2': [
    {
      id: 'mock-charge-5', building_id: 'mock-building-2', owner_id: 'mock-owner-6',
      title: 'May 2026 — Monthly charges', amount: 210.00, status: 'pending',
      period: 'monthly', due_date: '2026-05-31', paid_date: null,
      notes: null, created_at: '2026-05-01T00:00:00Z',
      owners: { full_name: 'Luc Fontaine', units: { unit_number: '101' } },
    },
  ],
}

export const MOCK_TICKETS: Record<string, Ticket[]> = {
  'mock-building-1': [
    {
      id: 'mock-ticket-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      unit_id: 'mock-unit-1', owner_id: 'mock-owner-1',
      submitted_by: 'mock-owner-1',
      type: 'complaint', title: 'Water leak in corridor near A01',
      description: 'There is a persistent water leak near apartment A01 on the ground floor. The ceiling shows visible water damage.',
      status: 'open',
      created_at: '2026-05-28T09:15:00Z', updated_at: '2026-05-28T09:15:00Z',
    },
    {
      id: 'mock-ticket-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      unit_id: 'mock-unit-2', owner_id: 'mock-owner-2',
      submitted_by: 'mock-owner-2',
      type: 'charge_dispute', title: 'Dispute on Q1 2026 provision amount',
      description: 'I believe the Q1 2026 provision of €400 was calculated incorrectly. My ownership share is 260/1000, not the 270/1000 used in the calculation.',
      status: 'in_progress',
      created_at: '2026-05-20T14:30:00Z', updated_at: '2026-05-21T10:00:00Z',
    },
    {
      id: 'mock-ticket-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      unit_id: null, owner_id: 'mock-owner-3',
      submitted_by: 'mock-owner-3',
      type: 'document_request', title: 'Request for 2025 annual accounts',
      description: 'Please provide a copy of the 2025 annual accounts and audit report for my records.',
      status: 'resolved',
      created_at: '2026-05-10T08:00:00Z', updated_at: '2026-05-12T11:00:00Z',
    },
  ],
}

export const MOCK_INSURANCE_POLICIES: Record<string, InsurancePolicy[]> = {
  'mock-building-1': [
    {
      id: 'mock-policy-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      insurer_name: 'AXA Belgium', policy_number: 'AXA-2026-B1-FIRE',
      type: 'fire', description: 'Comprehensive fire and water damage coverage for the building',
      premium_annual: 1840.00, start_date: '2026-01-01', end_date: '2026-12-31',
      renewal_reminder_days: 30,
      document_id: null,
      contact_name: 'Sophie Mortier', contact_email: 'sophie.mortier@axa.be', contact_phone: '+32 2 678 61 11',
      notes: 'Policy renewed annually. Includes common areas and structure.',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-policy-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      insurer_name: 'Ethias', policy_number: 'ETH-VME-2026-0042',
      type: 'omnium', description: 'All-risk omnium coverage including liability and legal assistance',
      premium_annual: 620.00, start_date: '2026-03-01', end_date: '2027-02-28',
      renewal_reminder_days: 60,
      document_id: null,
      contact_name: null, contact_email: 'pro@ethias.be', contact_phone: '+32 4 220 31 11',
      notes: null,
      created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    },
  ],
}

export const MOCK_INSURANCE_CLAIMS: Record<string, InsuranceClaim[]> = {
  'mock-building-1': [
    {
      id: 'mock-claim-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      policy_id: 'mock-policy-1',
      date: '2026-03-20', description: 'Water damage from roof leak after storm on March 18',
      amount_claimed: 2200.00, amount_received: 1650.00,
      status: 'settled',
      reference: 'AXA-CLAIM-0042',
      notes: 'Partial reimbursement — deductible of €550 applied.',
      created_at: '2026-03-22T00:00:00Z', updated_at: '2026-04-05T00:00:00Z',
    },
  ],
}

export const MOCK_CONTRACTORS: Record<string, Contractor[]> = {
  'mock-org-1': [
    {
      id: 'mock-contractor-1', organization_id: 'mock-org-1',
      name: 'Otis Belgium', trade: 'elevator',
      phone: '+32 2 728 80 00', email: 'service.be@otis.com',
      vat_number: 'BE0400.212.172', address: 'Rue Colonel Bourg 105, 1030 Bruxelles',
      notes: 'Annual maintenance contract. 24/7 emergency line: +32 800 14 082',
      rating: 4,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-contractor-2', organization_id: 'mock-org-1',
      name: 'CleanPro SPRL', trade: 'cleaning',
      phone: '+32 2 345 67 89', email: 'info@cleanpro.be',
      vat_number: 'BE0678.901.234', address: 'Chaussée de Wavre 200, 1050 Bruxelles',
      notes: null,
      rating: 5,
      created_at: '2026-01-15T00:00:00Z',
    },
    {
      id: 'mock-contractor-3', organization_id: 'mock-org-1',
      name: 'Electro Dubois', trade: 'electrician',
      phone: '+32 471 22 33 44', email: 'dubois.electro@gmail.com',
      vat_number: null, address: 'Rue de la Station 12, 1300 Wavre',
      notes: 'Freelance electrician. Good for small jobs.',
      rating: 3,
      created_at: '2026-02-01T00:00:00Z',
    },
  ],
}

export const MOCK_SUPPLIER_CONTRACTS: Record<string, SupplierContract[]> = {
  'mock-building-1': [
    {
      id: 'mock-sc-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      contractor_id: 'mock-contractor-1',
      title: 'Lift maintenance contract 2026',
      description: 'Monthly inspection + 2 major services per year. Includes parts up to €500.',
      start_date: '2026-01-01', end_date: '2026-12-31',
      amount_annual: 3420.00,
      status: 'active',
      document_id: null,
      renewal_reminder_days: 60,
      notes: 'Contract auto-renews unless cancelled 3 months before end date.',
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-sc-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      contractor_id: 'mock-contractor-2',
      title: 'Weekly cleaning service 2026',
      description: 'Every Monday morning: stairwells, lobby, bike room, bins.',
      start_date: '2026-01-01', end_date: '2026-12-31',
      amount_annual: 7680.00,
      status: 'active',
      document_id: null,
      renewal_reminder_days: 30,
      notes: null,
      created_at: '2026-01-05T00:00:00Z', updated_at: '2026-01-05T00:00:00Z',
    },
  ],
}

export const MOCK_LETTER_TEMPLATES: Record<string, LetterTemplate[]> = {
  'mock-org-1': [
    {
      id: 'mock-tpl-1', organization_id: 'mock-org-1', building_id: null,
      name: 'Quarterly provision notice',
      category: 'financial',
      body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Dear {{owner_name}},</p>
  <p>Please find below your quarterly provision notice for <strong>{{building_name}}</strong>.</p>
  <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
    <tr style="background:#f3f4f6;"><th style="padding:8px; text-align:left;">Period</th><th style="padding:8px; text-align:right;">Amount</th></tr>
    <tr><td style="padding:8px;">{{period}}</td><td style="padding:8px; text-align:right;">€{{amount}}</td></tr>
  </table>
  <p>Payment is due by <strong>{{due_date}}</strong>.</p>
  <p>Kind regards,<br/>{{syndic_name}}</p>
</div>`,
      variables: ['owner_name', 'building_name', 'period', 'amount', 'due_date', 'syndic_name'],
      is_default: true,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-tpl-2', organization_id: 'mock-org-1', building_id: null,
      name: 'General Assembly convocation',
      category: 'governance',
      body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Dear {{owner_name}},</p>
  <p>You are hereby convened to the <strong>Ordinary General Assembly</strong> of <strong>{{building_name}}</strong>.</p>
  <ul>
    <li><strong>Date:</strong> {{ag_date}}</li>
    <li><strong>Time:</strong> {{ag_time}}</li>
    <li><strong>Location:</strong> {{ag_location}}</li>
  </ul>
  <p>The agenda is attached. Please confirm your attendance by {{rsvp_date}}.</p>
  <p>Kind regards,<br/>{{syndic_name}}</p>
</div>`,
      variables: ['owner_name', 'building_name', 'ag_date', 'ag_time', 'ag_location', 'rsvp_date', 'syndic_name'],
      is_default: false,
      created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z',
    },
  ],
}
