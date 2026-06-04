// ── Meetings + Votes client API ─────────────────────────────────

import { apiFetch } from '../../lib/api'

export interface Meeting {
  id:              string
  building_id:     string
  organization_id: string
  title:           string
  date:            string
  agenda:          string | null
  status:          'scheduled' | 'in_progress' | 'completed'
  daily_room_name: string | null
  daily_room_url:  string | null
  transcript:      string | null
  minutes:         string | null
  started_at:      string | null
  ended_at:        string | null
  created_at:      string
  updated_at:      string
  deleted_at:      string | null
}

export interface Vote {
  id:              string
  meeting_id:      string
  building_id:     string
  organization_id: string
  question:        string
  description:     string | null
  status:          'open' | 'closed'
  vote_opened_at:  string | null
  vote_closed_at:  string | null
  created_at:      string
  vote_casts:      VoteCast[]
}

export interface VoteCast {
  id:          string
  vote_id:     string
  user_id:     string
  unit_id:     string
  choice:      'yes' | 'no' | 'abstain'
  vote_weight: number
  created_at:  string
}

// ── Meetings ──────────────────────────────────────────────────────

export async function fetchMeetings(buildingId: string): Promise<Meeting[]> {
  if (buildingId.startsWith('mock-')) return MOCK_MEETINGS[buildingId] ?? []
  return apiFetch<Meeting[]>(`/api/v1/meetings?building_id=${buildingId}`, '')
}

export interface MeetingBody {
  title:   string
  date:    string
  agenda?: string
}

export async function apiCreateMeeting(token: string, buildingId: string, body: MeetingBody): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/v1/meetings?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiUpdateMeeting(token: string, buildingId: string, id: string, body: Partial<MeetingBody>): Promise<Meeting> {
  return apiFetch<Meeting>(`/api/v1/meetings/${id}?building_id=${buildingId}`, token, {
    method: 'PATCH', body: JSON.stringify(body),
  })
}

export async function apiDeleteMeeting(token: string, buildingId: string, id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/meetings/${id}?building_id=${buildingId}`, token, { method: 'DELETE' })
}

export async function apiStartMeeting(token: string, buildingId: string, id: string): Promise<{ meeting: Meeting; token: string | null; room_url: string }> {
  return apiFetch(`/api/v1/meetings/${id}/start?building_id=${buildingId}`, token, { method: 'POST' })
}

export async function apiEndMeeting(token: string, buildingId: string, id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/meetings/${id}/end?building_id=${buildingId}`, token, { method: 'POST' })
}

// ── Votes ─────────────────────────────────────────────────────────

export async function fetchVotes(buildingId: string, meetingId: string): Promise<Vote[]> {
  if (buildingId.startsWith('mock-')) return MOCK_VOTES[meetingId] ?? []
  return apiFetch<Vote[]>(`/api/v1/meetings/${meetingId}/votes?building_id=${buildingId}`, '')
}

export interface VoteBody {
  question:     string
  description?: string
}

export async function apiCreateVote(token: string, buildingId: string, meetingId: string, body: VoteBody): Promise<Vote> {
  return apiFetch<Vote>(`/api/v1/meetings/${meetingId}/votes?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify(body),
  })
}

export async function apiCastVote(token: string, buildingId: string, meetingId: string, voteId: string, choice: 'yes' | 'no' | 'abstain'): Promise<VoteCast> {
  return apiFetch<VoteCast>(`/api/v1/meetings/${meetingId}/votes/${voteId}/cast?building_id=${buildingId}`, token, {
    method: 'POST', body: JSON.stringify({ choice }),
  })
}

export async function apiCloseVote(token: string, buildingId: string, meetingId: string, voteId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/meetings/${meetingId}/votes/${voteId}/close?building_id=${buildingId}`, token, { method: 'POST' })
}

// ── Mock data ─────────────────────────────────────────────────────

