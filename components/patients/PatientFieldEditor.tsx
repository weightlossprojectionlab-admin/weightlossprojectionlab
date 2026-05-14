/**
 * PatientFieldEditor — generic inline-edit cell for any PatientProfile
 * field. Click "Edit" to swap the display row for an input/select/
 * checkbox group, save to PUT /api/patients/[patientId], or cancel to
 * revert. Mirrors the existing PatientNameEditor pattern but generalized
 * across field types so the patient detail page can drop instances for
 * bloodType, gender, relationship, healthConditions, activityLevel,
 * weightGoal, etc. without a dedicated component per field.
 *
 * Why this exists: the wizard was the only entry point for static profile
 * fields (bloodType, healthConditions, height, activityLevel, etc.).
 * Once this primitive is in place on the patient detail page, the wizard
 * can shed those steps without orphaning the data.
 */

'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import toast from 'react-hot-toast'

export type FieldOption = { value: string; label: string }

type EditorType = 'text' | 'number' | 'select' | 'multi-select' | 'tag-input'

interface BaseProps {
  patientId: string
  field: string
  label: string
  canEdit: boolean
  emptyLabel?: string
  /** Called with the saved value on success. Used to optimistically
   *  update the parent's local patient state without a refetch. */
  onUpdated: (newValue: any) => void
}

interface TextProps extends BaseProps {
  type: 'text'
  value: string | undefined
  placeholder?: string
}

interface NumberProps extends BaseProps {
  type: 'number'
  value: number | undefined
  unit?: string
  step?: number
  min?: number
  max?: number
}

interface SelectProps extends BaseProps {
  type: 'select'
  value: string | undefined
  options: FieldOption[]
}

interface MultiSelectProps extends BaseProps {
  type: 'multi-select'
  value: string[] | undefined
  options: FieldOption[]
}

interface TagInputProps extends BaseProps {
  type: 'tag-input'
  value: string[] | undefined
  /** Placeholder text inside the input. */
  placeholder?: string
  /** Optional tone hint — `'positive'` (green chips, for liked things)
   *  vs `'negative'` (red chips, for avoid lists) vs `'neutral'`
   *  (default muted chips). Pure cosmetic. */
  tone?: 'positive' | 'negative' | 'neutral'
}

type Props = TextProps | NumberProps | SelectProps | MultiSelectProps | TagInputProps

