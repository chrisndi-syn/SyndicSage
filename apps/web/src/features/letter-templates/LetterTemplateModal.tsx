import { useState, useEffect } from 'react'
import { useTranslation }      from 'react-i18next'
import type { LetterTemplate }  from './useLetterTemplates'

export const TEMPLATE_CATEGORIES = [
  'financial',
  'governance',
  'maintenance',
  'communication',
  'legal',
] as const

interface Props {
  template?: LetterTemplate
  onSave:    (data: TemplateFormData) => void
  onClose:   () => void
  saving:    boolean
}

export interface TemplateFormData {
  name:      string
  category:  string
  body_html: string
  variables: string[]
}

const MODAL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const PANEL: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6E6E73', marginBottom: 4 }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const ROW: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const FIELD: React.CSSProperties = { marginBottom: 14 }

export function LetterTemplateModal({ template, onSave, onClose, saving }: Props) {
  const { t } = useTranslation()
  const isEdit    = !!template
  const isDefault = template?.is_default ?? false

  const [form, setForm] = useState<TemplateFormData & { variablesRaw: string }>({
    name:         template?.name      ?? '',
    category:     template?.category  ?? '',
    body_html:    template?.body_html ?? '',
    variables:    template?.variables ?? [],
    variablesRaw: (template?.variables ?? []).join(', '),
  })
  const [err, setErr] = useState('')

  useEffect(() => {
    if (template) {
      setForm({
        name:         template.name,
        category:     template.category,
        body_html:    template.body_html,
        variables:    template.variables,
        variablesRaw: template.variables.join(', '),
      })
    }
  }, [template])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isDefault) return // read-only
    if (!form.name.trim()) { setErr(t('common.required')); return }
    if (!form.category) { setErr(t('common.required')); return }
    if (!form.body_html.trim()) { setErr(t('common.required')); return }
    setErr('')
    const variables = form.variablesRaw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
    onSave({ name: form.name, category: form.category, body_html: form.body_html, variables })
  }

  const titleKey = isEdit ? 'templates.editTemplate' : 'templates.addTemplate'

  return (
    <div style={MODAL} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 600, color: '#1E3A5F', margin: 0, flex: 1 }}>
            {t(titleKey)}
          </h2>
          {isDefault && (
            <span style={{ borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(30,58,95,0.08)', color: '#1E3A5F' }}>
              {t('templates.default')}
            </span>
          )}
        </div>

        {isDefault && (
          <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16, padding: '8px 12px', background: '#F9F9FB', borderRadius: 7 }}>
            {t('templates.defaultReadOnly')}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>{t('templates.name')}</label>
              <input
                style={{ ...INPUT, background: isDefault ? '#F9F9FB' : '#fff' }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                maxLength={200}
                readOnly={isDefault}
              />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>{t('templates.category')}</label>
              {isDefault ? (
                <input style={{ ...INPUT, background: '#F9F9FB' }} value={form.category} readOnly />
              ) : (
                <select style={INPUT} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                  <option value="">— select —</option>
                  {TEMPLATE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{t(`templates.category_${c}`)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('templates.variables')} <span style={{ fontWeight: 400, fontSize: 11 }}>({t('templates.variablesHint')})</span></label>
            <input
              style={{ ...INPUT, background: isDefault ? '#F9F9FB' : '#fff' }}
              value={form.variablesRaw}
              onChange={e => setForm(f => ({ ...f, variablesRaw: e.target.value }))}
              placeholder="owner_name, building_name, amount"
              readOnly={isDefault}
            />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>{t('templates.bodyHtml')}</label>
            <textarea
              style={{ ...INPUT, resize: 'vertical', minHeight: 200, fontFamily: 'monospace', fontSize: 12, background: isDefault ? '#F9F9FB' : '#fff' }}
              value={form.body_html}
              onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))}
              required
              readOnly={isDefault}
            />
          </div>

          {err && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(60,60,67,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              {t('common.cancel')}
            </button>
            {!isDefault && (
              <button type="submit" disabled={saving}
                style={{ padding: '8px 16px', borderRadius: 7, background: '#1E3A5F', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
