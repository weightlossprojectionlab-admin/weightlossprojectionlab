/**
 * Provider Card Component
 *
 * Displays provider information with contact details and actions
 */

'use client'

import type { Provider } from '@/types/medical'
import { MapPinIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface ProviderCardProps {
  provider: Provider
  onEdit?: (provider: Provider) => void
  onDelete?: (provider: Provider) => void
  onView?: (provider: Provider) => void
  showActions?: boolean
  compact?: boolean
}

export function ProviderCard({
  provider,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  compact = false
}: ProviderCardProps) {
  const getProviderTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      physician: 'bg-blue-100 text-blue-700',
      specialist: 'bg-primary-light text-primary-dark dark:bg-purple-900/20 dark:text-purple-400',
      dentist: 'bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400',
      veterinarian: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
      pharmacy: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      lab: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
      imaging_center: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
      urgent_care: 'bg-red-100 text-error-dark dark:bg-red-900/20',
      hospital: 'bg-muted text-foreground dark:text-muted-foreground',
      therapy: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
      other: 'bg-muted text-foreground dark:text-muted-foreground'
    }
    return colors[type] || colors.other
  }

  const formatProviderType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="bg-card rounded-lg border-2 border-border p-6 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground text-lg">
              {provider.name}
            </h3>
            {provider.isPrimary && (
              <span className="px-2 py-1 bg-primary-light dark:bg-purple-900/20 text-primary-dark dark:text-purple-400 rounded text-xs font-medium">
                Primary
              </span>
            )}
          </div>
          {provider.organization && (
            <p className="text-sm text-muted-foreground mb-1">
              {provider.organization}
            </p>
          )}
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getProviderTypeColor(provider.type)}`}>
            {formatProviderType(provider.type)}
          </span>
        </div>
      </div>

      {/* Specialty */}
      {provider.specialty && (
        <div className="mb-4">
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">Specialty: </span>
          <span className="text-sm text-foreground font-medium">
            {provider.specialty}
          </span>
        </div>
      )}

      {!compact && (
        <>
          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2 text-sm">
              <MapPinIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-foreground">{provider.address}</p>
                <p className="text-muted-foreground">
                  {provider.city}, {provider.state} {provider.zipCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon className="w-4 h-4 text-muted-foreground" />
              <a
                href={`tel:${provider.phone}`}
                className="text-primary dark:text-purple-400 hover:underline"
              >
                {provider.phone}
              </a>
            </div>

            {provider.email && (
              <div className="flex items-center gap-2 text-sm">
                <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
                <a
                  href={`mailto:${provider.email}`}
                  className="text-primary dark:text-purple-400 hover:underline"
                >
                  {provider.email}
                </a>
              </div>
            )}

            {provider.website && (
              <div className="flex items-center gap-2 text-sm">
                <GlobeAltIcon className="w-4 h-4 text-muted-foreground" />
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary dark:text-purple-400 hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            {provider.wheelchairAccessible && (
              <span className="px-2 py-1 bg-success-light dark:bg-green-900/20 text-success-dark dark:text-green-400 rounded text-xs">
                ♿ Wheelchair Accessible
              </span>
            )}
            {provider.parkingAvailable && (
              <span className="px-2 py-1 bg-secondary-light text-blue-700 rounded text-xs">
                🅿️ Parking Available
              </span>
            )}
            {provider.averageWaitTime !== undefined && (
              <span className="px-2 py-1 bg-muted text-foreground dark:text-muted-foreground rounded text-xs">
                ⏱️ Avg wait: {provider.averageWaitTime} min
              </span>
            )}
          </div>

          {/* Patients Served Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            Serving {provider.patientsServed.length} patient{provider.patientsServed.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          {onView && (
            <button
              onClick={() => onView(provider)}
              className="flex-1 px-3 py-2 text-sm bg-primary-light text-primary-dark rounded-lg hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors"
            >
              View Details
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(provider)}
              className="px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(provider)}
              className="px-3 py-2 text-sm text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