const MOCK_MEETINGS: Record<string, Meeting[]> = {
  'mock-building-1': [
    {
      id: 'mtg-1', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Assemblée Générale Ordinaire 2026',
      date: '2026-09-15T18:00:00+02:00',
      agenda: '1. Approbation des comptes annuels 2025\n2. Approbation du budget prévisionnel 2027\n3. Rénovation de la toiture — sélection entrepreneur\n4. Renouvellement du contrat d\'entretien ascenseur\n5. Questions diverses',
      status: 'scheduled', daily_room_name: null, daily_room_url: null,
      transcript: null, minutes: null, started_at: null, ended_at: null,
      created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z', deleted_at: null,
    },
    {
      id: 'mtg-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'AGA — Réparation urgente chaudière commune',
      date: '2026-07-03T18:30:00+02:00',
      agenda: '1. Présentation du devis Dalkia (€ 12 400)\n2. Vote financement via fonds de réserve\n3. Calendrier des travaux',
      status: 'scheduled', daily_room_name: null, daily_room_url: null,
      transcript: null, minutes: null, started_at: null, ended_at: null,
      created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-10T00:00:00Z', deleted_at: null,
    },
    {
      id: 'mtg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'AGA — Modernisation ascenseur',
      date: '2026-04-10T18:00:00+02:00',
      agenda: '1. Vote modernisation ascenseur (Kone Belgium, € 45 000)\n2. Mode de financement\n3. Planning des travaux',
      status: 'completed', daily_room_name: null, daily_room_url: null,
      transcript: 'Syndicataire Dupont: "Je suis favorable à la modernisation."\nSyndicataire Martin: "Le coût est élevé, peut-on négocier?"\nSyndicataire Lecomte: "Le fonds de réserve est suffisant."\n[Vote ouvert à 18h15, clôturé à 18h35]\n15 oui, 2 non, 1 abstention.',
      minutes: 'Procès-verbal — AGA du 10 avril 2026\n\nPrésents: 18 copropriétaires sur 24 (75 %)\nPrésidé par: M. Dubois (syndic)\n\n1. Vote modernisation ascenseur\n   Devis Kone Belgium: € 45 000 TTC\n   Résultat: 15 oui — 2 non — 1 abstention\n   → Motion APPROUVÉE (majorité des 3/4 atteinte)\n\n2. Financement\n   Prélèvement sur fonds de réserve approuvé à l\'unanimité.\n   Solde fonds de réserve après travaux: € 38 200\n\n3. Planning\n   Travaux prévus: juin–juillet 2026\n   Durée estimée: 3 semaines\n\nSéance levée à 19h45.',
      started_at: '2026-04-10T18:05:00Z', ended_at: '2026-04-10T19:45:00Z',
      created_at: '2026-03-20T00:00:00Z', updated_at: '2026-04-10T19:45:00Z', deleted_at: null,
    },
    {
      id: 'mtg-0', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      title: 'Assemblée Générale Ordinaire 2025',
      date: '2025-09-18T18:00:00+02:00',
      agenda: '1. Approbation des comptes 2024\n2. Budget 2025\n3. Rapport syndic\n4. Divers',
      status: 'completed', daily_room_name: null, daily_room_url: null,
      transcript: null,
      minutes: 'Procès-verbal — AGO du 18 septembre 2025\n\nPrésents: 20 copropriétaires sur 24 (83 %)\n\n1. Comptes 2024 approuvés à l\'unanimité\n2. Budget 2025 de € 96 000 approuvé — 19 oui, 1 abstention\n3. Rapport syndic pris en compte\n4. Demande d\'étude pour remplacement toiture (devis attendus pour AGO 2026)\n\nSéance levée à 20h10.',
      started_at: '2025-09-18T18:05:00Z', ended_at: '2025-09-18T20:10:00Z',
      created_at: '2025-08-15T00:00:00Z', updated_at: '2025-09-18T20:10:00Z', deleted_at: null,
    },
  ],
  'mock-building-2': [
    {
      id: 'mtg-b2-1', building_id: 'mock-building-2', organization_id: 'mock-org-1',
      title: 'Assemblée Générale Ordinaire 2026',
      date: '2026-10-08T19:00:00+02:00',
      agenda: '1. Approbation des comptes 2025\n2. Budget 2026\n3. Travaux peinture façade\n4. Divers',
      status: 'scheduled', daily_room_name: null, daily_room_url: null,
      transcript: null, minutes: null, started_at: null, ended_at: null,
      created_at: '2026-06-05T00:00:00Z', updated_at: '2026-06-05T00:00:00Z', deleted_at: null,
    },
    {
      id: 'mtg-b2-2', building_id: 'mock-building-2', organization_id: 'mock-org-1',
      title: 'AGO 2025',
      date: '2025-10-10T19:00:00+02:00',
      agenda: '1. Comptes 2024\n2. Budget 2025\n3. Divers',
      status: 'completed', daily_room_name: null, daily_room_url: null,
      transcript: null,
      minutes: 'Procès-verbal — AGO du 10 octobre 2025\n\nPrésents: 12 copropriétaires sur 16 (75 %)\n\n1. Comptes 2024 approuvés — unanimité\n2. Budget 2025 de € 54 000 approuvé — 11 oui, 1 non\n3. Divers: installation caméras hall d\'entrée reportée à 2026\n\nSéance levée à 20h30.',
      started_at: '2025-10-10T19:05:00Z', ended_at: '2025-10-10T20:30:00Z',
      created_at: '2025-09-10T00:00:00Z', updated_at: '2025-10-10T20:30:00Z', deleted_at: null,
    },
  ],
}

