// ── Portal — building documents for residents ───────────────────

import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import { FileText, Download, Search } from 'lucide-react'
import { Shell }               from '../../components/layout/Shell'
import { Topbar }              from '../../components/layout/Topbar'
import { useBuilding }         from '../../shared/building/BuildingContext'
import { supabase }            from '../../lib/supabase'

interface DocRow {
  id:          string
  name:        string
  category:    string
  file_size:   number | null
  created_at:  string
}

const DEMO_DOCS: DocRow[] = [
  { id: '1', name: 'PV Assemblée Générale 2025',     category: 'minutes',     file_size: 145408,  created_at: '2026-01-12T00:00:00' },
  { id: '2', name: 'Règlement de copropriété',       category: 'legal',       file_size: 286720,  created_at: '2025-09-03T00:00:00' },
  { id: '3', name: 'Budget annuel 2026',             category: 'budget',      file_size: 98304,   created_at: '2026-01-05T00:00:00' },
  { id: '4', name: 'Attestation assurance 2026',     category: 'insurance',   file_size: 55296,   created_at: '2026-02-14T00:00:00' },
  { id: '5', name: 'Planning entretien Q1 2026',     category: 'maintenance', file_size: 69632,   created_at: '2026-03-01T00:00:00' },
  { id: '6', name: 'Contrat syndic 2024–2027',       category: 'contract',    file_size: 204800,  created_at: '2025-06-15T00:00:00' },
]

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  minutes:     { bg: 'rgba(99,102,241,0.10)',  color: '#4F46E5' },
  legal:       { bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
  budget:      { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  insurance:   { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
  maintenance: { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  contract:    { bg: 'rgba(168,85,247,0.10)',  color: '#7C3AED' },
  other:       { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalDocumentsPage() {
  const { t }    = useTranslation()
  const { selected: building, myRole } = useBuilding()
  const isDemoMode = myRole !== 'co_owner' && myRole !== 'renter'

  const [docs,    setDocs]    = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) { setDocs(DEMO_DOCS); setLoading(false); return }
    if (!building) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch(`/api/v1/documents?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then((data: DocRow[]) => { setDocs(data); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [building, isDemoMode])

  async function handleDownload(doc: DocRow) {
    if (isDemoMode || !building) return
    setDownloading(doc.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/v1/documents/${doc.id}/download?building_id=${building.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json() as { url?: string }
      if (json.url) window.open(json.url, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  const catLabel = (cat: string) => t(`documents.cat_${cat}`, { defaultValue: cat })

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Shell>
      <Topbar title={t('portal.documentsSection')} subtitle={building?.name ?? 'Résidence Les Érables'} />
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Header + search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#4F46E5" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.documentsSection')}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{t('portal.documentsSub', { count: docs.length })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB',
            border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, padding: '7px 12px', minWidth: 220 }}>
            <Search size={14} color="#9CA3AF" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('common.search')}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, color: '#9CA3AF', fontSize: 13 }}>{t('common.loading')}</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>{t('common.noData')}</div>
          )}
          {filtered.map((doc, i) => {
            const c = CAT_COLORS[doc.category] ?? CAT_COLORS['other']!
            return (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}>
                <FileText size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                      background: c.bg, color: c.color }}>{catLabel(doc.category)}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {new Date(doc.created_at).toLocaleDateString('fr-BE')}
                      {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={isDemoMode || downloading === doc.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                    background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99,
                    padding: '5px 12px', fontSize: 12, color: '#374151', cursor: isDemoMode ? 'default' : 'pointer',
                    opacity: isDemoMode ? 0.4 : 1 }}
                >
                  <Download size={12} />
                  {downloading === doc.id ? '…' : t('portal.download')}
                </button>
              </div>
            )
          })}
        </div>

      </div>
    </Shell>
  )
}
