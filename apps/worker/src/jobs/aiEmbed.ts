// ── AI Embed worker job ────────────────────────────────────────
// Generates pgvector embeddings for semantic search (RAG).
// Currently a placeholder — embeddings require Voyage AI or OpenAI.
// Architecture (pgvector table + upsert logic) is fully wired.
// Swap generateEmbedding() in gateway.ts when provider is configured.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env['SUPABASE_URL']          ?? '',
  process.env['SUPABASE_SERVICE_ROLE'] ?? '',
)

interface AiEmbedPayload {
  resource_type:   string
  resource_id:     string
  building_id:     string
  organization_id: string
  text:            string
}

export async function handleAiEmbed(payload: Record<string, unknown>) {
  const { resource_type, resource_id, building_id, organization_id, text } = payload as unknown as AiEmbedPayload

  if (!resource_type || !resource_id || !building_id || !organization_id || !text) {
    console.warn('[aiEmbed] missing required fields — skipping')
    return
  }

  // TODO: replace with real embedding when Voyage AI / OpenAI configured
  // const embedding = await generateEmbedding(text)
  // For now log and skip — table is ready, just needs the provider
  console.log(`[aiEmbed] placeholder — resource ${resource_type}:${resource_id} (${text.length} chars)`)
  console.log('[aiEmbed] configure VOYAGE_API_KEY or OPENAI_API_KEY to enable embeddings')
}
