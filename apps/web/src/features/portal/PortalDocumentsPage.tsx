// ── Portal — building documents for residents ───────────────────

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'

const DEMO_DOCS = [
  { id: '1', name: 'Annual General Meeting minutes — 2025',   category: 'Minutes',      date: '2026-01-12', size: '142 KB' },
  { id: '2', name: 'Building regulations (statuten)',         category: 'Legal',        date: '2025-09-03', size: '280 KB' },
  { id: '3', name: 'Annual budget 2026',                      category: 'Finance',      date: '2026-01-05', size: '96 KB'  },
  { id: '4', name: 'Insurance certificate 2026',              category: 'Insurance',    date: '2026-02-14', size: '54 KB'  },
  { id: '5', name: 'Maintenance schedule Q1 2026',            category: 'Maintenance',  date: '2026-03-01', size: '68 KB'  },
]

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Minutes:    { bg: 'rgba(99,102,241,0.10)',  color: '#4F46E5' },
  Legal:      { bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
  Finance:    { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  Insurance:  { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
  Maintenance:{ bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
}

export default function PortalDocumentsPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  return (
    <Shell>
      <Topbar title={t('portal.documentsSection')} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/portal')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: '#6B7280', fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={15} /> {t('portal.backToPortal')}
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="#4F46E5" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{t('portal.documentsSection')}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{t('portal.documentsSub', { count: DEMO_DOCS.length })}</div>
          </div>
        </div>

        {/* List */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {DEMO_DOCS.map((doc, i) => {
            const c = CAT_COLORS[doc.category] ?? { bg: 'rgba(0,0,0,0.06)', color: '#374151' }
            return (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                borderBottom: i < DEMO_DOCS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}>
                <FileText size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{doc.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                      background: c.bg, color: c.color }}>{doc.category}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{doc.date} · {doc.size}</span>
                  </div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 99,
                  padding: '5px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                  <Download size={12} /> {t('portal.download')}
                </button>
              </div>
            )
          })}
        </div>

      </div>
    </Shell>
  )
}
