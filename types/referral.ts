/**
 * Affiliate/Referral Program Types
 */

export interface ReferralClick {
  id: string
  referralCode: string
  referrerUserId: string
  timestamp: Date
  ipHash: string // SHA-256 hash for dedup
  userAgent?: string
  converted: boolean
  convertedUserId?: string
  convertedAt?: Date
}

export interface ReferralConversion {
  id: string
  referralCode: string
  referrerUserId: string
  referredUserId: string
  referredEmail?: string
  plan: string
  earningsCents: number
  status: 'pending' | 'confirmed' | 'paid'
  createdAt: Date
  confirmedAt?: Date
  paidAt?: Date
}

export interface ReferralSettings {
  commissionPercent: number // e.g. 10
  discountPercent: number   // e.g. 7
  enabled: boolean
  stripeCouponId?: string
  updatedAt?: Date
  updatedBy?: string
}

export interface UserReferralData {
  code: string
  referredBy?: string
  referredByUserId?: string
  totalEarningsCents: number
  totalClicks: number
  totalConversions: number
  createdAt?: Date
}

export interface MonthlyReferralStats {
  month: string // "2026-03"
  earningsCents: number
  clicks: number
  conversions: number
}

export interface ReferralStats {
  totalEarningsCents: number
  totalClicks: number
  totalConversions: number
  monthly: MonthlyReferralStats[]
}

export interface AffiliateRow {
  userId: string
  email: string
  name?: string
  code: string
  totalClicks: number
  totalConversions: number
  totalEarningsCents: number
  createdAt?: Date
}
