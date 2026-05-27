// Phase 3 — wired when ClamAV is configured on Railway
export async function handleScanFile(_payload: Record<string, unknown>) {
  // TODO: run ClamAV scan, set virus_scanned_at on pass, delete file on fail
}