export function PatientFieldEditor(props: Props) {
  const { patientId, field, label, canEdit, emptyLabel = 'Not recorded', onUpdated } = props

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<any>(props.value)

  const startEdit = () => {
    const initial = props.type === 'multi-select' || props.type === 'tag-input'
      ? (props.value ?? [])
      : (props.value ?? '')
    setDraft(initial)
    setEditing(true)
  }
  const cancelEdit = () => {
    setEditing(false)
    setDraft(props.value)
  }

  const save = async () => {
    // Normalize draft for storage
    let payloadValue: any = draft
    if (props.type === 'number') {
      if (draft === '' || draft === null || draft === undefined) {
        payloadValue = null
      } else {
        const n = typeof draft === 'number' ? draft : parseFloat(draft)
        if (Number.isNaN(n)) {
          toast.error('Invalid number')
          return
        }
        payloadValue = n
      }
    } else if (props.type === 'text' || props.type === 'select') {
      payloadValue = typeof draft === 'string' ? draft.trim() : draft
      if (payloadValue === '') payloadValue = null
    } else if (props.type === 'tag-input') {
      // Deduplicate + trim + drop empties. Order-preserving.
      const seen = new Set<string>()
      const cleaned: string[] = []
      for (const t of (Array.isArray(draft) ? draft : [])) {
        const trimmed = typeof t === 'string' ? t.trim() : ''
        if (!trimmed || seen.has(trimmed)) continue
        seen.add(trimmed)
        cleaned.push(trimmed)
      }
      payloadValue = cleaned
    }
    // multi-select: keep as array (may be empty)

    setSaving(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ [field]: payloadValue }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Failed to update ${label.toLowerCase()}` }))
        throw new Error(err.error || `Failed to update ${label.toLowerCase()}`)
      }
      onUpdated(payloadValue)
      setEditing(false)
      toast.success(`${label} updated`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to update ${label.toLowerCase()}`)
    } finally {
      setSaving(false)
    }
  }

  const displayValue = () => {
    if (props.type === 'multi-select') {
      const arr = (props.value as string[] | undefined) ?? []
      if (arr.length === 0) {
        return <span className="text-muted-foreground italic">{emptyLabel}</span>
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {arr.map(v => {
            const opt = props.options.find(o => o.value === v)
            return (
              <span key={v} className="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-1 rounded">
                {opt?.label ?? v}
              </span>
            )
          })}
        </div>
      )
    }
    if (props.type === 'tag-input') {
      const arr = (props.value as string[] | undefined) ?? []
      if (arr.length === 0) {
        return <span className="text-muted-foreground italic">{emptyLabel}</span>
      }
      // Tone-based chip styling: positive = green (safe foods),
      // negative = red (avoid lists), neutral = muted default.
      const chipClass =
        props.tone === 'positive'
          ? 'bg-success/10 text-success border-success/30'
          : props.tone === 'negative'
            ? 'bg-error/10 text-error border-error/30'
            : 'bg-muted text-foreground border-border'
      return (
        <div className="flex flex-wrap gap-1.5">
          {arr.map(v => (
            <span key={v} className={`text-xs ${chipClass} border px-2 py-1 rounded`}>
              {props.tone === 'negative' ? '⚠ ' : ''}{v}
            </span>
          ))}
        </div>
      )
    }
    if (props.type === 'select') {
      if (props.value === undefined || props.value === null || props.value === '') {
        return <span className="text-muted-foreground italic">{emptyLabel}</span>
      }
      const opt = props.options.find(o => o.value === props.value)
      return <span className="text-foreground">{opt?.label ?? props.value}</span>
    }
    if (props.type === 'number') {
      if (props.value === undefined || props.value === null) {
        return <span className="text-muted-foreground italic">{emptyLabel}</span>
      }
      return (
        <span className="text-foreground">
          {props.value}
          {'unit' in props && props.unit ? <span className="text-muted-foreground ml-1">{props.unit}</span> : null}
        </span>
      )
    }
    // text
    if (!props.value) {
      return <span className="text-muted-foreground italic">{emptyLabel}</span>
    }
    return <span className="text-foreground">{props.value}</span>
  }

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {label}
          </div>
          {!editing && <div>{displayValue()}</div>}
        </div>
        {!editing && canEdit && (
          <button
            data-write="true"
            onClick={startEdit}
            className="text-sm text-primary hover:text-primary/80 font-medium flex-shrink-0"
          >
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-2">
          {props.type === 'text' && (
            <input
              type="text"
              value={draft ?? ''}
              onChange={e => setDraft(e.target.value)}
              placeholder={props.placeholder}
              onKeyDown={e => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') cancelEdit()
              }}
              autoFocus
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}

          {props.type === 'number' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={draft ?? ''}
                onChange={e => setDraft(e.target.value)}
                step={props.step}
                min={props.min}
                max={props.max}
                onKeyDown={e => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {props.unit && <span className="text-sm text-muted-foreground">{props.unit}</span>}
            </div>
          )}

          {props.type === 'select' && (
            <select
              value={draft ?? ''}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{emptyLabel}</option>
              {props.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          {props.type === 'multi-select' && (
            <div className="space-y-1 max-h-48 overflow-y-auto border border-border bg-background rounded-lg p-2">
              {props.options.map(o => {
                const checked = (draft as string[]).includes(o.value)
                return (
                  <label key={o.value} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const next = new Set(draft as string[])
                        if (e.target.checked) next.add(o.value)
                        else next.delete(o.value)
                        setDraft(Array.from(next))
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-foreground">{o.label}</span>
                  </label>
                )
              })}
            </div>
          )}

          {props.type === 'tag-input' && (() => {
            // Tag chips + add-input. Enter or comma commits a new tag.
            // Backspace on empty input removes the last tag (standard
            // tag-input behavior).
            const tags = draft as string[]
            const chipClass =
              props.tone === 'positive'
                ? 'bg-success/10 text-success border-success/30'
                : props.tone === 'negative'
                  ? 'bg-error/10 text-error border-error/30'
                  : 'bg-muted text-foreground border-border'
            const addTag = (raw: string) => {
              const trimmed = raw.trim().replace(/,$/, '').trim()
              if (!trimmed) return
              if (tags.includes(trimmed)) return
              setDraft([...tags, trimmed])
            }
            const removeTag = (t: string) => setDraft(tags.filter(x => x !== t))
            return (
              <div className="border border-border bg-background rounded-lg p-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(t => (
                    <span key={t} className={`inline-flex items-center gap-1 text-xs ${chipClass} border px-2 py-1 rounded`}>
                      {props.tone === 'negative' ? '⚠ ' : ''}{t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full px-1 leading-none"
                        aria-label={`Remove ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder={props.placeholder ?? 'Type and press Enter…'}
                  onKeyDown={e => {
                    const target = e.currentTarget
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(target.value)
                      target.value = ''
                    } else if (e.key === 'Backspace' && target.value === '' && tags.length > 0) {
                      e.preventDefault()
                      setDraft(tags.slice(0, -1))
                    }
                  }}
                  onBlur={e => {
                    if (e.target.value.trim()) {
                      addTag(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  autoFocus
                  className="w-full px-2 py-1.5 border border-border bg-background text-foreground rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )
          })()}

          <div className="flex items-center gap-2 mt-2">
            <button
              data-write="true"
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
