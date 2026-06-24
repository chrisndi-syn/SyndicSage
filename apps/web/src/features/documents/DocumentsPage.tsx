// ── Documents page ────────────────────────────────────────────

import { useState, useRef }   from 'react'
import { useTranslation }     from 'react-i18next'
import { FileText, Upload, Download, Trash2, Eye, EyeOff } from 'lucide-react'
import { Shell }              from '../../components/layout/Shell'
import { Topbar }             from '../../components/layout/Topbar'
import { useBuilding }        from '../../shared/building/BuildingContext'
import { useDocuments, useUploadDocument, useDownloadDocument, useDeleteDocument } from './useDocuments'
import { DOCUMENT_CATEGORIES } from './documents.api'
import type { Document }      from './documents.api'

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  minutes:     { bg: '#dbeafe', color: '#1d4ed8' },
  budget:      { bg: '#d1fae5', color: '#065f46' },
  contract:    { bg: '#fef3c7', color: '#92400e' },
  insurance:   { bg: '#ede9fe', color: '#5b21b6' },
  legal:        { bg: '#fee2e2', color: '#991b1b' },
  maintenance:  { bg: '#e0f2fe', color: '#0369a1' },
  acte_de_base: { bg: '#fdf4ff', color: '#7e22ce' },
  other:        { bg: '#f3f4f6', color: '#374151' },
}

const VISIBILITY_COLORS: Record<string, { bg: string; color: string }> = {
  syndic_only:   { bg: '#fef3c7', color: '#92400e' },
  all_residents: { bg: '#d1fae5', color: '#065f46' },
}

export default function DocumentsPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()

  const { data: docs = [], isLoading } = useDocuments(building?.id)
  const upload   = useUploadDocument(building?.id ?? '')
  const download = useDownloadDocument(building?.id ?? '')
  const remove   = useDeleteDocument(building?.id ?? '')

  const [showUpload,    setShowUpload]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Upload form state
  const fileRef    = useRef<HTMLInputElement>(null)
  const [file,       setFile]       = useState<File | null>(null)
  const [docName,    setDocName]    = useState('')
  const [category,   setCategory]   = useState('other')
  const [visibility, setVisibility] = useState('syndic_only')
  const [uploadErr,  setUploadErr]  = useState('')

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('documents.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  const filtered = categoryFilter === 'all'
    ? docs
    : docs.filter(d => d.category === categoryFilter)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setUploadErr(t('common.required')); return }
    if (!docName.trim()) { setUploadErr(t('common.required')); return }
    setUploadErr('')
    try {
      await upload.mutateAsync({ file, name: docName.trim(), category, visibility })
      setShowUpload(false)
      setFile(null)
      setDocName('')
      setCategory('other')
      setVisibility('syndic_only')
    } catch (err: any) {
      setUploadErr(err.message ?? t('common.error'))
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const url = await download.mutateAsync(doc.id)
      window.open(url, '_blank', 'noopener')
    } catch {
      alert(t('errors.generic'))
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await remove.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch {
      alert(t('errors.generic'))
    }
  }

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid rgba(60,60,67,0.2)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }
  const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
  const FIELD: React.CSSProperties = { marginBottom: 14 }

  return (
    <Shell>
      <Topbar title={t('documents.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {(['all', ...DOCUMENT_CATEGORIES] as string[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  background: categoryFilter === cat ? '#1E3A5F' : '#F2F2F7',
                  color:      categoryFilter === cat ? '#fff' : '#1E3A5F',
                  transition: 'background 0.15s',
                }}
              >
                {cat === 'all' ? t('common.filter') + ': ' + t('charges.all') : t(`documents.${cat}`)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowUpload(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#1E3A5F', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <Upload size={14} />
            {t('documents.upload')}
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6E6E73' }}>
            <FileText size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{t('documents.empty')}</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(60,60,67,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F2F2F7' }}>
                  {[t('common.name'), t('documents.category'), t('documents.visibility'), t('common.date'), 'Size', t('common.actions')].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc, i) => {
                  const catStyle  = CATEGORY_COLORS[doc.category]  ?? CATEGORY_COLORS['other']!
                  const visStyle  = VISIBILITY_COLORS[doc.visibility] ?? VISIBILITY_COLORS['syndic_only']!
                  return (
                    <tr key={doc.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(60,60,67,0.06)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1E3A5F' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={15} style={{ color: '#6E6E73', flexShrink: 0 }} />
                          {doc.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: catStyle.bg, color: catStyle.color, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                          {t(`documents.${doc.category}`)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: visStyle.bg, color: visStyle.color, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {doc.visibility === 'syndic_only'
                            ? <><EyeOff size={10} /> {t('documents.syndicOnly')}</>
                            : <><Eye    size={10} /> {t('documents.allResidents')}</>
                          }
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#6E6E73' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#6E6E73' }}>
                        {formatBytes(doc.file_size)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleDownload(doc)}
                            title={t('common.export')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A5F', padding: 4 }}
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(doc)}
                            title={t('common.delete')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowUpload(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', marginBottom: 20 }}>
              {t('documents.upload')}
            </h2>
            <form onSubmit={handleUpload}>
              <div style={FIELD}>
                <label style={LABEL}>{t('common.name')}</label>
                <input style={INPUT} value={docName} onChange={e => setDocName(e.target.value)} maxLength={255} required />
              </div>

              <div style={FIELD}>
                <label style={LABEL}>{t('documents.category')}</label>
                <select style={INPUT} value={category} onChange={e => setCategory(e.target.value)}>
                  {DOCUMENT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{t(`documents.${c}`)}</option>
                  ))}
                </select>
              </div>

              <div style={FIELD}>
                <label style={LABEL}>{t('documents.visibility')}</label>
                <select style={INPUT} value={visibility} onChange={e => setVisibility(e.target.value)}>
                  <option value="syndic_only">{t('documents.syndicOnly')}</option>
                  <option value="all_residents">{t('documents.allResidents')}</option>
                </select>
              </div>

              <div style={FIELD}>
                <label style={LABEL}>File (PDF, JPEG, PNG — max 20MB)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ ...INPUT, padding: '6px 10px', cursor: 'pointer' }}
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setFile(f)
                    if (f && !docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
                  }}
                  required
                />
              </div>

              {uploadErr && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{uploadErr}</p>}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUpload(false)}
                  style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={upload.isPending}
                  style={{ padding: '8px 16px', borderRadius: 7, background: '#1E3A5F', color: '#fff', border: 'none', cursor: upload.isPending ? 'not-allowed' : 'pointer', fontSize: 13, opacity: upload.isPending ? 0.7 : 1 }}>
                  {upload.isPending ? t('common.saving') : t('documents.upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E3A5F', marginBottom: 8 }}>{t('common.confirm')}</h3>
            <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 20 }}>
              {t('accounting.deleteConfirm').replace('{{name}}', confirmDelete.name)}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={remove.isPending}
                style={{ padding: '8px 16px', borderRadius: 7, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
