/**
 * AuditLogCard Component
 *
 * Individual audit log card with timeline design.
 * Displays who performed what action on which entity, when.
 *
 * Features:
 * - Timeline-style layout with icon and connecting line
 * - Color-coded by action type (created, updated, deleted, etc.)
 * - Expandable to show field-level changes
 * - Metadata display (IP, user agent, notes)
 * - Dark mode support
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <AuditLogCard
 *   log={auditLog}
 *   showPatientName={true}
 *   defaultExpanded={false}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { FieldChangeDisplay } from './FieldChangeDisplay'
import type { AuditLog } from '@/types/audit'
import { AUDIT_ENTITY_CONFIGS, AUDIT_ACTION_CONFIGS } from '@/types/audit'

interface AuditLogCardProps {
  log: AuditLog
  showPatientName?: boolean    // Show patient name (for cross-patient views)
  defaultExpanded?: boolean    // Start in expanded state
  compact?: boolean            // Compact view (less padding, smaller text)
  className?: string
}

export function AuditLogCard({
  log,
  showPatientName = false,
  defaultExpanded = false,
  compact = false,
  className = ''
}: AuditLogCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const entityConfig = AUDIT_ENTITY_CONFIGS[log.entityType]
  const actionConfig = AUDIT_ACTION_CONFIGS[log.action]

  const hasChanges = log.changes && log.changes.length > 0
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0

  return (
    <div
      className={`
        group relative flex gap-4
        ${compact ? 'py-2' : 'py-4'}
        ${className}
      `}
    >
      {/* Timeline line */}
      <div className="relative flex flex-col items-center">
        {/* Icon circle */}
        <div
          className={`
            z-10 flex h-10 w-10 items-center justify-center rounded-full border-2
            ${getActionColorClasses(actionConfig.color, 'bg')}
            ${getActionColorClasses(actionConfig.color, 'border')}
          `}
          title={actionConfig.label}
        >
          <span className="text-lg">{actionConfig.icon}</span>
        </div>

        {/* Connecting line (hidden for last item - handled by parent) */}
        <div className="absolute top-10 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Action and Entity */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`
                  inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                  ${getActionColorClasses(actionConfig.color, 'badge')}
                `}
              >
                {actionConfig.label}
              </span>

              <span
                className={`
                  inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                  ${getEntityColorClasses(entityConfig.color)}
                `}
              >
                <span>{entityConfig.icon}</span>
                <span>{entityConfig.label}</span>
              </span>

              {log.entityName && (
                <span className="text-sm font-medium text-foreground dark:text-gray-200">
                  {log.entityName}
                </span>
              )}
            </div>

            {/* Actor and time */}
            <div className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
              <span className="font-medium">{log.performedByName || 'Unknown User'}</span>
              {log.performedByRole && (
                <span className="ml-1 text-xs">({formatRole(log.performedByRole)})</span>
              )}
              <span className="mx-2">•</span>
              <time dateTime={log.performedAt} title={formatFullDate(log.performedAt)}>
                {formatRelativeTime(log.performedAt)}
              </time>
              {showPatientName && log.patientName && (
                <>
                  <span className="mx-2">•</span>
                  <span>Patient: {log.patientName}</span>
                </>
              )}
            </div>
          </div>

          {/* Expand button */}
          {(hasChanges || hasMetadata) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <svg
                className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
            {/* Field changes */}
            {hasChanges && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground dark:text-gray-400">
                  Changes
                </h4>
                <FieldChangeDisplay changes={log.changes!} compact={compact} />
              </div>
            )}

            {/* Metadata */}
            {hasMetadata && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground dark:text-gray-400">
                  Additional Information
                </h4>
                <MetadataDisplay metadata={log.metadata!} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Display metadata (notes, reason, dosage info, etc.)
 */
function MetadataDisplay({ metadata }: { metadata: AuditLog['metadata'] }) {
  if (!metadata) return null

  return (
    <div className="space-y-2 text-sm">
      {metadata.reason && (
        <div>
          <span className="font-medium text-foreground dark:text-gray-200">Reason: </span>
          <span className="text-muted-foreground dark:text-gray-400">{metadata.reason}</span>
        </div>
      )}

      {metadata.notes && (
        <div>
          <span className="font-medium text-foreground dark:text-gray-200">Notes: </span>
          <span className="text-muted-foreground dark:text-gray-400">{metadata.notes}</span>
        </div>
      )}

      {metadata.dosage && (
        <div>
          <span className="font-medium text-foreground dark:text-gray-200">Dosage: </span>
          <span className="text-muted-foreground dark:text-gray-400">
            {metadata.dosage.amount} at {formatTime(metadata.dosage.takenAt)}
          </span>
          {metadata.dosage.notes && (
            <span className="ml-1 text-muted-foreground dark:text-gray-400">
              ({metadata.dosage.notes})
            </span>
          )}
        </div>
      )}

      {metadata.previousStatus && metadata.newStatus && (
        <div>
          <span className="font-medium text-foreground dark:text-gray-200">Status change: </span>
          <span className="text-red-600 dark:text-red-400">{metadata.previousStatus}</span>
          <span className="mx-2">→</span>
          <span className="text-green-600 dark:text-green-400">{metadata.newStatus}</span>
        </div>
      )}

      {metadata.fileType && metadata.fileSize && (
        <div>
          <span className="font-medium text-foreground dark:text-gray-200">File: </span>
          <span className="text-muted-foreground dark:text-gray-400">
            {metadata.fileType} ({formatFileSize(metadata.fileSize)})
          </span>
        </div>
      )}
    </div>
  )
}

// ==================== UTILITY FUNCTIONS ====================

function getActionColorClasses(color: string, type: 'bg' | 'border' | 'badge'): string {
  const colorMap: Record<string, Record<string, string>> = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-500 dark:border-green-600',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-500 dark:border-blue-600',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-500 dark:border-red-600',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-500 dark:border-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-500 dark:border-gray-600',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-500 dark:border-purple-600',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      border: 'border-indigo-500 dark:border-indigo-600',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    },
    teal: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      border: 'border-teal-500 dark:border-teal-600',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
    }
  }

  return colorMap[color]?.[type] || colorMap.gray[type]
}

function getEntityColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
  }

  return colorMap[color] || colorMap.gray
}

function formatRole(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return formatFullDate(isoDate)
}

function formatFullDate(isoDate: string): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