const MOCK_VOTES: Record<string, Vote[]> = {
  'mtg-2': [
    {
      id: 'vote-1', meeting_id: 'mtg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      question: 'Approuver la modernisation de l\'ascenseur pour € 45 000 (Kone Belgium)?',
      description: 'Remplacement complet de la cabine, du panneau de commande et de la motorisation. Garantie 5 ans incluse.',
      status: 'closed', vote_opened_at: '2026-04-10T18:15:00Z', vote_closed_at: '2026-04-10T18:35:00Z',
      created_at: '2026-04-10T18:15:00Z',
      vote_casts: [
        { id: 'vc-1',  vote_id: 'vote-1', user_id: 'u1',  unit_id: 'unit-1',  choice: 'yes',     vote_weight: 120, created_at: '2026-04-10T18:18:00Z' },
        { id: 'vc-2',  vote_id: 'vote-1', user_id: 'u2',  unit_id: 'unit-2',  choice: 'yes',     vote_weight: 100, created_at: '2026-04-10T18:20:00Z' },
        { id: 'vc-3',  vote_id: 'vote-1', user_id: 'u3',  unit_id: 'unit-3',  choice: 'yes',     vote_weight: 80,  created_at: '2026-04-10T18:21:00Z' },
        { id: 'vc-4',  vote_id: 'vote-1', user_id: 'u4',  unit_id: 'unit-4',  choice: 'yes',     vote_weight: 90,  created_at: '2026-04-10T18:22:00Z' },
        { id: 'vc-5',  vote_id: 'vote-1', user_id: 'u5',  unit_id: 'unit-5',  choice: 'yes',     vote_weight: 110, created_at: '2026-04-10T18:23:00Z' },
        { id: 'vc-6',  vote_id: 'vote-1', user_id: 'u6',  unit_id: 'unit-6',  choice: 'yes',     vote_weight: 75,  created_at: '2026-04-10T18:24:00Z' },
        { id: 'vc-7',  vote_id: 'vote-1', user_id: 'u7',  unit_id: 'unit-7',  choice: 'yes',     vote_weight: 95,  created_at: '2026-04-10T18:25:00Z' },
        { id: 'vc-8',  vote_id: 'vote-1', user_id: 'u8',  unit_id: 'unit-8',  choice: 'yes',     vote_weight: 85,  created_at: '2026-04-10T18:26:00Z' },
        { id: 'vc-9',  vote_id: 'vote-1', user_id: 'u9',  unit_id: 'unit-9',  choice: 'yes',     vote_weight: 105, created_at: '2026-04-10T18:27:00Z' },
        { id: 'vc-10', vote_id: 'vote-1', user_id: 'u10', unit_id: 'unit-10', choice: 'yes',     vote_weight: 70,  created_at: '2026-04-10T18:28:00Z' },
        { id: 'vc-11', vote_id: 'vote-1', user_id: 'u11', unit_id: 'unit-11', choice: 'yes',     vote_weight: 115, created_at: '2026-04-10T18:29:00Z' },
        { id: 'vc-12', vote_id: 'vote-1', user_id: 'u12', unit_id: 'unit-12', choice: 'yes',     vote_weight: 90,  created_at: '2026-04-10T18:29:00Z' },
        { id: 'vc-13', vote_id: 'vote-1', user_id: 'u13', unit_id: 'unit-13', choice: 'yes',     vote_weight: 80,  created_at: '2026-04-10T18:30:00Z' },
        { id: 'vc-14', vote_id: 'vote-1', user_id: 'u14', unit_id: 'unit-14', choice: 'yes',     vote_weight: 100, created_at: '2026-04-10T18:30:00Z' },
        { id: 'vc-15', vote_id: 'vote-1', user_id: 'u15', unit_id: 'unit-15', choice: 'yes',     vote_weight: 95,  created_at: '2026-04-10T18:31:00Z' },
        { id: 'vc-16', vote_id: 'vote-1', user_id: 'u16', unit_id: 'unit-16', choice: 'no',      vote_weight: 60,  created_at: '2026-04-10T18:31:00Z' },
        { id: 'vc-17', vote_id: 'vote-1', user_id: 'u17', unit_id: 'unit-17', choice: 'no',      vote_weight: 85,  created_at: '2026-04-10T18:32:00Z' },
        { id: 'vc-18', vote_id: 'vote-1', user_id: 'u18', unit_id: 'unit-18', choice: 'abstain', vote_weight: 75,  created_at: '2026-04-10T18:33:00Z' },
      ],
    },
    {
      id: 'vote-2', meeting_id: 'mtg-2', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      question: 'Prélever le financement sur le fonds de réserve (solde actuel: € 83 200)?',
      description: 'Alternative au financement par appel de fonds exceptionnel. Le solde résiduel serait de € 38 200.',
      status: 'closed', vote_opened_at: '2026-04-10T18:38:00Z', vote_closed_at: '2026-04-10T18:50:00Z',
      created_at: '2026-04-10T18:38:00Z',
      vote_casts: [
        { id: 'vc-19', vote_id: 'vote-2', user_id: 'u1',  unit_id: 'unit-1',  choice: 'yes',     vote_weight: 120, created_at: '2026-04-10T18:40:00Z' },
        { id: 'vc-20', vote_id: 'vote-2', user_id: 'u2',  unit_id: 'unit-2',  choice: 'yes',     vote_weight: 100, created_at: '2026-04-10T18:40:00Z' },
        { id: 'vc-21', vote_id: 'vote-2', user_id: 'u3',  unit_id: 'unit-3',  choice: 'yes',     vote_weight: 80,  created_at: '2026-04-10T18:41:00Z' },
        { id: 'vc-22', vote_id: 'vote-2', user_id: 'u4',  unit_id: 'unit-4',  choice: 'yes',     vote_weight: 90,  created_at: '2026-04-10T18:42:00Z' },
        { id: 'vc-23', vote_id: 'vote-2', user_id: 'u5',  unit_id: 'unit-5',  choice: 'yes',     vote_weight: 110, created_at: '2026-04-10T18:43:00Z' },
        { id: 'vc-24', vote_id: 'vote-2', user_id: 'u6',  unit_id: 'unit-6',  choice: 'yes',     vote_weight: 75,  created_at: '2026-04-10T18:44:00Z' },
        { id: 'vc-25', vote_id: 'vote-2', user_id: 'u7',  unit_id: 'unit-7',  choice: 'yes',     vote_weight: 95,  created_at: '2026-04-10T18:44:00Z' },
        { id: 'vc-26', vote_id: 'vote-2', user_id: 'u8',  unit_id: 'unit-8',  choice: 'yes',     vote_weight: 85,  created_at: '2026-04-10T18:45:00Z' },
        { id: 'vc-27', vote_id: 'vote-2', user_id: 'u9',  unit_id: 'unit-9',  choice: 'abstain', vote_weight: 105, created_at: '2026-04-10T18:46:00Z' },
        { id: 'vc-28', vote_id: 'vote-2', user_id: 'u10', unit_id: 'unit-10', choice: 'abstain', vote_weight: 70,  created_at: '2026-04-10T18:47:00Z' },
        { id: 'vc-29', vote_id: 'vote-2', user_id: 'u11', unit_id: 'unit-11', choice: 'yes',     vote_weight: 115, created_at: '2026-04-10T18:47:00Z' },
        { id: 'vc-30', vote_id: 'vote-2', user_id: 'u12', unit_id: 'unit-12', choice: 'yes',     vote_weight: 90,  created_at: '2026-04-10T18:48:00Z' },
        { id: 'vc-31', vote_id: 'vote-2', user_id: 'u13', unit_id: 'unit-13', choice: 'yes',     vote_weight: 80,  created_at: '2026-04-10T18:48:00Z' },
        { id: 'vc-32', vote_id: 'vote-2', user_id: 'u14', unit_id: 'unit-14', choice: 'yes',     vote_weight: 100, created_at: '2026-04-10T18:49:00Z' },
        { id: 'vc-33', vote_id: 'vote-2', user_id: 'u15', unit_id: 'unit-15', choice: 'yes',     vote_weight: 95,  created_at: '2026-04-10T18:49:00Z' },
        { id: 'vc-34', vote_id: 'vote-2', user_id: 'u16', unit_id: 'unit-16', choice: 'yes',     vote_weight: 60,  created_at: '2026-04-10T18:50:00Z' },
        { id: 'vc-35', vote_id: 'vote-2', user_id: 'u17', unit_id: 'unit-17', choice: 'yes',     vote_weight: 85,  created_at: '2026-04-10T18:50:00Z' },
        { id: 'vc-36', vote_id: 'vote-2', user_id: 'u18', unit_id: 'unit-18', choice: 'yes',     vote_weight: 75,  created_at: '2026-04-10T18:50:00Z' },
      ],
    },
  ],
  'mtg-3': [
    {
      id: 'vote-3', meeting_id: 'mtg-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      question: 'Approuver le devis Dalkia pour la réparation de la chaudière commune (€ 12 400)?',
      description: 'Remplacement du brûleur principal et révision complète. Intervention urgente avant l\'hiver.',
      status: 'open', vote_opened_at: null, vote_closed_at: null,
      created_at: '2026-06-10T00:00:00Z',
      vote_casts: [],
    },
    {
      id: 'vote-4', meeting_id: 'mtg-3', building_id: 'mock-building-1', organization_id: 'mock-org-1',
      question: 'Financer la réparation via le fonds de réserve plutôt qu\'un appel de fonds exceptionnel?',
      description: null,
      status: 'open', vote_opened_at: null, vote_closed_at: null,
      created_at: '2026-06-10T00:00:00Z',
      vote_casts: [],
    },
  ],
  'mtg-b2-1': [
    {
      id: 'vote-5', meeting_id: 'mtg-b2-1', building_id: 'mock-building-2', organization_id: 'mock-org-1',
      question: 'Approuver les travaux de peinture façade (€ 28 500, entreprise Van den Berg)?',
      description: 'Ravalement complet façade avant et arrière. Peinture minérale 10 ans de garantie.',
      status: 'open', vote_opened_at: null, vote_closed_at: null,
      created_at: '2026-06-05T00:00:00Z',
      vote_casts: [],
    },
  ],
}
