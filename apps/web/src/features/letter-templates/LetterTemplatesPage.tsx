// ── Letter Templates page ──────────────────────────────────────

import { useState }       from 'react'
import { useTranslation } from 'react-i18next'
import { FileText }       from 'lucide-react'
import { Shell }          from '../../components/layout/Shell'
import { Topbar }         from '../../components/layout/Topbar'
import { useBuilding }    from '../../shared/building/BuildingContext'
import {
  useLetterTemplates,
  useCreateLetterTemplate,
  useUpdateLetterTemplate,
  useDeleteLetterTemplate,
} from './useLetterTemplates'
import { LetterTemplateModal } from './LetterTemplateModal'
import type { LetterTemplate }  from './letterTemplates.api'
import type { TemplateFormData } from './LetterTemplateModal'

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  financial:     { bg: 'rgba(34,197,94,0.10)',   color: '#15803D' },
  governance:    { bg: 'rgba(30,58,95,0.08)',    color: '#1E3A5F' },
  maintenance:   { bg: 'rgba(245,158,11,0.10)',  color: '#B45309' },
  communication: { bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
  legal:         { bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
}

export default function LetterTemplatesPage() {
  const { t } = useTranslation()
  const { selected: building } = useBuilding()
  const orgId = building?.organization_id ?? 'mock-org-1'

  const { data: templates = [], isLoading, error } = useLetterTemplates(orgId, building?.id)

  const createTemplate = useCreateLetterTemplate(orgId)
  const updateTemplate = useUpdateLetterTemplate(orgId)
  const deleteTemplate = useDeleteLetterTemplate(orgId)

  const [showModal,    setShowModal]    = useState(false)
  const [editTemplate, setEditTemplate] = useState<LetterTemplate | undefined>()
  const [confirmDel,   setConfirmDel]   = useState<LetterTemplate | null>(null)
  const [preview,      setPreview]      = useState<LetterTemplate | null>(null)

  if (!building) {
    return (
      <Shell>
        <Topbar title={t('templates.title')} />
        <div style={{ padding: 24, color: '#6E6E73', fontSize: 14 }}>{t('common.selectBuilding')}</div>
      </Shell>
    )
  }

  async function handleSave(data: TemplateFormData) {
    if (editTemplate) {
      await updateTemplate.mutateAsync({ id: editTemplate.id, body: data })
    } else {
      await createTemplate.mutateAsync(data)
    }
    setShowModal(false)
    setEditTemplate(undefined)
  }

  const isSaving = createTemplate.isPending || updateTemplate.isPending

  return (
    <Shell>
      <Topbar title={t('templates.title')} subtitle={building.name} />
      <div style={{ padding: 24 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setEditTemplate(undefined); setShowModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#1E3A5F', border: 'none',
              borderRadius: 7, color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {t('templates.addTemplate')}
          </button>
        </div>

        {isLoading && <p style={{ color: '#6E6E73', fontSize: 14 }}>{t('common.loading')}</p>}
        {error     && <p style={{ color: '#DC2626', fontSize: 14 }}>{t('common.error')}</p>}

        {!isLoading && !error && templates.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', borderRadius: 10,
            border: '1px solid rgba(60,60,67,0.10)',
            color: '#6E6E73', fontSize: 14,
          }}>
            <FileText size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t('templates.empty')}</p>
          </div>
        )}

        {/* Main layout: table + preview panel side-by-side when preview is open */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {templates.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: '#FFFFFF', borderRadius: 10,
                border: '1px solid rgba(60,60,67,0.10)', overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9F9FB' }}>
                      {[
                        t('templates.name'), t('templates.category'), t('templates.isDefault'),
                        t('templates.variablesCount'), t('common.date'), t('common.actions'),
                      ].map(h => (
                        <th key={h} style={{
                          padding: '10px 16px', textAlign: 'left',
                          fontSize: 11, fontWeight: 600, color: '#6E6E73',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '1px solid rgba(60,60,67,0.08)',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((tmpl, i) => {
                      const cc = CATEGORY_COLORS[tmpl.category] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' }
                      const isSelected = preview?.id === tmpl.id
                      return (
                        <tr
                          key={tmpl.id}
                          onClick={() => setPreview(isSelected ? null : tmpl)}
                          style={{
                            borderBottom: i < templates.length - 1 ? '1px solid rgba(60,60,67,0.06)' : 'none',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(30,58,95,0.04)' : 'transparent',
                          }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 500 }}>{tmpl.name}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: cc.bg, color: cc.color }}>
                              {t(`templates.category_${tmpl.category}`)}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {tmpl.is_default && (
                              <span style={{ borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, background: 'rgba(30,58,95,0.08)', color: '#1E3A5F' }}>
                                {t('templates.default')}
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, color: '#6E6E73' }}>{tmpl.variables.length}</td>
                          <td style={{ ...tdStyle, color: '#6E6E73' }}>
                            {new Date(tmpl.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={tdStyle} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <SmallBtn
                                onClick={() => { setEditTemplate(tmpl); setShowModal(true) }}
                                label={tmpl.is_default ? t('common.view') : t('common.edit')}
                              />
                              {!tmpl.is_default && (
                                <SmallBtn onClick={() => setConfirmDel(tmpl)} label={t('common.delete')} danger />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview panel */}
          {preview && (
            <div style={{
              width: 380, flexShrink: 0,
              background: '#FFFFFF', borderRadius: 10,
              border: '1px solid rgba(60,60,67,0.10)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(60,60,67,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{t('templates.preview')}</span>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6E6E73', fontSize: 16 }}>×</button>
              </div>
              <div style={{ padding: 16 }}>
                <iframe
                  srcDoc={preview.body_html}
                  style={{ width: '100%', height: 400, border: 'none', borderRadius: 6, background: '#F9F9FB' }}
                  sandbox="allow-same-origin"
                  title={preview.name}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <LetterTemplateModal
          template={editTemplate}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTemplate(undefined) }}
          saving={isSaving}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          message={`${t('common.delete')} "${confirmDel.name}"?`}
          onConfirm={async () => {
            await deleteTemplate.mutateAsync(confirmDel.id)
            if (preview?.id === confirmDel.id) setPreview(null)
            setConfirmDel(null)
          }}
          onCancel={() => setConfirmDel(null)}
          loading={deleteTemplate.isPending}
          t={t}
        />
      )}
    </Shell>
  )
}

// ── Helpers ────────────────────────────────────────────────────

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#1E3A5F', verticalAlign: 'middle',
}

function SmallBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: 'transparent',
      border: `1px solid ${danger ? 'rgba(220,38,38,0.25)' : 'rgba(60,60,67,0.15)'}`,
      borderRadius: 5, color: danger ? '#DC2626' : '#6E6E73',
      fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, loading, t }: {
  message: string; onConfirm: () => void; onCancel: () => void;
  loading: boolean; t: (key: string) => string
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#1E3A5F' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid rgba(60,60,67,0.18)', borderRadius: 6, fontSize: 13, color: '#6E6E73', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '7px 16px', background: '#DC2626', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? t('common.loading') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
