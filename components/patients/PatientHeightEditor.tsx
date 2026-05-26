'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import toast from 'react-hot-toast'
import { InlineEditButton } from '@/components/ui/InlineEditButton'

interface Props {
  patientId: string
  /** Stored height: total inches when unit='imperial', cm when unit='metric'. */
  value: number | undefined
  unit: 'imperial' | 'metric' | undefined
  canEdit: boolean
  onUpdated: (newValue: number | undefined) => void
}

const splitInches = (totalInches: number | undefined) => {
  if (totalInches === undefined || totalInches === null || Number.isNaN(totalInches)) {
    return { feet: '', inches: '' }
  }
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches - feet * 12
  return {
    feet: String(feet),
    inches: Number.isInteger(inches) ? String(inches) : inches.toFixed(1),
  }
}

export function PatientHeightEditor({ patientId, value, unit, canEdit, onUpdated }: Props) {
  const isMetric = unit === 'metric'
  const label = isMetric ? 'Height (cm)' : 'Height'

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const initialSplit = splitInches(value)
  const [feetDraft, setFeetDraft] = useState(initialSplit.feet)
  const [inchesDraft, setInchesDraft] = useState(initialSplit.inches)
  const [cmDraft, setCmDraft] = useState(value !== undefined && isMetric ? String(value) : '')

  const startEdit = () => {
    if (isMetric) {
      setCmDraft(value !== undefined && value !== null ? String(value) : '')
    } else {
      const s = splitInches(value)
      setFeetDraft(s.feet)
      setInchesDraft(s.inches)
    }
    setEditing(true)
  }
  const cancelEdit = () => setEditing(false)

  const save = async () => {
    let payloadValue: number | null
    if (isMetric) {
      if (cmDraft.trim() === '') {
        payloadValue = null
      } else {
        const n = parseFloat(cmDraft)
        if (Number.isNaN(n) || n < 0) {
          toast.error('Invalid height')
          return
        }
        payloadValue = n
      }
    } else {
      const fStr = feetDraft.trim()
      const iStr = inchesDraft.trim()
      if (fStr === '' && iStr === '') {
        payloadValue = null
      } else {
        const feet = fStr === '' ? 0 : parseFloat(fStr)
        const inches = iStr === '' ? 0 : parseFloat(iStr)
        if (Number.isNaN(feet) || Number.isNaN(inches) || feet < 0 || inches < 0 || inches >= 12) {
          toast.error('Enter feet and inches (0–11)')
          return
        }
        payloadValue = feet * 12 + inches
      }
    }

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
        body: JSON.stringify({ height: payloadValue }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update height' }))
        throw new Error(err.error || 'Failed to update height')
      }
      onUpdated(payloadValue ?? undefined)
      setEditing(false)
      toast.success('Height updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update height')
    } finally {
      setSaving(false)
    }
  }

  const displayValue = () => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground italic">Not recorded</span>
    }
    if (isMetric) {
      return (
        <span className="text-foreground">
          {value}
          <span className="text-muted-foreground ml-1">cm</span>
        </span>
      )
    }
    const { feet, inches } = splitInches(value)
    return (
      <span className="text-foreground">
        {feet}&apos; {inches}&quot;
      </span>
    )
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
          <InlineEditButton onClick={startEdit} aria-label="Edit height" />
        )}
      </div>

      {editing && (
        <div className="mt-2">
          {isMetric ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={cmDraft}
                onChange={e => setCmDraft(e.target.value)}
                step={0.1}
                min={0}
                onKeyDown={e => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">cm</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={feetDraft}
                onChange={e => setFeetDraft(e.target.value)}
                step={1}
                min={0}
                placeholder="0"
                aria-label="Feet"
                onKeyDown={e => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                className="w-20 px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">ft</span>
              <input
                type="number"
                value={inchesDraft}
                onChange={e => setInchesDraft(e.target.value)}
                step={1}
                min={0}
                max={11}
                placeholder="0"
                aria-label="Inches"
                onKeyDown={e => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="w-20 px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">in</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
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
