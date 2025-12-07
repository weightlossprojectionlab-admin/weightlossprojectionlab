'use client'

import React, { useState } from 'react'
import { MapPinIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { getStaticMapUrl, getDirectionsUrl } from '@/hooks/useGooglePlaces'

interface LocationMapProps {
  address: string
  coordinates?: {
    lat: number
    lng: number
  }
  title?: string
  showDirections?: boolean
}

/**
 * LocationMap - Smart-context map component
 *
 * Only loads map image when "View Map" is clicked (lazy loading).
 * Saves API calls and improves performance.
 *
 * DRY principle: Reusable map component for any location display
 */
export default function LocationMap({
  address,
  coordinates,
  title,
  showDirections = true
}: LocationMapProps) {
  const [showMap, setShowMap] = useState(false)

  const handleGetDirections = () => {
    const url = getDirectionsUrl({
      destination: address,
      mode: 'driving'
    })
    window.open(url, '_blank')
  }

  const mapUrl = showMap
    ? getStaticMapUrl({
        address,
        coordinates,
        width: 600,
        height: 400,
        zoom: 15
      })
    : ''

  return (
    <div className="space-y-3">
      {/* Address Display */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-border">
        <MapPinIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{title}</div>}
          <div className="text-sm text-foreground whitespace-pre-line">{address}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!showMap ? (
          <button
            onClick={() => setShowMap(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <MapPinIcon className="h-4 w-4" />
            View Map
          </button>
        ) : (
          <button
            onClick={() => setShowMap(false)}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Hide Map
          </button>
        )}

        {showDirections && (
          <button
            onClick={handleGetDirections}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Get Directions
          </button>
        )}
      </div>

      {/* Smart-context map image - only loads when showMap is true */}
      {showMap && mapUrl && (
        <div className="rounded-lg overflow-hidden border border-border">
          <img
            src={mapUrl}
            alt="Location map"
            loading="lazy"
            className="w-full h-auto"
            onError={(e) => {
              // Handle map load error
              e.currentTarget.style.display = 'none'
              console.error('Failed to load map image')
            }}
          />
        </div>
      )}

      {showMap && !mapUrl && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.
        </div>
      )}
    </div>
  )
}
