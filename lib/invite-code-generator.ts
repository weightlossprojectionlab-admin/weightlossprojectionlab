/**
 * Invite Code Generator
 *
 * Generates secure, unique 8-character invite codes for family invitations
 * Uses crypto.randomBytes for cryptographic security
 */

import crypto from 'crypto'

// Character set for invite codes (uppercase letters and numbers, excluding confusing chars)
// Excludes: 0, O, I, 1, L to prevent confusion
const INVITE_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Generate a secure 8-character invite code
 * Format: XXXX-XXXX (e.g., "AB3K-9MN2")
 */
export function generateInviteCode(): string {
  const length = 8
  const bytes = crypto.randomBytes(length)

  let code = ''
  for (let i = 0; i < length; i++) {
    const index = bytes[i] % INVITE_CODE_CHARSET.length
    code += INVITE_CODE_CHARSET[index]
  }

  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`
}

/**
 * Validate invite code format
 */
export function isValidInviteCodeFormat(code: string): boolean {
  // Should be 9 characters: XXXX-XXXX
  if (code.length !== 9) return false

  // Should have hyphen in the middle
  if (code[4] !== '-') return false

  // All characters except hyphen should be in charset
  const cleanCode = code.replace('-', '')
  return cleanCode.split('').every(char => INVITE_CODE_CHARSET.includes(char))
}

/**
 * Normalize invite code (uppercase, remove spaces)
 */
export function normalizeInviteCode(code: string): string {
  // Remove spaces and convert to uppercase
  let normalized = code.replace(/\s/g, '').toUpperCase()

  // Add hyphen if missing
  if (normalized.length === 8 && !normalized.includes('-')) {
    normalized = `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`
  }

  return normalized
}
