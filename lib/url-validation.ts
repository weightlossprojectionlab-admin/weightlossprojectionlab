/**
 * URL Validation for SSRF Protection
 *
 * Provides strict URL validation to prevent Server-Side Request Forgery (SSRF) attacks
 * by enforcing domain whitelists and blocking private/local IP addresses.
 *
 * Security measures:
 * - Domain whitelist for allowed external APIs
 * - Private/local IP address blocklist
 * - Protocol restrictions (HTTP/HTTPS only)
 * - DNS resolution to catch IP-based bypasses
 */

import { promises as dns } from 'dns'
import { logger } from '@/lib/logger'

/**
 * Allowed domains for external API requests
 * Only these domains (and their subdomains) can be fetched
 */
const ALLOWED_DOMAINS = [
  'openfoodfacts.org',
  'static.openfoodfacts.org',
  'images.openfoodfacts.org',
  'api.nal.usda.gov',
  'fdc.nal.usda.gov',
]

/**
 * Private and local IP ranges that should be blocked
 * Prevents SSRF attacks against internal infrastructure
 */
const PRIVATE_IP_RANGES = {
  ipv4: [
    { start: '127.0.0.0', end: '127.255.255.255', cidr: '127.0.0.0/8' }, // Loopback
    { start: '10.0.0.0', end: '10.255.255.255', cidr: '10.0.0.0/8' }, // Private
    { start: '172.16.0.0', end: '172.31.255.255', cidr: '172.16.0.0/12' }, // Private
    { start: '192.168.0.0', end: '192.168.255.255', cidr: '192.168.0.0/16' }, // Private
    { start: '169.254.0.0', end: '169.254.255.255', cidr: '169.254.0.0/16' }, // Link-local
    { start: '0.0.0.0', end: '0.255.255.255', cidr: '0.0.0.0/8' }, // Current network
  ],
  ipv6: [
    '::1', // Loopback
    'fc00::/7', // Unique local
    'fe80::/10', // Link-local
    '::ffff:0:0/96', // IPv4-mapped addresses
  ],
}

/**
 * Check if a hostname is in the allowed domains list
 *
 * @param hostname - The hostname to check
 * @returns true if the hostname is allowed, false otherwise
 */
export function isAllowedHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase()

  return ALLOWED_DOMAINS.some(
    (domain) =>
      normalizedHostname === domain ||
      normalizedHostname.endsWith('.' + domain)
  )
}

/**
 * Convert IPv4 address string to numeric value for range comparison
 *
 * @param ip - IPv4 address string (e.g., "192.168.1.1")
 * @returns Numeric representation of the IP
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (
    (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
  ) >>> 0
}

/**
 * Check if an IPv4 address is in a private or local range
 *
 * @param ip - IPv4 address to check
 * @returns true if the IP is private/local, false otherwise
 */
function isPrivateIPv4(ip: string): boolean {
  const ipNum = ipv4ToNumber(ip)

  return PRIVATE_IP_RANGES.ipv4.some((range) => {
    const startNum = ipv4ToNumber(range.start)
    const endNum = ipv4ToNumber(range.end)
    return ipNum >= startNum && ipNum <= endNum
  })
}

/**
 * Check if an IPv6 address is in a private or local range
 *
 * @param ip - IPv6 address to check
 * @returns true if the IP is private/local, false otherwise
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()

  // Check loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return true
  }

  // Check unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true
  }

  // Check link-local (fe80::/10)
  if (normalized.startsWith('fe80:')) {
    return true
  }

  // Check IPv4-mapped addresses (::ffff:0:0/96)
  if (normalized.includes('::ffff:')) {
    return true
  }

  return false
}

/**
 * Check if a hostname resolves to a private or local IP address
 *
 * This function performs DNS resolution to detect SSRF attempts that use
 * domain names pointing to internal IPs (e.g., DNS rebinding attacks).
 *
 * @param hostname - The hostname to resolve and check
 * @returns Promise resolving to true if the IP is private/local, false otherwise
 *
 * Security: Fails closed - returns true (blocked) on DNS errors
 */
export async function isPrivateOrLocalIP(hostname: string): Promise<boolean> {
  try {
    // Check if hostname is already an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i

    if (ipv4Regex.test(hostname)) {
      return isPrivateIPv4(hostname)
    }

    if (ipv6Regex.test(hostname)) {
      return isPrivateIPv6(hostname)
    }

    // Resolve hostname to IP addresses
    const addresses: string[] = []

    try {
      // Try IPv4 first
      const ipv4Addrs = await dns.resolve4(hostname)
      addresses.push(...ipv4Addrs)
    } catch (ipv4Error) {
      // IPv4 resolution failed, might be IPv6-only
      logger.debug('IPv4 resolution failed for hostname', { hostname, error: ipv4Error })
    }

    try {
      // Try IPv6
      const ipv6Addrs = await dns.resolve6(hostname)
      addresses.push(...ipv6Addrs)
    } catch (ipv6Error) {
      // IPv6 resolution failed
      logger.debug('IPv6 resolution failed for hostname', { hostname, error: ipv6Error })
    }

    // If no addresses resolved, fail closed (block)
    if (addresses.length === 0) {
      logger.warn('DNS resolution failed for hostname, blocking as precaution', {
        hostname,
      })
      return true
    }

    // Check if any resolved address is private/local
    for (const addr of addresses) {
      if (ipv4Regex.test(addr) && isPrivateIPv4(addr)) {
        logger.warn('Hostname resolves to private IPv4 address', {
          hostname,
          address: addr,
        })
        return true
      }

      if (ipv6Regex.test(addr) && isPrivateIPv6(addr)) {
        logger.warn('Hostname resolves to private IPv6 address', {
          hostname,
          address: addr,
        })
        return true
      }
    }

    return false
  } catch (error) {
    // Fail closed: on any error, treat as blocked
    logger.error('Error checking IP address, failing closed', error as Error, {
      hostname,
    })
    return true
  }
}

/**
 * Validate a URL for SSRF protection
 *
 * Performs comprehensive validation:
 * 1. URL format validation
 * 2. Protocol restriction (HTTP/HTTPS only)
 * 3. Domain whitelist check
 * 4. Private/local IP blocklist check
 *
 * @param url - The URL to validate
 * @throws Error with descriptive message if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   await validateFetchURL('https://static.openfoodfacts.org/images/products/123.jpg')
 * } catch (error) {
 *   // Handle validation error
 * }
 * ```
 */
export async function validateFetchURL(url: string): Promise<void> {
  // Check for empty or non-string input
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string')
  }

  // Parse URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Validate protocol
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed')
  }

  // Validate hostname against whitelist
  if (!isAllowedHostname(parsedUrl.hostname)) {
    throw new Error(
      `Hostname "${parsedUrl.hostname}" is not in the allowed domains list`
    )
  }

  // Check for private/local IPs
  const isPrivate = await isPrivateOrLocalIP(parsedUrl.hostname)
  if (isPrivate) {
    throw new Error(
      `Hostname "${parsedUrl.hostname}" resolves to a private or local IP address`
    )
  }
}
