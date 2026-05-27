import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Supabase service-role client ──────────────────────────────
// Used only in apps/api — NEVER sent to the browser.
// Service-role key bypasses RLS — only use for:
//   - auth.getUser() token validation
//   - audit_log inserts (must be immutable from client)
//   - GDPR erasure operations
//   - Worker jobs
// All other queries use the anon key + RLS for security.

let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url  = process.env['SUPABASE_URL']
  const key  = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return _client
}
