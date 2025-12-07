'use client'

import React, { useEffect, useRef } from 'react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { useGooglePlaces } from '@/hooks/useGooglePlaces'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelected?: (place: {
    address: string
    city: string
    state: string
    zipCode: string
    coordinates?: { lat: number; lng: number }
  }) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

/**
 * AddressAutocomplete - Google Places autocomplete input
 *
 * Smart-context: Only loads Google Places API when component mounts.
 * Auto-fills address, city, state, zip when user selects a place.
 *
 * DRY principle: Reusable autocomplete for all address inputs
 *
 * @example
 * ```tsx
 * <AddressAutocomplete
 *   value={address}
 *   onChange={setAddress}
 *   onPlaceSelected={(place) => {
 *     setCity(place.city)
 *     setState(place.state)
 *     setZipCode(place.zipCode)
 *     setCoordinates(place.coordinates)
 *   }}
 * />
 * ```
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Start typing an address...',
  label = 'Address',
  required = false,
  className = ''
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { isLoaded, error, initializeAutocomplete } = useGooglePlaces()

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !onPlaceSelected) return

    const cleanup = initializeAutocomplete(inputRef.current, (place) => {
      // Update address field
      onChange(place.address)

      // Notify parent of full place details
      onPlaceSelected({
        address: place.address,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode,
        coordinates: place.coordinates
      })
    })

    return cleanup
  }, [isLoaded, initializeAutocomplete, onChange, onPlaceSelected])

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          <MapPinIcon className="w-4 h-4 inline mr-1" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {isLoaded && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              Autocomplete active
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
          Address autocomplete unavailable. You can still enter the address manually.
        </p>
      )}

      <p className="text-xs text-muted-foreground mt-1">
        {isLoaded
          ? 'Start typing and select from suggestions for auto-fill'
          : 'Loading address suggestions...'}
      </p>
    </div>
  )
}
