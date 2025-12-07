/**
 * RelationshipBadge Component
 *
 * Display relationship with icon and color coding
 */

'use client'

import { FamilyRole } from '@/types/medical'

interface RelationshipBadgeProps {
  role: FamilyRole
  relationship?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const roleConfig: Record<FamilyRole, { label: string; color: string; icon: string }> = {
  account_owner: {
    label: 'Account Owner',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: '👑'
  },
  co_admin: {
    label: 'Co-Admin',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: '⚙️'
  },
  caregiver: {
    label: 'Caregiver',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: '🤝'
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: '👁️'
  }
}

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5'
}

export function RelationshipBadge({
  role,
  relationship,
  size = 'md',
  showIcon = true
}: RelationshipBadgeProps) {
  const config = roleConfig[role]

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeStyles[size]}`}
      >
        {showIcon && <span className="text-xs">{config.icon}</span>}
        <span>{config.label}</span>
      </span>
      {relationship && (
        <span
          className={`inline-flex items-center rounded-full bg-muted text-muted-foreground ${sizeStyles[size]}`}
        >
          {relationship}
        </span>
      )}
    </div>
  )
}
