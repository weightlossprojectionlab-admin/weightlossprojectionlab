/**
 * AuditTrailViewer Component
 *
 * Main audit trail viewer with filters, pagination, and real-time updates.
 * Displays a timeline of all audited actions across entities.
 *
 * Features:
 * - Real-time Firestore listener
 * - Advanced filtering (entity type, action, date range, search)
 * - Infinite scroll pagination
 * - Loading states and skeletons
 * - Empty states
 * - Error handling
 * - Export functionality (CSV, JSON)
 * - Dark mode support
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <AuditTrailViewer
 *   patientId="pat_123"
 *   userId="user_456"
 *   title="Audit Trail"
 * />
 * ```
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuditTrail } from '@/hooks/useAuditTrail'
import { AuditLogCard } from './AuditLogCard'
import { AuditFilters } from './AuditFilters'
import { Spinner } from '@/components/ui/Spinner'
import type { AuditLogFilters } from '@/types/audit'

interface AuditTrailViewerProps {
  patientId?: string           // Filter to specific patient
  userId?: string              // Filter to specific user (required if patientId not provided)
  entityId?: string            // Filter to specific entity
  title?: string               // Custom title
  showPatientName?: boolean    // Show patient names in cards
  defaultFilters?: Partial<AuditLogFilters>
  className?: string
}

export function AuditTrailViewer({
  patientId,
  userId,
  entityId,
  title = 'Audit Trail',
  showPatientName = false,
  defaultFilters = {},
  className = ''
}: AuditTrailViewerProps) {
  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    patientId,
    userId,
    entityId,
    limit: 50,
    orderBy: 'performedAt',
    orderDirection: 'desc',
    ...defaultFilters
  })

  // Update filters when props change
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      patientId,
      userId,
      entityId
    }))
  }, [patientId, userId, entityId])

  // Fetch audit logs
  const { logs, loading, error, hasMore, loadMore, refresh } = useAuditTrail({
    ...filters,
    realtime: true,
    autoLoad: true
  })

  // Export functionality
  const exportLogs = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
      downloadBlob(blob, `audit-trail-${Date.now()}.json`)
    } else {
      const csv = convertToCSV(logs)
      const blob = new Blob([csv], { type: 'text/csv' })
      downloadBlob(blob, `audit-trail-${Date.now()}.csv`)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground dark:text-gray-100">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
            {loading ? 'Loading...' : `${logs.length} log${logs.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="
              rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium
              text-foreground hover:bg-gray-50 disabled:opacity-50
              dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
            "
          >
            Refresh
          </button>

          {logs.length > 0 && (
            <div className="relative">
              <select
                onChange={(e) => exportLogs(e.target.value as 'csv' | 'json')}
                value=""
                className="
                  appearance-none rounded-lg border border-border bg-background px-4 py-2 pr-8
                  text-sm font-medium text-foreground hover:bg-gray-50
                  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
                "
              >
                <option value="" disabled>
                  Export
                </option>
                <option value="json">Export as JSON</option>
                <option value="csv">Export as CSV</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <AuditFilters filters={filters} onChange={setFilters} />

      {/* Content */}
      <div className="rounded-lg border border-border bg-background dark:border-gray-700 dark:bg-gray-900">
        {/* Error state */}
        {error && (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground dark:text-gray-100">
              Failed to load audit logs
            </h3>
            <p className="mb-4 text-sm text-muted-foreground dark:text-gray-400">{error.message}</p>
            <button
              onClick={refresh}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && logs.length === 0 && (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <AuditLogSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && logs.length === 0 && (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-6 w-6 text-muted-foreground dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground dark:text-gray-100">
              No audit logs found
            </h3>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {filters.searchQuery || filters.entityType || filters.action
                ? 'Try adjusting your filters to see more results.'
                : 'Audit logs will appear here as actions are performed.'}
            </p>
          </div>
        )}

        {/* Audit log timeline */}
        {!loading && !error && logs.length > 0 && (
          <div className="divide-y divide-border p-6 dark:divide-gray-700">
            {logs.map((log, index) => (
              <AuditLogCard
                key={log.id}
                log={log}
                showPatientName={showPatientName}
                defaultExpanded={index === 0} // Auto-expand first item
              />
            ))}

            {/* Hide timeline connector on last item */}
            <style jsx>{`
              div:last-of-type .absolute {
                display: none;
              }
            `}</style>
          </div>
        )}

        {/* Load more */}
        {!loading && !error && hasMore && (
          <div className="border-t border-border p-4 text-center dark:border-gray-700">
            <button
              onClick={loadMore}
              className="
                rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white
                hover:bg-primary/90 disabled:opacity-50
              "
            >
              Load More
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {loading && logs.length > 0 && (
          <div className="border-t border-border p-4 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
              <Spinner size="sm" />
              <span>Loading more logs...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Skeleton loader for audit log cards
 */
function AuditLogSkeleton() {
  return (
    <div className="flex gap-4 py-4">
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

// ==================== UTILITY FUNCTIONS ====================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return ''

  const headers = [
    'Date/Time',
    'Entity Type',
    'Entity Name',
    'Action',
    'Performed By',
    'Patient',
    'Changes Count',
    'Notes'
  ]

  const rows = logs.map((log) => [
    log.performedAt,
    log.entityType,
    log.entityName || '',
    log.action,
    log.performedByName || '',
    log.patientName || '',
    log.changes?.length || 0,
    log.metadata?.notes || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return csvContent
}
