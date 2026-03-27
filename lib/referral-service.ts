/**
 * Affiliate/Referral Service
 *
 * Server-side logic for code generation, click tracking,
 * conversion recording, and stats aggregation.
 */

import crypto from 'crypto'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import type {
  ReferralSettings,
  UserReferralData,
  ReferralStats,
  MonthlyReferralStats,
  AffiliateRow,
  ReferralConversion,
} from '@/types/referral'

// Reuse charset from invite-code-generator (excludes confusing chars: 0, O, I, 1, L)
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

/**
 * Generate a URL-friendly referral code (no hyphens)
 */
export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length]
  }
  return code
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false
  return code.split('').every(char => CODE_CHARSET.includes(char))
}

/**
 * Normalize referral code (uppercase, strip whitespace)
 */
export function normalizeReferralCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase()
}

/**
 * Get or create a referral code for a user (race-safe via transaction)
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const userRef = adminDb.collection('users').doc(userId)

  return adminDb.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef)
    const existing = userDoc.data()?.referral?.code

    if (existing) return existing

    // Generate unique code — check for collisions
    let code = generateReferralCode()
    let attempts = 0
    while (attempts < 5) {
      const collision = await adminDb
        .collection('users')
        .where('referral.code', '==', code)
        .limit(1)
        .get()
      if (collision.empty) break
      code = generateReferralCode()
      attempts++
    }

    tx.set(userRef, {
      referral: {
        code,
        totalEarningsCents: 0,
        totalClicks: 0,
        totalConversions: 0,
        createdAt: FieldValue.serverTimestamp(),
      }
    }, { merge: true })

    return code
  })
}

/**
 * Look up a referral code and return the owner's userId
 */
export async function lookupReferralCode(code: string): Promise<{ userId: string; code: string } | null> {
  const normalized = normalizeReferralCode(code)
  if (!isValidReferralCode(normalized)) return null

  const snap = await adminDb
    .collection('users')
    .where('referral.code', '==', normalized)
    .limit(1)
    .get()

  if (snap.empty) return null
  return { userId: snap.docs[0].id, code: normalized }
}

/**
 * Track a referral click (deduplicate by IP hash + code within 24hr)
 */
export async function trackClick(
  referralCode: string,
  referrerUserId: string,
  ip: string,
  userAgent?: string
): Promise<boolean> {
  const ipHash = crypto.createHash('sha256').update(ip + referralCode).digest('hex')
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Check for duplicate
  const existing = await adminDb
    .collection('referral_clicks')
    .where('ipHash', '==', ipHash)
    .where('timestamp', '>=', oneDayAgo)
    .limit(1)
    .get()

  if (!existing.empty) return false // Already tracked

  await adminDb.collection('referral_clicks').add({
    referralCode,
    referrerUserId,
    timestamp: FieldValue.serverTimestamp(),
    ipHash,
    userAgent: userAgent || '',
    converted: false,
  })

  // Increment click count on referrer's user doc
  await adminDb.collection('users').doc(referrerUserId).set({
    referral: { totalClicks: FieldValue.increment(1) }
  }, { merge: true })

  return true
}

/**
 * Record a referral conversion (called after signup with a referral code)
 */
