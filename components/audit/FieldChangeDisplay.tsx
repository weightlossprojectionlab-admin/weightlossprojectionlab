/**
 * FieldChangeDisplay Component
 *
 * Displays before/after comparison of field changes with visual diff.
 * Supports multiple data types (string, number, boolean, date, array, object).
 *
 * Features:
 * - Color-coded changes (red for removed, green for added)
 * - Type-specific rendering (dates, arrays, objects, images)
 * - Expandable/collapsible for large changes
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * <FieldChangeDisplay
 *   changes={auditLog.changes}
 *   compact={false}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import type { AuditFieldChange } from '@/types/audit'

interface FieldChangeDisplayProps {
  changes: AuditFieldChange[]
  compact?: boolean        // Compact view (single line per change)
  maxChanges?: number      // Maximum number of changes to show before collapsing
  className?: string
}

export function FieldChangeDisplay({
  changes,
  compact = false,
  maxChanges = 5,
  className = ''
}: FieldChangeDisplayProps) {
  const [showAll, setShowAll] = useState(false)

  if (!changes || changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground dark:text-gray-400">
        No changes recorded
      </div>
    )
  }

  const visibleChanges = showAll ? changes : changes.slice(0, maxChanges)
  const hasMore = changes.length > maxChanges

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleChanges.map((change, index) => (
        <FieldChange key={`${change.field}-${index}`} change={change} compact={compact} />
      ))}

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-primary hover:underline dark:text-blue-400"
        >
          Show {changes.length - maxChanges} more changes
        </button>
      )}

      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="text-sm text-primary hover:underline dark:text-blue-400"
        >
          Show less
        </button>
      )}
    </div>
  )
}

/**
 * Single field change display
 */
function FieldChange({ change, compact }: { change: AuditFieldChange; compact: boolean }) {
  const { fieldLabel, oldValue, newValue, dataType, metadata } = change

  // Render based on data type
  const renderValue = (value: any, isOld: boolean) => {
    if (value === null || value === undefined) {
      return (
        <span className="italic text-muted-foreground dark:text-gray-500">
          {isOld ? 'Empty' : 'N/A'}
        </span>
      )
    }

    switch (dataType) {
      case 'boolean':
        return (
          <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {value ? 'Yes' : 'No'}
          </span>
        )

      case 'date':
        return <span>{formatDate(value)}</span>

      case 'array':
        return (
          <span className="font-mono text-sm">
            {value} item{value !== 1 ? 's' : ''}
          </span>
        )

      case 'object':
        return <span className="font-mono text-sm">{JSON.stringify(value)}</span>

      case 'image':
      case 'file':
        return (
          <span className="text-blue-600 dark:text-blue-400">
            {typeof value === 'string' ? value : 'File'}
          </span>
        )

      default:
        return <span>{String(value)}</span>
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground dark:text-gray-200">{fieldLabel}:</span>
        <span className="line-through text-red-600 dark:text-red-400">{renderValue(oldValue, true)}</span>
        <span className="text-muted-foreground dark:text-gray-500">→</span>
        <span className="text-green-600 dark:text-green-400">{renderValue(newValue, false)}</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 font-medium text-foreground dark:text-gray-200">{fieldLabel}</div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Old Value */}
        <div className="rounded bg-red-50 p-2 dark:bg-red-900/20">
          <div className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Before</div>
          <div className="text-sm text-red-900 dark:text-red-300">{renderValue(oldValue, true)}</div>
        </div>

        {/* New Value */}
        <div className="rounded bg-green-50 p-2 dark:bg-green-900/20">
          <div className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">After</div>
          <div className="text-sm text-green-900 dark:text-green-300">{renderValue(newValue, false)}</div>
        </div>
      </div>

      {/* Array diff details */}
      {dataType === 'array' && metadata?.arrayDiff && (
        <ArrayDiffDetails diff={metadata.arrayDiff} />
      )}

      {/* Object diff details */}
      {dataType === 'object' && metadata?.objectDiff && (
        <ObjectDiffDetails diff={metadata.objectDiff} />
      )}
    </div>
  )
}

/**
 * Array diff details (added, removed, unchanged)
 */
function ArrayDiffDetails({ diff }: { diff: { added: any[]; removed: any[]; unchanged: any[] } }) {
  const { added, removed, unchanged } = diff

  return (
    <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs dark:border-gray-700">
      {added.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-green-700 dark:text-green-400">Added:</span>
          <span className="text-green-900 dark:text-green-300">{added.join(', ')}</span>
        </div>
      )}
      {removed.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-red-700 dark:text-red-400">Removed:</span>
          <span className="text-red-900 dark:text-red-300">{removed.join(', ')}</span>
        </div>
      )}
      {unchanged.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-muted-foreground dark:text-gray-500">Unchanged:</span>
          <span className="text-muted-foreground dark:text-gray-400">{unchanged.length} items</span>
        </div>
      )}
    </div>
  )
}

/**
 * Object diff details (added, removed, modified keys)
 */
function ObjectDiffDetails({
  diff
}: {
  diff: { added: string[]; removed: string[]; modified: string[] }
}) {
  const { added, removed, modified } = diff

  return (
    <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs dark:border-gray-700">
      {added.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-green-700 dark:text-green-400">Added properties:</span>
          <span className="text-green-900 dark:text-green-300">{added.join(', ')}</span>
        </div>
      )}
      {removed.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-red-700 dark:text-red-400">Removed properties:</span>
          <span className="text-red-900 dark:text-red-300">{removed.join(', ')}</span>
        </div>
      )}
      {modified.length > 0 && (
        <div className="flex gap-2">
          <span className="font-medium text-blue-700 dark:text-blue-400">Modified properties:</span>
          <span className="text-blue-900 dark:text-blue-300">{modified.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Format date for display
 */
function formatDate(value: string | Date): string {
  try {
    const date = typeof value === 'string' ? new Date(value) : value
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return String(value)
  }
}
