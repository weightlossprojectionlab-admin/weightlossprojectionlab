/**
 * Google Places Hook
 *
 * Smart-context hook for Google Places API integration.
 * Only loads the API when actually needed (lazy loading).
 *
 * Features:
 * - Address autocomplete
 * - Place details extraction
 * - Coordinate geocoding
 *
 * DRY principle: Single source for all Google Places functionality
 */

import { useEffect, useState, useCallback, useRef } from 'react'

// Google Maps types (declare globally if @types/google.maps not installed)
declare global {
  interface Window {
    google: any
  }
  namespace google {
    namespace maps {
      namespace places {
        interface PlaceResult {
          address_components?: any[]
          geometry?: {
            location: {
              lat(): number
              lng(): number
            }
          }
          formatted_address?: string
        }
        class AutocompleteService {
          constructor()
          getPlacePredictions(request: any, callback: any): void
        }
        class PlacesService {
          constructor(el: HTMLDivElement)
          getDetails(request: any, callback: any): void
        }
      }
      interface GeocoderAddressComponent {
        long_name: string
        short_name: string
        types: string[]
      }
    }
  }
}

// Note: Add your Google API key to .env.local
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

interface PlaceResult {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates?: {
    lat: number
    lng: number
  }
  formattedAddress: string
}

interface UseGooglePlacesReturn {
  isLoaded: boolean
  error: string | null
  initializeAutocomplete: (
    inputElement: HTMLInputElement,
    onPlaceSelected: (place: PlaceResult) => void
  ) => () => void
}

/**
 * Custom hook for Google Places integration with lazy loading
 *
 * @example
 * ```tsx
 * const { isLoaded, initializeAutocomplete } = useGooglePlaces()
 *
 * useEffect(() => {
 *   if (!isLoaded || !inputRef.current) return
 *
 *   const cleanup = initializeAutocomplete(inputRef.current, (place) => {
 *     setAddress(place.address)
 *     setCity(place.city)
 *     setState(place.state)
 *     setZipCode(place.zipCode)
 *   })
 *
 *   return cleanup
 * }, [isLoaded])
 * ```
 */
export function useGooglePlaces(): UseGooglePlacesReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Don't load if no API key
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured')
      return
    }

    // Don't load if already loaded
    if (scriptLoadedRef.current) {
      setIsLoaded(true)
      return
    }

    // Check if already loaded by another component
    if (window.google?.maps?.places) {
      scriptLoadedRef.current = true
      setIsLoaded(true)
      return
    }

    // Lazy load the Google Places API script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      scriptLoadedRef.current = true
      setIsLoaded(true)
    }

    script.onerror = () => {
      setError('Failed to load Google Maps API')
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup if component unmounts during loading
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const initializeAutocomplete = useCallback(
    (
      inputElement: HTMLInputElement,
      onPlaceSelected: (place: PlaceResult) => void
    ) => {
      if (!isLoaded || !window.google?.maps?.places) {
        console.warn('Google Places API not loaded yet')
        return () => {}
      }

      // Initialize autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
        fields: ['address_components', 'formatted_address', 'geometry']
      })

      // Listen for place selection
      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()

        if (!place.address_components) {
          console.warn('No address components found')
          return
        }

        // Extract address components
        const result = extractPlaceDetails(place)
        onPlaceSelected(result)
      })

      // Cleanup function
      return () => {
        if (listener && window.google?.maps) {
          window.google.maps.event.removeListener(listener)
        }
      }
    },
    [isLoaded]
  )

  return {
    isLoaded,
    error,
    initializeAutocomplete
  }
}

/**
 * Extract structured address data from Google Place result
 */
function extractPlaceDetails(place: google.maps.places.PlaceResult): PlaceResult {
  const components = place.address_components || []

  const getComponent = (type: string): string => {
    const component = components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))
    return component?.long_name || ''
  }

  const getShortComponent = (type: string): string => {
    const component = components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))
    return component?.short_name || ''
  }

  // Extract street number and route for full address
  const streetNumber = getComponent('street_number')
  const route = getComponent('route')
  const address = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber || ''

  return {
    address,
    city: getComponent('locality') || getComponent('sublocality') || '',
    state: getShortComponent('administrative_area_level_1'),
    zipCode: getComponent('postal_code'),
    country: getShortComponent('country'),
    coordinates: place.geometry?.location
      ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      : undefined,
    formattedAddress: place.formatted_address || ''
  }
}

/**
 * Generate Google Maps directions URL (no API call needed - just a deep link)
 *
 * @example
 * ```tsx
 * const url = getDirectionsUrl({
 *   destination: '123 Medical Plaza, Springfield, IL 62701',
 *   mode: 'driving'
 * })
 * window.open(url, '_blank')
 * ```
 */
export function getDirectionsUrl({
  destination,
  origin,
  mode = 'driving'
}: {
  destination: string
  origin?: string
  mode?: 'driving' | 'walking' | 'transit' | 'bicycling'
}): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    ...(origin && { origin }),
    travelmode: mode
  })

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Generate static map image URL for display
 * Smart-context: Only generates URL when needed, no API call until image is loaded
 *
 * @example
 * ```tsx
 * const mapUrl = getStaticMapUrl({
 *   address: '123 Medical Plaza, Springfield, IL 62701',
 *   width: 600,
 *   height: 400
 * })
 * <img src={mapUrl} alt="Location map" loading="lazy" />
 * ```
 */
export function getStaticMapUrl({
  address,
  coordinates,
  width = 600,
  height = 400,
  zoom = 15
}: {
  address?: string
  coordinates?: { lat: number; lng: number }
  width?: number
  height?: number
  zoom?: number
}): string {
  if (!GOOGLE_MAPS_API_KEY) {
    return ''
  }

  const center = coordinates
    ? `${coordinates.lat},${coordinates.lng}`
    : encodeURIComponent(address || '')

  const marker = coordinates
    ? `${coordinates.lat},${coordinates.lng}`
    : encodeURIComponent(address || '')

  return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${marker}&key=${GOOGLE_MAPS_API_KEY}`
}

