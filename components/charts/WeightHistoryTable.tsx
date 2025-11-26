'use client'

import { useState } from 'react'
import { WeightLog } from '@/types'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { weightLogOperations } from '@/lib/firebase-operations'

interface WeightHistoryTableProps {
  weightLogs: WeightLog[]
  loading?: boolean
}

interface WeightEntry {
  id: string
  weight: number
  unit: 'kg' | 'lbs'
  loggedAt: Date
  notes?: string
  change?: number
  changePercentage?: number
}

interface PendingChange {
  weight?: number
  loggedAt?: string
  notes?: string
}

export function WeightHistoryTable({ weightLogs, loading }: WeightHistoryTableProps) {
  // Batch edit mode
  const [batchEditMode, setBatchEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
  const [saving, setSaving] = useState(false)

  // Single edit mode (legacy)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Calculate weight changes between entries
  const entries: WeightEntry[] = weightLogs.map((log, index) => {
    const entry: WeightEntry = {
      id: log.id,
      weight: log.weight,
      unit: log.unit,
      loggedAt: new Date(log.loggedAt),
      notes: log.notes
    }

    // Calculate change from previous entry (next in array since sorted desc)
    if (index < weightLogs.length - 1) {
      const previousLog = weightLogs[index + 1]
      const change = log.weight - previousLog.weight
      entry.change = Math.round(change * 10) / 10
      entry.changePercentage = previousLog.weight > 0
        ? Math.round((change / previousLog.weight) * 1000) / 10
        : 0
    }

    return entry
  })

  const handleEdit = (entry: WeightEntry) => {
    setEditingId(entry.id)
    setEditWeight(entry.weight.toString())
    setEditDate(entry.loggedAt.toISOString().split('T')[0]) // YYYY-MM-DD format
    setEditNotes(entry.notes || '')
  }

  const handleSaveEdit = async (id: string, unit: 'kg' | 'lbs') => {
    const weightValue = parseFloat(editWeight)

    if (!editWeight || weightValue <= 0) {
      toast.error('Please enter a valid weight')
      return
    }

    // Validate weight range
    const minWeight = unit === 'lbs' ? 50 : 23
    const maxWeight = unit === 'lbs' ? 500 : 227

    if (weightValue < minWeight || weightValue > maxWeight) {
      toast.error(`Please enter a weight between ${minWeight} and ${maxWeight} ${unit}`)
      return
    }

    // Validate date (no future dates)
    const selectedDate = new Date(editDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (selectedDate > today) {
      toast.error('Cannot set weight date to future')
      return
    }

    setProcessingId(id)

    try {
      // Parse date string as local date, not UTC
      const [year, month, day] = editDate.split('-').map(Number)
      const logDateTime = new Date(year, month - 1, day, 12, 0, 0, 0) // Local noon

      await weightLogOperations.updateWeightLog(id, {
        weight: weightValue,
        loggedAt: logDateTime.toISOString(),
        notes: editNotes || undefined
      })

      toast.success('Weight log updated')
      setEditingId(null)
      // onSnapshot will auto-update the list
    } catch (error) {
      logger.error('Error updating weight log', error as Error)
      toast.error('Failed to update weight log')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setProcessingId(id)

    try {
      await weightLogOperations.deleteWeightLog(id)
      toast.success('Weight log deleted')
      setDeleteConfirmId(null)
      // onSnapshot will auto-update the list
    } catch (error) {
      logger.error('Error deleting weight log', error as Error)
      toast.error('Failed to delete weight log')
    } finally {
      setProcessingId(null)
    }
  }

  // Batch edit handlers
  const handleBatchFieldChange = (id: string, field: keyof PendingChange, value: any) => {
    setPendingChanges(prev => {
      const newChanges = new Map(prev)
      const existing = newChanges.get(id) || {}
      newChanges.set(id, { ...existing, [field]: value })
      return newChanges
    })
  }

  const handleSaveAllChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.error('No changes to save')
      return
    }

    // Validate all changes
    for (const [id, changes] of pendingChanges.entries()) {
      const entry = entries.find(e => e.id === id)
      if (!entry) continue

      if (changes.weight !== undefined) {
        const minWeight = entry.unit === 'lbs' ? 50 : 23
        const maxWeight = entry.unit === 'lbs' ? 500 : 227
        if (changes.weight < minWeight || changes.weight > maxWeight) {
          toast.error(`Invalid weight for entry on ${entry.loggedAt.toLocaleDateString()}: must be between ${minWeight} and ${maxWeight} ${entry.unit}`)
          return
        }
      }

      if (changes.loggedAt !== undefined) {
        const selectedDate = new Date(changes.loggedAt)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        if (selectedDate > today) {
          toast.error(`Invalid date for entry: cannot be in the future`)
          return
        }
      }
    }

    setSaving(true)

    try {
      // Save all changes in parallel
      const savePromises = Array.from(pendingChanges.entries()).map(([id, changes]) => {
        const updateData: any = {}
        if (changes.weight !== undefined) updateData.weight = changes.weight
        if (changes.notes !== undefined) updateData.notes = changes.notes
        if (changes.loggedAt !== undefined) {
          // Parse date string as local date, not UTC
          const [year, month, day] = changes.loggedAt.split('-').map(Number)
          const logDateTime = new Date(year, month - 1, day, 12, 0, 0, 0) // Local noon
          updateData.loggedAt = logDateTime.toISOString()
        }
        return weightLogOperations.updateWeightLog(id, updateData)
      })

      await Promise.all(savePromises)

      toast.success(`✅ ${pendingChanges.size} ${pendingChanges.size === 1 ? 'entry' : 'entries'} updated`)
      setPendingChanges(new Map())
      setBatchEditMode(false)
      // onSnapshot will auto-update the list
    } catch (error) {
      logger.error('Error batch updating weight logs', error as Error)
      toast.error('Failed to save some changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelBatchEdit = () => {
    if (pendingChanges.size > 0) {
      const confirmed = confirm(`You have ${pendingChanges.size} unsaved changes. Discard them?`)
      if (!confirmed) return
    }
    setPendingChanges(new Map())
    setBatchEditMode(false)
  }

  const getBatchValue = (id: string, field: keyof PendingChange, originalValue: any) => {
    const pending = pendingChanges.get(id)
    if (pending && pending[field] !== undefined) {
      return pending[field]
    }
    return originalValue
  }

  const hasPendingChanges = (id: string) => {
    return pendingChanges.has(id)
  }

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-muted-foreground'
    if (change < 0) return 'text-success dark:text-green-400' // Weight loss
    if (change > 0) return 'text-error' // Weight gain
    return 'text-muted-foreground' // No change
  }

  const getChangeIcon = (change?: number) => {
    if (!change || Math.abs(change) < 0.1) return '➡️'
    return change < 0 ? '⬇️' : '⬆️'
  }

  if (loading) {
    return (
      <div className="w-full space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-muted rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="bg-background rounded-lg border-2 border-dashed border-border p-8 text-center">
        <div className="text-5xl mb-3">📊</div>
        <p className="text-foreground font-medium mb-1">No Weight Entries Yet</p>
        <p className="text-sm text-muted-foreground">Start tracking your weight to see your history here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Batch Edit Toggle & Action Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBatchEditMode(!batchEditMode)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              batchEditMode
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-background text-foreground border border-border hover:bg-background'
            }`}
          >
            {batchEditMode ? '✓ Batch Edit Mode' : 'Edit Multiple'}
          </button>
          {batchEditMode && pendingChanges.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {pendingChanges.size} {pendingChanges.size === 1 ? 'change' : 'changes'} pending
            </span>
          )}
        </div>

        {batchEditMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelBatchEdit}
              disabled={saving}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAllChanges}
              disabled={saving || pendingChanges.size === 0}
              className="px-4 py-2 text-sm bg-success text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : `Save All Changes ${pendingChanges.size > 0 ? `(${pendingChanges.size})` : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Weight</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Change</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Notes</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={`border-b border-border hover:bg-background dark:hover:bg-gray-900/50 ${
                  hasPendingChanges(entry.id) ? 'bg-warning-light' : ''
                }`}
              >
                <td className="py-3 px-4 text-sm text-foreground">
                  {batchEditMode || editingId === entry.id ? (
                    <input
                      type="date"
                      value={batchEditMode ? getBatchValue(entry.id, 'loggedAt', entry.loggedAt.toISOString().split('T')[0]) : editDate}
                      onChange={(e) => batchEditMode ? handleBatchFieldChange(entry.id, 'loggedAt', e.target.value) : setEditDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                      disabled={processingId === entry.id || saving}
                    />
                  ) : (
                    entry.loggedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  )}
                </td>
                <td className="py-3 px-4">
                  {batchEditMode || editingId === entry.id ? (
                    <input
                      type="number"
                      value={batchEditMode ? getBatchValue(entry.id, 'weight', entry.weight) : editWeight}
                      onChange={(e) => batchEditMode ? handleBatchFieldChange(entry.id, 'weight', parseFloat(e.target.value)) : setEditWeight(e.target.value)}
                      step="0.1"
                      className="w-24 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                      disabled={processingId === entry.id || saving}
                    />
                  ) : (
                    <span className="font-medium text-foreground">
                      {entry.weight} {entry.unit}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {entry.change !== undefined && (
                    <span className={`text-sm font-medium ${getChangeColor(entry.change)}`}>
                      {getChangeIcon(entry.change)} {entry.change > 0 ? '+' : ''}{entry.change} {entry.unit}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {batchEditMode || editingId === entry.id ? (
                    <input
                      type="text"
                      value={batchEditMode ? getBatchValue(entry.id, 'notes', entry.notes || '') : editNotes}
                      onChange={(e) => batchEditMode ? handleBatchFieldChange(entry.id, 'notes', e.target.value) : setEditNotes(e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                      disabled={processingId === entry.id || saving}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {entry.notes || '—'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {!batchEditMode && (
                    <div className="flex items-center justify-end gap-2">
                      {editingId === entry.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(entry.id, entry.unit)}
                            disabled={processingId === entry.id}
                            className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-hover disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={processingId === entry.id}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-foreground text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(entry)}
                            disabled={processingId === entry.id}
                            className="text-primary dark:text-purple-400 hover:text-primary-dark dark:hover:text-purple-300 text-sm font-medium disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            disabled={processingId === entry.id}
                            className="text-error hover:text-error-dark dark:hover:text-red-300 text-sm font-medium disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                {editingId === entry.id ? (
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                      disabled={processingId === entry.id}
                    />
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      step="0.1"
                      className="w-32 px-2 py-1 border border-border rounded bg-background text-foreground"
                      disabled={processingId === entry.id}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {entry.loggedAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {entry.weight} {entry.unit}
                    </p>
                  </>
                )}
              </div>
              {entry.change !== undefined && (
                <div className={`text-right ${getChangeColor(entry.change)}`}>
                  <p className="text-sm font-medium">
                    {getChangeIcon(entry.change)} {entry.change > 0 ? '+' : ''}{entry.change}
                  </p>
                  <p className="text-xs">
                    {entry.changePercentage ? `${entry.changePercentage > 0 ? '+' : ''}${entry.changePercentage}%` : ''}
                  </p>
                </div>
              )}
            </div>

            {editingId === entry.id ? (
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full mb-3 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                disabled={processingId === entry.id}
              />
            ) : (
              entry.notes && (
                <p className="text-sm text-muted-foreground mb-3">{entry.notes}</p>
              )
            )}

            <div className="flex gap-2 pt-2 border-t border-border">
              {editingId === entry.id ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(entry.id, entry.unit)}
                    disabled={processingId === entry.id}
                    className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded hover:bg-primary-hover disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={processingId === entry.id}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-foreground text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEdit(entry)}
                    disabled={processingId === entry.id}
                    className="flex-1 px-3 py-2 bg-primary-light text-primary-dark text-sm rounded hover:bg-purple-200 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(entry.id)}
                    disabled={processingId === entry.id}
                    className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-error-dark dark:text-red-300 text-sm rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete Weight Log?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete this weight entry.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={processingId === deleteConfirmId}
                className="flex-1 px-4 py-2 border border-border rounded text-foreground hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={processingId === deleteConfirmId}
                className="flex-1 px-4 py-2 bg-error text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === deleteConfirmId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
