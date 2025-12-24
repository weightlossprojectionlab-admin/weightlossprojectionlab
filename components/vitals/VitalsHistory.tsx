'use client'

import React, { useState, useMemo } from 'react'
import { VitalSign, VitalType } from '@/types/medical'
import {
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { formatVitalForDisplay, getVitalTypeLabel } from '@/lib/vitals-wizard-transform'

interface VitalsHistoryProps {
  vitals: VitalSign[]
  onEdit?: (vital: VitalSign) => void
  onDelete?: (vitalId: string, vitalType: string) => void
  canEdit?: boolean
  getDisplayName?: (userId: string) => string
  onLogPreviousVital?: () => void
}

type DateFilter = 'all' | 'today' | 'week' | 'month'

/**
 * VitalsHistory - Comprehensive filterable vitals history table
 *
 * Replaces the sidebar "Recent Vitals" with a full-featured main view component.
 * Provides filtering by date range and vital type.
 *
 * DRY principle: Single source for vitals history viewing across the app.
 */
export default function VitalsHistory({
  vitals,
  onEdit,
  onDelete,
  canEdit = false,
  getDisplayName,
  onLogPreviousVital
}: VitalsHistoryProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('week')
  const [typeFilter, setTypeFilter] = useState<VitalType | 'all'>('all')

  // Get unique vital types from data
  const availableTypes = useMemo(() => {
    const types = new Set<string>()
    vitals.forEach(v => types.add(v.type))
    return Array.from(types).sort()
  }, [vitals])

  // Filter vitals based on selected filters
  const filteredVitals = useMemo(() => {
    let filtered = [...vitals]

    // Date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(v => {
          const vitalDate = new Date(v.recordedAt)
          const vitalDay = new Date(vitalDate.getFullYear(), vitalDate.getMonth(), vitalDate.getDate())
          return vitalDay.getTime() === today.getTime()
        })
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        filtered = filtered.filter(v => new Date(v.recordedAt) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        filtered = filtered.filter(v => new Date(v.recordedAt) >= monthAgo)
        break
      // 'all' - no date filtering
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(v => v.type === typeFilter)
    }

    // Sort by date descending (most recent first)
    return filtered.sort((a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )
  }, [vitals, dateFilter, typeFilter])

  if (vitals.length === 0) {
    return null // Don't show if no vitals
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {/* Header with Filters */}
      <div className="bg-muted px-6 py-4 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-foreground" />
              Vitals History
            </h2>
            <p className="text-sm text-foreground/70 mt-1">
              {filteredVitals.length} record{filteredVitals.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Log Previous Vital Button */}
            {onLogPreviousVital && canEdit && (
              <button
                onClick={onLogPreviousVital}
                className="px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-2 touch-manipulation"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Log Previous Vital</span>
                <span className="sm:hidden">Log Previous</span>
              </button>
            )}
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as VitalType | 'all')}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>
                    {getVitalTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table with fixed height and scrollbar */}
      <div className="overflow-y-auto max-h-[600px]">
        {filteredVitals.length > 0 ? (
          <table className="w-full">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Type & Info</th>
                <th className="px-3 py-3 text-left font-semibold">Value</th>
                <th className="px-3 py-3 text-left font-semibold hidden lg:table-cell">Notes</th>
                {canEdit && <th className="px-3 py-3 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVitals.map((vital) => (
                <VitalRow
                  key={vital.id}
                  vital={vital}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={canEdit}
                  getDisplayName={getDisplayName}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <FunnelIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No vitals found for selected filters</p>
            <button
              onClick={() => {
                setDateFilter('all')
                setTypeFilter('all')
              }}
              className="mt-3 text-sm text-primary hover:text-primary-dark font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * VitalRow - Individual row in vitals history table
 */
function VitalRow({
  vital,
  onEdit,
  onDelete,
  canEdit,
  getDisplayName
}: {
  vital: VitalSign
  onEdit?: (vital: VitalSign) => void
  onDelete?: (vitalId: string, vitalType: string) => void
  canEdit: boolean
  getDisplayName?: (userId: string) => string
}) {
  const label = getVitalTypeLabel(vital.type)
  const displayValue = formatVitalForDisplay(vital.type, vital.value, vital.unit)

  const dateTime = new Date(vital.recordedAt)
  const dateStr = dateTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const timeStr = dateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Get status for styling
  const status = getVitalStatus(vital)

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      {/* Type & Info - Always visible */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          {/* Type badge and status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getTypeColor(vital.type)}`}>
              {label}
            </span>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.className}`}>
                {status.label}
              </span>
            )}
            {/* Backdated indicator */}
            {vital.isBackdated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                <ClockIcon className="h-3 w-3" />
                Backdated
                {vital.daysDifference && vital.daysDifference > 0 && ` ${vital.daysDifference}d`}
              </span>
            )}
          </div>

          {/* Date & Time - Always visible */}
          <div className="text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 inline mr-1" />
            {dateStr} {timeStr}
          </div>

          {/* Logged By - Always visible */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              Logged by{' '}
              {vital.takenBy
                ? getDisplayName
                  ? getDisplayName(vital.takenBy)
                  : vital.takenBy
                : 'Unknown'}
            </span>
          </div>
        </div>
      </td>

      {/* Value - Always visible */}
      <td className="px-3 py-3">
        <span className="font-semibold text-foreground text-sm">{displayValue}</span>
      </td>

      {/* Notes - Hidden on smaller screens */}
      <td className="px-3 py-3 text-sm text-muted-foreground hidden lg:table-cell max-w-[200px]">
        {vital.notes ? (
          <span className="line-clamp-2 text-xs" title={vital.notes}>
            {vital.notes}
          </span>
        ) : (
          <span className="text-muted-foreground/50 italic text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      {canEdit && (
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(vital)}
                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(vital.id, vital.type)}
                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

/**
 * Get color class for vital type badge
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    blood_pressure: 'bg-red-100 text-red-900 border-red-400 font-bold',
    temperature: 'bg-orange-100 text-orange-900 border-orange-400 font-bold',
    pulse_oximeter: 'bg-purple-100 text-purple-900 border-purple-400 font-bold',
    blood_sugar: 'bg-green-100 text-green-900 border-green-400 font-bold',
    weight: 'bg-blue-100 text-blue-900 border-blue-400 font-bold',
    bmi: 'bg-indigo-100 text-indigo-900 border-indigo-400 font-bold'
  }

  return colors[type] || 'bg-gray-100 text-gray-900 border-gray-400 font-bold'
}

/**
 * Get status indicator (reused from DailyVitalsSummary - DRY)
 */
function getVitalStatus(vital: VitalSign): { label: string; className: string } | null {
  if (vital.type === 'blood_pressure' && typeof vital.value === 'object' && 'systolic' in vital.value) {
    const { systolic, diastolic } = vital.value
    if (systolic > 140 || diastolic > 90) {
      return { label: 'High', className: 'bg-red-100 text-red-900 border-red-400 font-bold' }
    }
    if (systolic < 90 || diastolic < 60) {
      return { label: 'Low', className: 'bg-yellow-100 text-yellow-900 border-yellow-400 font-bold' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-900 border-green-400 font-bold' }
  }

  if (vital.type === 'temperature') {
    const temp = vital.value as number
    if (temp > 100.4) {
      return { label: 'Fever', className: 'bg-red-100 text-red-900 border-red-400 font-bold' }
    }
    if (temp < 97) {
      return { label: 'Low', className: 'bg-yellow-100 text-yellow-900 border-yellow-400 font-bold' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-900 border-green-400 font-bold' }
  }

  if (vital.type === 'pulse_oximeter' && typeof vital.value === 'object' && 'spo2' in vital.value) {
    const { spo2 } = vital.value
    if (spo2 < 90) {
      return { label: 'Low', className: 'bg-red-100 text-red-900 border-red-400 font-bold' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-900 border-green-400 font-bold' }
  }

  return null
}
