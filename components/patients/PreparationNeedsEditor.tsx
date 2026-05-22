/**
 * PreparationNeedsEditor — inline-edit cell for the nested
 * `PatientProfile.preparationNeeds` object. The five sub-fields
 * (texture, cutSize, temperature, separated, notes) don't fit the
 * generic PatientFieldEditor mold (which is a single-value editor),
 * so this is a dedicated component that follows the same display/
 * edit toggle pattern.
 *
 * Surfaces on the patient detail page Info tab's Food Profile
 * section. Used by caregivers tracking sensory / texture / temp
 * preferences (autism, dysphagia, picky-eater contexts).
 */

'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import toast from 'react-hot-toast'
import type { PatientProfile } from '@/types/medical'
import { InlineEditButton } from '@/components/ui/InlineEditButton'

type PreparationNeeds = NonNullable<PatientProfile['preparationNeeds']>

interface Props {
  patientId: string
  value: PreparationNeeds | undefined
  canEdit: boolean
  onUpdated: (newValue: PreparationNeeds | null) => void
}

const TEXTURE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'pureed', label: 'Pureed' },
  { value: 'soft', label: 'Soft' },
  { value: 'whole', label: 'Whole' },
] as const

const CUT_SIZE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'minced', label: 'Minced' },
  { value: 'small-cubes', label: 'Small cubes' },
  { value: 'standard', label: 'Standard' },
  { value: 'whole', label: 'Whole' },
] as const

const TEMPERATURE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'cold', label: 'Cold' },
  { value: 'room', label: 'Room temp' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
] as const

export function PreparationNeedsEditor({ patientId, value, canEdit, onUpdated }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<PreparationNeeds>(value ?? {})

  const isEmpty = (n: PreparationNeeds | undefined) =>
    !n || (!n.texture && !n.cutSize && !n.temperature && !n.separated && !n.notes)

  const startEdit = () => {
    setDraft(value ?? {})
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraft(value ?? {})
    setEditing(false)
  }

  const save = async () => {
    // Normalize: empty strings → omit. If the whole object would be
    // empty after normalization, send null to clear the field.
    const cleaned: PreparationNeeds = {}
    if (draft.texture) cleaned.texture = draft.texture
    if (draft.cutSize) cleaned.cutSize = draft.cutSize
    if (draft.temperature) cleaned.temperature = draft.temperature
    if (draft.separated) cleaned.separated = true
    if (draft.notes && draft.notes.trim()) cleaned.notes = draft.notes.trim()

    const payloadValue = Object.keys(cleaned).length === 0 ? null : cleaned

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
        body: JSON.stringify({ preparationNeeds: payloadValue }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update preparation needs' }))
        throw new Error(err.error || 'Failed to update preparation needs')
      }
      onUpdated(payloadValue)
      setEditing(false)
      toast.success('Preparation needs updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update preparation needs')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Preparation needs
          </div>
          {!editing && (
            <div>
              {isEmpty(value) ? (
                <span className="text-muted-foreground italic">Not recorded</span>
              ) : (
                <div className="space-y-1 text-sm">
                  {value?.texture && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Texture:</span>
                      <span className="font-medium capitalize text-foreground">{value.texture}</span>
                    </div>
                  )}
                  {value?.cutSize && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cut size:</span>
                      <span className="font-medium capitalize text-foreground">
                        {value.cutSize.replace(/-/g, ' ')}
                      </span>
                    </div>
                  )}
                  {value?.temperature && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="font-medium capitalize text-foreground">{value.temperature}</span>
                    </div>
                  )}
                  {value?.separated && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Separated on plate:</span>
                      <span className="font-medium text-foreground">Yes</span>
                    </div>
                  )}
                  {value?.notes && (
                    <div>
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="font-medium text-foreground mt-0.5 whitespace-pre-wrap">{value.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {!editing && canEdit && (
          <InlineEditButton onClick={startEdit} aria-label="Edit preparation needs" />
        )}
      </div>

      {editing && (
        <div className="mt-2 space-y-3 border border-border bg-background rounded-lg p-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Texture</label>
            <select
              value={draft.texture ?? ''}
              onChange={e => setDraft({ ...draft, texture: (e.target.value || undefined) as PreparationNeeds['texture'] })}
              className="w-full px-2 py-1.5 border border-border bg-background text-foreground rounded text-sm"
            >
              {TEXTURE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Cut size</label>
            <select
              value={draft.cutSize ?? ''}
              onChange={e => setDraft({ ...draft, cutSize: (e.target.value || undefined) as PreparationNeeds['cutSize'] })}
              className="w-full px-2 py-1.5 border border-border bg-background text-foreground rounded text-sm"
            >
              {CUT_SIZE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Temperature</label>
            <select
              value={draft.temperature ?? ''}
              onChange={e => setDraft({ ...draft, temperature: (e.target.value || undefined) as PreparationNeeds['temperature'] })}
              className="w-full px-2 py-1.5 border border-border bg-background text-foreground rounded text-sm"
            >
              {TEMPERATURE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={!!draft.separated}
              onChange={e => setDraft({ ...draft, separated: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-foreground">Foods kept separated on the plate</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
            <textarea
              value={draft.notes ?? ''}
              onChange={e => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Anything else worth noting (e.g., no sauces touching, fork-only)…"
              rows={2}
              className="w-full px-2 py-1.5 border border-border bg-background text-foreground rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              data-write="true"
              onClick={save}
              disabled={saving}
              className="min-h-11 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="min-h-11 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 active:bg-muted/60 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
