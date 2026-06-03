// ── AI client API ──────────────────────────────────────────────

import { supabase }  from '../../lib/supabase'
import { apiFetch }  from '../../lib/api'

export interface ChatResponse {
  conversation_id: string
  message:         string
  usage: {
    input_tokens:  number
    output_tokens: number
  }
}

export interface AccountingCodeSuggestion {
  code:       string
  label:      string
  confidence: number
}

export async function sendChatMessage(
  message:          string,
  conversationId?:  string,
  buildingId?:      string,
): Promise<ChatResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const path = buildingId
    ? `/api/v1/ai/chat?building_id=${buildingId}`
    : '/api/v1/ai/chat'

  return apiFetch<ChatResponse>(path, session.access_token, {
    method: 'POST',
    body:   JSON.stringify({ message, conversation_id: conversationId }),
  })
}

export async function suggestAccountingCode(
  description:  string,
  supplierName: string,
  buildingId:   string,
): Promise<AccountingCodeSuggestion> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const result = await apiFetch<{ suggestion: AccountingCodeSuggestion }>(
    `/api/v1/ai/suggest-accounting-code?building_id=${buildingId}`,
    session.access_token,
    {
      method: 'POST',
      body:   JSON.stringify({ description, supplier_name: supplierName }),
    },
  )
  return result.suggestion
}
