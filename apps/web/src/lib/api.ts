// ── Shared API fetch helper ────────────────────────────────────
// Used by all feature modules to call the Hono API.
// Adds Bearer token auth and standard JSON handling.

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001'

export async function apiFetch<T = unknown>(
  path:     string,
  token:    string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Request failed')
  }

  // 204 No Content — return null
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}
