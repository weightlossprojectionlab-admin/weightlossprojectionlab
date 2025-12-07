/**
 * CaregiverCard Component
 *
 * Compact card showing key caregiver information
 * Used in directory listing with hover effects and quick actions
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { RelationshipBadge } from './RelationshipBadge'
import { ContactButtons } from './ContactButtons'
import type { CaregiverCardData } from '@/types/caregiver'

interface CaregiverCardProps {
  caregiver: CaregiverCardData
  onClick?: () => void
  showQuickActions?: boolean
}

const statusConfig = {
  available: {
    color: 'bg-green-500',
    label: 'Available',
    ring: 'ring-green-500/20'
  },
  busy: {
    color: 'bg-yellow-500',
    label: 'Busy',
    ring: 'ring-yellow-500/20'
  },
  away: {
    color: 'bg-orange-500',
    label: 'Away',
    ring: 'ring-orange-500/20'
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
    ring: 'ring-gray-400/20'
  }
}

export function CaregiverCard({
  caregiver,
  onClick,
  showQuickActions = true
}: CaregiverCardProps) {
  const statusInfo = statusConfig[caregiver.availabilityStatus]

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return 'Never'
    const date = new Date(lastActive)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 5) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Link href={`/family/${caregiver.id}`}>
      <div
        className="bg-card border-2 border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group"
        onClick={onClick}
      >
        {/* Header with Photo and Status */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted">
              {caregiver.photo ? (
                <Image
                  src={caregiver.photo}
                  alt={caregiver.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {caregiver.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Availability Status Indicator */}
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${statusInfo.color} ${statusInfo.ring} ring-2`}
              title={statusInfo.label}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {caregiver.name}
            </h3>
            {caregiver.professionalTitle && (
              <p className="text-sm text-muted-foreground truncate">
                {caregiver.professionalTitle}
              </p>
            )}
            <div className="mt-1">
              <RelationshipBadge
                role={caregiver.role}
                relationship={caregiver.relationship}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Patient Access */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Patient Access:</div>
          <div className="flex flex-wrap gap-1">
            {caregiver.patientNames.length > 0 ? (
              caregiver.patientNames.slice(0, 3).map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                >
                  {name}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No patients assigned</span>
            )}
            {caregiver.patientNames.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                +{caregiver.patientNames.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Last Active */}
        <div className="text-xs text-muted-foreground mb-4">
          Last active: {formatLastActive(caregiver.lastActive)}
        </div>

        {/* Quick Actions */}
        {showQuickActions && (
          <div
            className="pt-4 border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <ContactButtons
              email={caregiver.email}
              phone={caregiver.phone}
              name={caregiver.name}
              size="sm"
              showLabels={false}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

/**
 * CaregiverCardSkeleton - Loading state for CaregiverCard
 */
export function CaregiverCardSkeleton() {
  return (
    <div className="bg-card border-2 border-border rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="h-5 bg-muted rounded w-32 mb-2" />
          <div className="h-4 bg-muted rounded w-24 mb-2" />
          <div className="h-6 bg-muted rounded w-28" />
        </div>
      </div>
      <div className="mb-4">
        <div className="h-3 bg-muted rounded w-24 mb-2" />
        <div className="flex gap-2">
          <div className="h-6 bg-muted rounded w-16" />
          <div className="h-6 bg-muted rounded w-16" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-28 mb-4" />
      <div className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  )
}
