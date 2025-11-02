'use client'

/**
 * Location Service for Store Detection
 *
 * Handles:
 * - Geolocation permission requests
 * - Detecting nearby grocery stores
 * - Geofencing (knowing when user is at a store)
 * - Store chain identification
 */

import type { StoreLocation, GeofenceConfig } from '@/types/shopping'
import { logger } from '@/lib/logger'

const DEFAULT_GEOFENCE_RADIUS_METERS = 100 // 100 meters = ~328 feet

/**
 * Common grocery store chains for detection
 */
const GROCERY_CHAINS = [
  'Walmart',
  'Target',
  'Kroger',
  'Safeway',
  'Albertsons',
  'Publix',
  'Whole Foods',
  'Trader Joe\'s',
  'Costco',
  'Sam\'s Club',
  'Aldi',
  'Lidl',
  'Food Lion',
  'Stop & Shop',
  'Giant',
  'H-E-B',
  'Wegmans',
  'Meijer',
  'Fred Meyer',
  'Ralphs',
  'Smith\'s',
  'King Soopers',
  'Fry\'s',
  'QFC',
  'Harris Teeter',
  'Sprouts'
]

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator
}

/**
 * Request location permission from user
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (!isGeolocationSupported()) {
    throw new Error('Geolocation is not supported by this browser')
  }

  try {
    // Try to check permission status
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      return result.state
    }

    // Fallback: Just try to get location
    await getCurrentPosition()
    return 'granted'
  } catch (error) {
    return 'denied'
  }
}

/**
 * Get current position
 */
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      }
    )
  })
}

/**
 * Get current coordinates
 */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  const position = await getCurrentPosition()
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180
  const φ2 = (coord2.latitude * Math.PI) / 180
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if user is within geofence radius of a location
 */
export function isWithinGeofence(
  userLocation: { latitude: number; longitude: number },
  targetLocation: { latitude: number; longitude: number },
  radiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): boolean {
  const distance = calculateDistance(userLocation, targetLocation)
  return distance <= radiusMeters
}

/**
 * Find nearby stores using stored locations
 * In production, this could use Google Places API or similar
 */
export async function findNearbyStores(
  userLocation: { latitude: number; longitude: number },
  radiusMeters: number = 2000, // 2km
  storedStoreLocations: StoreLocation[] = []
): Promise<StoreLocation[]> {
  // Filter stored locations by distance
  const nearbyStores = storedStoreLocations
    .map(store => ({
      ...store,
      distanceMeters: calculateDistance(userLocation, {
        latitude: store.latitude,
        longitude: store.longitude
      })
    }))
    .filter(store => store.distanceMeters && store.distanceMeters <= radiusMeters)
    .sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0))

  return nearbyStores
}

/**
 * Detect if user is currently at a grocery store
 */
export async function detectCurrentStore(
  storedStoreLocations: StoreLocation[],
  geofenceRadiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): Promise<StoreLocation | null> {
  try {
    const userLocation = await getCurrentCoordinates()

    // Check if user is within geofence of any known store
    for (const store of storedStoreLocations) {
      if (isWithinGeofence(
        userLocation,
        { latitude: store.latitude, longitude: store.longitude },
        geofenceRadiusMeters
      )) {
        return {
          ...store,
          distanceMeters: calculateDistance(userLocation, {
            latitude: store.latitude,
            longitude: store.longitude
          })
        }
      }
    }

    return null
  } catch (error) {
    logger.error('Error detecting current store', error as Error)
    return null
  }
}

/**
 * Check if store name matches a known grocery chain
 */
export function identifyGroceryChain(storeName: string): string | null {
  const lowerName = storeName.toLowerCase()

  for (const chain of GROCERY_CHAINS) {
    if (lowerName.includes(chain.toLowerCase())) {
      return chain
    }
  }

  return null
}

/**
 * Watch user location for store detection
 * Returns a watch ID that can be used to clear the watch
 */
export function watchLocationForStores(
  storedStoreLocations: StoreLocation[],
  onStoreDetected: (store: StoreLocation) => void,
  onStoreLeft: () => void,
  geofenceRadiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): number | null {
  if (!isGeolocationSupported()) return null

  let currentStore: StoreLocation | null = null

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }

      // Check if at any store
      let foundStore: StoreLocation | null = null
      for (const store of storedStoreLocations) {
        if (isWithinGeofence(
          userLocation,
          { latitude: store.latitude, longitude: store.longitude },
          geofenceRadiusMeters
        )) {
          foundStore = {
            ...store,
            distanceMeters: calculateDistance(userLocation, {
              latitude: store.latitude,
              longitude: store.longitude
            })
          }
          break
        }
      }

      // Trigger callbacks based on state changes
      if (foundStore && !currentStore) {
        // Entered a store
        currentStore = foundStore
        onStoreDetected(foundStore)
      } else if (!foundStore && currentStore) {
        // Left a store
        currentStore = null
        onStoreLeft()
      } else if (foundStore && currentStore && foundStore.name !== currentStore.name) {
        // Moved to a different store
        currentStore = foundStore
        onStoreDetected(foundStore)
      }
    },
    (error) => {
      logger.error('Location watch error', new Error(`Geolocation error: ${error.message}`))
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    }
  )

  return watchId
}

/**
 * Stop watching location
 */
export function stopWatchingLocation(watchId: number): void {
  if (isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`
  } else {
    const km = (meters / 1000).toFixed(1)
    return `${km}km away`
  }
}

/**
 * Save store location for future reference
 */
export function saveStoreLocation(
  storeName: string,
  location: { latitude: number; longitude: number }
): StoreLocation {
  const chain = identifyGroceryChain(storeName)

  return {
    name: storeName,
    chain: chain || undefined,
    latitude: location.latitude,
    longitude: location.longitude
  }
}

/**
 * Get geofence config from localStorage
 */
export function getGeofenceConfig(): GeofenceConfig {
  if (typeof window === 'undefined') {
    return {
      enabled: true,
      radiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
      notificationsEnabled: true,
      autoShowList: true
    }
  }

  const stored = localStorage.getItem('geofence_config')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Fall through to default
    }
  }

  return {
    enabled: true,
    radiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    notificationsEnabled: true,
    autoShowList: true
  }
}

/**
 * Save geofence config to localStorage
 */
export function saveGeofenceConfig(config: GeofenceConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('geofence_config', JSON.stringify(config))
  }
}

/**
 * Request notification permission (for store alerts)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

/**
 * Show store detection notification
 */
export function showStoreNotification(
  storeName: string,
  itemCount: number
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const notification = new Notification(`📍 You're at ${storeName}`, {
    body: `You have ${itemCount} item${itemCount !== 1 ? 's' : ''} on your shopping list`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'store-detection',
    requireInteraction: false
  })

  // Auto-close after 10 seconds
  setTimeout(() => notification.close(), 10000)
}
