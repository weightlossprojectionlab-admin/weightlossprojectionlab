'use client'

/**
 * Family Member Badge
 *
 * Displays which family member(s) requested or added a shopping item
 * - Shows requestedBy with purple badge and multi-user icon
 * - Shows addedBy with blue badge and single user icon
 * - Only displays for family plans (when multiple members exist)
 *
 * DRY Component: Reused across shopping components
 */

import { UserGroupIcon, UserIcon } from '@heroicons/react/24/outline'

interface FamilyMemberBadgeProps {
  requestedBy?: string[]
  addedBy?: string[]
  getMemberName?: (userId?: string) => string
  showForSingleUser?: boolean // If false, hide badge when only one user
}

export function FamilyMemberBadge({
  requestedBy,
  addedBy,
  getMemberName,
  showForSingleUser = false
}: FamilyMemberBadgeProps) {
  // Don't render if no getMemberName function provided
  if (!getMemberName) return null

  // Show requestedBy if available
  if (requestedBy && requestedBy.length > 0) {
    const memberNames = requestedBy
      .map(id => getMemberName(id))
      .filter(Boolean)

    // Don't show badge for single user unless explicitly requested
    if (!showForSingleUser && memberNames.length === 1 && memberNames[0] === 'You') {
      return null
    }

    if (memberNames.length === 0) return null

    return (
      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded flex items-center gap-1">
        <UserGroupIcon className="w-3 h-3" />
        <span>{memberNames.join(', ')}</span>
      </span>
    )
  }

  // Fallback to addedBy if requestedBy not available
  if (addedBy && addedBy.length > 0) {
    const memberNames = addedBy
      .map(id => getMemberName(id))
      .filter(Boolean)

    // Don't show badge for single user unless explicitly requested
    if (!showForSingleUser && memberNames.length === 1 && memberNames[0] === 'You') {
      return null
    }

    if (memberNames.length === 0) return null

    return (
      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
        <UserIcon className="w-3 h-3" />
        <span>{memberNames.join(', ')}</span>
      </span>
    )
  }

  return null
}
