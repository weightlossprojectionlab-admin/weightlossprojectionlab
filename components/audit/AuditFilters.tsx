/**
 * AuditFilters Component
 *
 * Filter controls for audit trail (date, user, entity type, action).
 * Provides a comprehensive filtering UI with real-time updates.
 *
 * Features:
 * - Date range picker
 * - Multi-select for entity types and actions
 * - Search input for entity names, performer names
 * - User/performer filter
 * - Clear all filters button
 * - Responsive design
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * <AuditFilters
 *   filters={filters}
 *   onChange={setFilters}
 *   availableUsers={users}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import type {
  AuditLogFilters,
  AuditEntityType,
  AuditAction
} from '@/types/audit'
import { AUDIT_ENTITY_CONFIGS, AUDIT_ACTION_CONFIGS } from '@/types/audit'

interface AuditFiltersProps {
  filters: AuditLogFilters
  onChange: (filters: AuditLogFilters) => void
  availableUsers?: Array<{ id: string; name: string }>  // Optional list of users for filtering
  className?: string
}

export function AuditFilters({
  filters,
  onChange,
  availableUsers = [],
  className = ''
}: AuditFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasActiveFilters = Boolean(
    filters.entityType ||
    filters.action ||
    filters.startDate ||
    filters.endDate ||
    filters.performedBy ||
    filters.searchQuery
  )

  const clearFilters = () => {
    onChange({
      ...filters,
      entityType: undefined,
      action: undefined,
      startDate: undefined,
      endDate: undefined,
      performedBy: undefined,
      searchQuery: undefined
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search audit logs..."
          value={filters.searchQuery || ''}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value || undefined })}
          className="
            w-full rounded-lg border border-border bg-background px-4 py-2 pl-10
            text-foreground placeholder:text-muted-foreground
            focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
          "
        />
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {/* Entity type filter */}
        <EntityTypeFilter
          selected={filters.entityType}
          onChange={(entityType) => onChange({ ...filters, entityType })}
        />

        {/* Action filter */}
        <ActionFilter
          selected={filters.action}
          onChange={(action) => onChange({ ...filters, action })}
        />

        {/* Date range toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="
            rounded-lg border border-border bg-background px-3 py-1.5 text-sm
            font-medium text-foreground hover:bg-gray-50
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
          "
        >
          {showAdvanced ? 'Hide' : 'More'} Filters
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="
              rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm
              font-medium text-red-700 hover:bg-red-100
              dark:border-red-900 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50
            "
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="grid gap-4 rounded-lg border border-border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50 md:grid-cols-2">
          {/* Date range */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground dark:text-gray-200">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  startDate: e.target.value ? new Date(e.target.value) : undefined
                })
              }
              className="
                w-full rounded-lg border border-border bg-background px-3 py-2
                text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
              "
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground dark:text-gray-200">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                })
              }
              className="
                w-full rounded-lg border border-border bg-background px-3 py-2
                text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
              "
            />
          </div>

          {/* User filter */}
          {availableUsers.length > 0 && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground dark:text-gray-200">
                Performed By
              </label>
              <select
                value={filters.performedBy || ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    performedBy: e.target.value || undefined
                  })
                }
                className="
                  w-full rounded-lg border border-border bg-background px-3 py-2
                  text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
                "
              >
                <option value="">All Users</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Entity Type Filter (multi-select dropdown)
 */
function EntityTypeFilter({
  selected,
  onChange
}: {
  selected?: AuditEntityType | AuditEntityType[]
  onChange: (value?: AuditEntityType | AuditEntityType[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedTypes = Array.isArray(selected) ? selected : selected ? [selected] : []

  const toggleType = (type: AuditEntityType) => {
    if (selectedTypes.includes(type)) {
      const newTypes = selectedTypes.filter((t) => t !== type)
      onChange(newTypes.length > 0 ? newTypes : undefined)
    } else {
      onChange([...selectedTypes, type])
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5
          text-sm font-medium text-foreground hover:bg-gray-50
          dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
        "
      >
        <span>Entity Type</span>
        {selectedTypes.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white">
            {selectedTypes.length}
          </span>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-background shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="max-h-64 overflow-y-auto p-2">
              {(Object.keys(AUDIT_ENTITY_CONFIGS) as AuditEntityType[]).map((type) => {
                const config = AUDIT_ENTITY_CONFIGS[type]
                const isSelected = selectedTypes.includes(type)

                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleType(type)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>{config.icon}</span>
                    <span className="text-sm text-foreground dark:text-gray-200">{config.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Action Filter (multi-select dropdown)
 */
function ActionFilter({
  selected,
  onChange
}: {
  selected?: AuditAction | AuditAction[]
  onChange: (value?: AuditAction | AuditAction[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedActions = Array.isArray(selected) ? selected : selected ? [selected] : []

  const toggleAction = (action: AuditAction) => {
    if (selectedActions.includes(action)) {
      const newActions = selectedActions.filter((a) => a !== action)
      onChange(newActions.length > 0 ? newActions : undefined)
    } else {
      onChange([...selectedActions, action])
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5
          text-sm font-medium text-foreground hover:bg-gray-50
          dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
        "
      >
        <span>Action</span>
        {selectedActions.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white">
            {selectedActions.length}
          </span>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="max-h-64 overflow-y-auto p-2">
              {(Object.keys(AUDIT_ACTION_CONFIGS) as AuditAction[]).map((action) => {
                const config = AUDIT_ACTION_CONFIGS[action]
                const isSelected = selectedActions.includes(action)

                return (
                  <label
                    key={action}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAction(action)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>{config.icon}</span>
                    <span className="text-sm text-foreground dark:text-gray-200">{config.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