export async function recordConversion(
  referralCode: string,
  referrerUserId: string,
  referredUserId: string,
  referredEmail: string
): Promise<void> {
  // Create pending conversion
  await adminDb.collection('referral_conversions').add({
    referralCode,
    referrerUserId,
    referredUserId,
    referredEmail,
    plan: '',
    earningsCents: 0,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  // Update the referred user's doc
  await adminDb.collection('users').doc(referredUserId).set({
    referral: {
      referredBy: referralCode,
      referredByUserId: referrerUserId,
    }
  }, { merge: true })

  // Mark matching click as converted
  const clickSnap = await adminDb
    .collection('referral_clicks')
    .where('referralCode', '==', referralCode)
    .where('converted', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get()

  if (!clickSnap.empty) {
    await clickSnap.docs[0].ref.update({
      converted: true,
      convertedUserId: referredUserId,
      convertedAt: FieldValue.serverTimestamp(),
    })
  }

  logger.info('[Referral] Conversion recorded', {
    referralCode,
    referrerUserId,
    referredUserId,
  })
}

/**
 * Confirm a conversion after Stripe payment succeeds
 */
export async function confirmConversion(
  referredUserId: string,
  plan: string,
  subscriptionPriceCents: number
): Promise<void> {
  // Find the pending conversion for this user
  const snap = await adminDb
    .collection('referral_conversions')
    .where('referredUserId', '==', referredUserId)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (snap.empty) return

  const conversion = snap.docs[0]
  const referrerUserId = conversion.data().referrerUserId

  // Get commission rate from settings
  const settings = await getReferralSettings()
  const commissionPercent = settings.commissionPercent || 10
  const earningsCents = Math.round(subscriptionPriceCents * commissionPercent / 100)

  // Update conversion
  await conversion.ref.update({
    plan,
    earningsCents,
    status: 'confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
  })

  // Credit the referrer
  await adminDb.collection('users').doc(referrerUserId).set({
    referral: {
      totalEarningsCents: FieldValue.increment(earningsCents),
      totalConversions: FieldValue.increment(1),
    }
  }, { merge: true })

  logger.info('[Referral] Conversion confirmed', {
    referredUserId,
    referrerUserId,
    plan,
    earningsCents,
  })
}

// ─── Settings ────────────────────────────────────────

const DEFAULT_SETTINGS: ReferralSettings = {
  commissionPercent: 10,
  discountPercent: 7,
  enabled: true,
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const doc = await adminDb.collection('referral_settings').doc('config').get()
  if (!doc.exists) return DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...doc.data() } as ReferralSettings
}

export async function updateReferralSettings(
  settings: Partial<ReferralSettings>,
  updatedBy: string
): Promise<void> {
  await adminDb.collection('referral_settings').doc('config').set({
    ...settings,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  }, { merge: true })
}

// ─── Stats (Admin) ───────────────────────────────────

/**
 * Get aggregated stats across all affiliates
 */
export async function getAggregatedStats(): Promise<ReferralStats> {
  const [clicksSnap, conversionsSnap] = await Promise.all([
    adminDb.collection('referral_clicks').get(),
    adminDb.collection('referral_conversions').get(),
  ])

  const monthlyMap = new Map<string, MonthlyReferralStats>()

  let totalClicks = 0
  clicksSnap.docs.forEach(doc => {
    totalClicks++
    const ts = doc.data().timestamp?.toDate?.() || new Date()
    const month = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
    const entry = monthlyMap.get(month) || { month, earningsCents: 0, clicks: 0, conversions: 0 }
    entry.clicks++
    monthlyMap.set(month, entry)
  })

  let totalEarningsCents = 0
  let totalConversions = 0
  conversionsSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.status === 'confirmed' || data.status === 'paid') {
      totalConversions++
      totalEarningsCents += data.earningsCents || 0
      const ts = data.createdAt?.toDate?.() || new Date()
      const month = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(month) || { month, earningsCents: 0, clicks: 0, conversions: 0 }
      entry.conversions++
      entry.earningsCents += data.earningsCents || 0
      monthlyMap.set(month, entry)
    }
  })

  const monthly = Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month))

  return { totalEarningsCents, totalClicks, totalConversions, monthly }
}

/**
 * Get all affiliates with their stats (for admin table)
 */
export async function getAllAffiliates(): Promise<AffiliateRow[]> {
  const snap = await adminDb
    .collection('users')
    .where('referral.code', '!=', null)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    const ref = data.referral as UserReferralData
    return {
      userId: doc.id,
      email: data.email || '',
      name: data.name || data.profile?.displayName || '',
      code: ref.code,
      totalClicks: ref.totalClicks || 0,
      totalConversions: ref.totalConversions || 0,
      totalEarningsCents: ref.totalEarningsCents || 0,
      createdAt: ref.createdAt,
    }
  }).sort((a, b) => b.totalEarningsCents - a.totalEarningsCents)
}

/**
 * Get conversions for a specific affiliate or all
 */
export async function getConversions(referrerUserId?: string): Promise<ReferralConversion[]> {
  let query = adminDb.collection('referral_conversions').orderBy('createdAt', 'desc').limit(100)

  if (referrerUserId) {
    query = adminDb
      .collection('referral_conversions')
      .where('referrerUserId', '==', referrerUserId)
      .orderBy('createdAt', 'desc')
      .limit(100) as any
  }

  const snap = await query.get()
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    confirmedAt: doc.data().confirmedAt?.toDate?.(),
    paidAt: doc.data().paidAt?.toDate?.(),
  })) as ReferralConversion[]
}

/**
 * Mark a conversion as paid
 */
export async function markConversionPaid(conversionId: string): Promise<void> {
  await adminDb.collection('referral_conversions').doc(conversionId).update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
  })
}
