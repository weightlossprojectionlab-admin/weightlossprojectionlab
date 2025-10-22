/**
 * Inactive User Detection - Churn Prevention & Re-engagement
 *
 * Identifies users who haven't logged in for 7+ days and triggers
 * personalized re-engagement campaigns via email.
 *
 * Phase 3 Backend Agent - v1.6.4
 */

import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore'
import { analyzeUserReadiness, getLatestAnalysis } from './readiness-analyzer'

// ============================================================================
// Types
// ============================================================================

export type InactivityLevel = 'mild' | 'moderate' | 'severe' | 'critical'
export type CampaignType = 'gentle-reminder' | 'motivational' | 'incentive' | 'last-chance'

export interface InactiveUser {
  userId: string
  email: string
  name: string
  lastActivityDate: Date
  daysInactive: number
  inactivityLevel: InactivityLevel
  churnProbability: number
  lastEngagementScore: number
  previousStreak: number
  totalMealsLogged: number
}

export interface ReEngagementCampaign {
  userId: string
  campaignType: CampaignType
  inactivityLevel: InactivityLevel
  daysInactive: number
  emailSubject: string
  emailBody: string
  incentiveOffered: string | null
  scheduledAt: Date
  sentAt: Date | null
  opened: boolean
  clicked: boolean
  resulted_in_return: boolean
}

export interface InactivityAnalysis {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  breakdown: {
    mild: number       // 3-6 days
    moderate: number   // 7-13 days
    severe: number     // 14-29 days
    critical: number   // 30+ days
  }
  averageInactiveDays: number
  churnRisk: {
    low: number        // <30% churn probability
    medium: number     // 30-69% churn probability
    high: number       // 70%+ churn probability
  }
  campaignsNeeded: number
  analyzedAt: Date
}

// ============================================================================
// Configuration
// ============================================================================

const INACTIVITY_THRESHOLDS = {
  mild: 3,        // 3-6 days - gentle reminder
  moderate: 7,    // 7-13 days - motivational message
  severe: 14,     // 14-29 days - offer incentive
  critical: 30    // 30+ days - last chance campaign
}

const CAMPAIGN_COOLDOWN_DAYS = 3  // Wait 3 days between campaigns to same user

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detect all inactive users across the platform
 */
export async function detectInactiveUsers(): Promise<InactiveUser[]> {
  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    const inactiveUsers: InactiveUser[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id

      // Get last activity from meals (primary indicator)
      const lastActivity = await getLastActivityDate(userId)

      if (!lastActivity) {
        // User has never logged a meal - skip for now
        continue
      }

      const daysInactive = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only consider users inactive for 3+ days
      if (daysInactive >= INACTIVITY_THRESHOLDS.mild) {
        // Get engagement score and churn probability
        let engagementScore = 0
        let churnProbability = 0

        const latestAnalysis = await getLatestAnalysis(userId)
        if (latestAnalysis) {
          engagementScore = latestAnalysis.engagementScore.overallScore
          churnProbability = latestAnalysis.churnProbability
        } else {
          // No analysis yet - run one
          const analysis = await analyzeUserReadiness(userId)
          engagementScore = analysis.engagementScore.overallScore
          churnProbability = analysis.churnProbability
        }

        inactiveUsers.push({
          userId,
          email: userData.profile?.email || '',
          name: userData.profile?.name || 'User',
          lastActivityDate: lastActivity,
          daysInactive,
          inactivityLevel: determineInactivityLevel(daysInactive),
          churnProbability,
          lastEngagementScore: engagementScore,
          previousStreak: userData.profile?.currentStreak || 0,
          totalMealsLogged: await getTotalMealsLogged(userId)
        })
      }
    }

    return inactiveUsers
  } catch (error) {
    console.error('Error detecting inactive users:', error)
    throw error
  }
}

/**
 * Get last activity date for a user (from meal logs)
 */
async function getLastActivityDate(userId: string): Promise<Date | null> {
  try {
    const mealsRef = collection(db, 'meals')
    const q = query(
      mealsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return snapshot.docs[0].data().timestamp.toDate()
  } catch (error) {
    console.error('Error getting last activity date:', error)
    return null
  }
}

/**
 * Get total meals logged by a user
 */
async function getTotalMealsLogged(userId: string): Promise<number> {
  try {
    const mealsRef = collection(db, 'meals')
    const q = query(mealsRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)

    return snapshot.size
  } catch (error) {
    console.error('Error getting total meals logged:', error)
    return 0
  }
}

/**
 * Determine inactivity level based on days inactive
 */
function determineInactivityLevel(daysInactive: number): InactivityLevel {
  if (daysInactive >= INACTIVITY_THRESHOLDS.critical) return 'critical'
  if (daysInactive >= INACTIVITY_THRESHOLDS.severe) return 'severe'
  if (daysInactive >= INACTIVITY_THRESHOLDS.moderate) return 'moderate'
  return 'mild'
}

// ============================================================================
// Campaign Generation
// ============================================================================

/**
 * Generate re-engagement campaigns for inactive users
 */
export async function generateCampaigns(inactiveUsers: InactiveUser[]): Promise<ReEngagementCampaign[]> {
  const campaigns: ReEngagementCampaign[] = []

  for (const user of inactiveUsers) {
    // Check if user already received a campaign recently
    const recentCampaign = await getRecentCampaign(user.userId)

    if (recentCampaign) {
      const daysSinceCampaign = Math.floor(
        (Date.now() - recentCampaign.scheduledAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysSinceCampaign < CAMPAIGN_COOLDOWN_DAYS) {
        console.log(`Skipping user ${user.userId} - campaign sent ${daysSinceCampaign} days ago`)
        continue
      }
    }

    const campaign = createCampaign(user)
    campaigns.push(campaign)
  }

  return campaigns
}

/**
 * Create a re-engagement campaign for a user
 */
function createCampaign(user: InactiveUser): ReEngagementCampaign {
  const campaignType = determineCampaignType(user.inactivityLevel)
  const { subject, body, incentive } = generateEmailContent(user, campaignType)

  return {
    userId: user.userId,
    campaignType,
    inactivityLevel: user.inactivityLevel,
    daysInactive: user.daysInactive,
    emailSubject: subject,
    emailBody: body,
    incentiveOffered: incentive,
    scheduledAt: new Date(),
    sentAt: null,
    opened: false,
    clicked: false,
    resulted_in_return: false
  }
}

/**
 * Determine campaign type based on inactivity level
 */
function determineCampaignType(level: InactivityLevel): CampaignType {
  switch (level) {
    case 'mild':
      return 'gentle-reminder'
    case 'moderate':
      return 'motivational'
    case 'severe':
      return 'incentive'
    case 'critical':
      return 'last-chance'
  }
}

/**
 * Generate email content based on user and campaign type
 */
function generateEmailContent(
  user: InactiveUser,
  campaignType: CampaignType
): { subject: string; body: string; incentive: string | null } {
  const firstName = user.name.split(' ')[0]

  switch (campaignType) {
    case 'gentle-reminder':
      return {
        subject: `${firstName}, your ${user.previousStreak}-day streak is waiting! 🔥`,
        body: `
Hi ${firstName},

We noticed you haven't logged a meal in ${user.daysInactive} days. Your ${user.previousStreak}-day streak was amazing—don't let it go to waste!

Quick reminder: You've already logged ${user.totalMealsLogged} meals. That's incredible progress! 💪

Just one meal logged today will get you back on track.

Ready to continue your journey?

[Log a Meal Now] → https://app.weightlossprojectlab.com/log-meal

Keep crushing it,
The Weight Loss Project Lab Team

P.S. Your personalized AI coach is ready to chat whenever you need support.
        `,
        incentive: null
      }

    case 'motivational':
      return {
        subject: `${firstName}, we miss you! Your progress deserves celebration 🎉`,
        body: `
Hi ${firstName},

It's been ${user.daysInactive} days since your last check-in. We know life gets busy, but your health goals are important!

Here's what you've accomplished so far:
- ${user.totalMealsLogged} meals logged 📊
- ${user.previousStreak}-day streak achieved 🔥
- Progress toward your goal 🎯

You're closer to your target than you think. Let's keep that momentum going!

[Continue Your Journey] → https://app.weightlossprojectlab.com/dashboard

Your AI coach has personalized tips waiting for you.

See you soon,
The WLPL Team

P.S. Need motivation? Try our new Weekly Missions for bonus XP and badges!
        `,
        incentive: null
      }

    case 'incentive':
      return {
        subject: `${firstName}, come back and get 1 month premium FREE! 🎁`,
        body: `
Hi ${firstName},

We really miss you! It's been ${user.daysInactive} days since you last logged in.

We understand that staying consistent is challenging. That's why we want to help you get back on track with a special offer:

🎁 **1 Month of Premium Features - FREE**

Premium includes:
- Advanced nutrition insights and macro tracking
- Unlimited AI coach conversations
- Custom meal templates and recipe scaling
- Priority support

You've already made amazing progress with ${user.totalMealsLogged} meals logged. Don't let that hard work go to waste!

[Claim Your Free Month] → https://app.weightlossprojectlab.com/premium?code=COMEBACK30

This offer expires in 7 days.

We believe in you!
The WLPL Team

P.S. Your data and progress are all saved and waiting for you.
        `,
        incentive: '1 month premium free'
      }

    case 'last-chance':
      return {
        subject: `${firstName}, we don't want to lose you 💔`,
        body: `
Hi ${firstName},

We haven't seen you in ${user.daysInactive} days, and we're genuinely concerned.

Weight loss journeys have ups and downs—that's completely normal. But giving up means losing all the progress you've made:

- ${user.totalMealsLogged} meals tracked
- ${user.previousStreak}-day streak (your personal best!)
- Valuable insights into your nutrition habits

**Special Comeback Offer:**
- 3 months premium FREE + unlimited AI coaching
- Personalized comeback plan from our AI coach
- Reset your goals with a fresh start
- Priority support from our team

[I'm Ready to Come Back] → https://app.weightlossprojectlab.com/comeback

If you're done with Weight Loss Project Lab, we understand. But before you go, can you tell us why? Your feedback helps us improve for others.

[Give Feedback] → https://app.weightlossprojectlab.com/feedback

Rooting for you always,
The WLPL Team

P.S. This is our final email. We won't bother you again, but we'll always be here if you need us.
        `,
        incentive: '3 months premium free'
      }
  }
}

/**
 * Get recent campaign for a user
 */
async function getRecentCampaign(userId: string): Promise<ReEngagementCampaign | null> {
  try {
    const campaignsRef = collection(db, 'reengagement_campaigns')
    const q = query(
      campaignsRef,
      where('userId', '==', userId),
      orderBy('scheduledAt', 'desc'),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const data = snapshot.docs[0].data()
    return {
      userId: data.userId,
      campaignType: data.campaignType,
      inactivityLevel: data.inactivityLevel,
      daysInactive: data.daysInactive,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      incentiveOffered: data.incentiveOffered,
      scheduledAt: data.scheduledAt.toDate(),
      sentAt: data.sentAt ? data.sentAt.toDate() : null,
      opened: data.opened || false,
      clicked: data.clicked || false,
      resulted_in_return: data.resulted_in_return || false
    }
  } catch (error) {
    console.error('Error getting recent campaign:', error)
    return null
  }
}

/**
 * Save campaign to Firestore
 */
export async function saveCampaign(campaign: ReEngagementCampaign): Promise<void> {
  try {
    const campaignRef = doc(db, 'reengagement_campaigns', `${campaign.userId}_${Date.now()}`)

    await setDoc(campaignRef, {
      userId: campaign.userId,
      campaignType: campaign.campaignType,
      inactivityLevel: campaign.inactivityLevel,
      daysInactive: campaign.daysInactive,
      emailSubject: campaign.emailSubject,
      emailBody: campaign.emailBody,
      incentiveOffered: campaign.incentiveOffered,
      scheduledAt: Timestamp.fromDate(campaign.scheduledAt),
      sentAt: campaign.sentAt ? Timestamp.fromDate(campaign.sentAt) : null,
      opened: campaign.opened,
      clicked: campaign.clicked,
      resulted_in_return: campaign.resulted_in_return
    })

    console.log(`Campaign saved for user ${campaign.userId}: ${campaign.campaignType}`)
  } catch (error) {
    console.error('Error saving campaign:', error)
    throw error
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Analyze inactivity across the platform
 */
export async function analyzeInactivity(): Promise<InactivityAnalysis> {
  try {
    const inactiveUsers = await detectInactiveUsers()

    const breakdown = {
      mild: 0,
      moderate: 0,
      severe: 0,
      critical: 0
    }

    const churnRisk = {
      low: 0,
      medium: 0,
      high: 0
    }

    let totalInactiveDays = 0

    for (const user of inactiveUsers) {
      // Breakdown by inactivity level
      breakdown[user.inactivityLevel]++

      // Breakdown by churn risk
      if (user.churnProbability < 0.3) {
        churnRisk.low++
      } else if (user.churnProbability < 0.7) {
        churnRisk.medium++
      } else {
        churnRisk.high++
      }

      totalInactiveDays += user.daysInactive
    }

    // Get total users
    const usersRef = collection(db, 'users')
    const usersSnapshot = await getDocs(usersRef)
    const totalUsers = usersSnapshot.size

    return {
      totalUsers,
      activeUsers: totalUsers - inactiveUsers.length,
      inactiveUsers: inactiveUsers.length,
      breakdown,
      averageInactiveDays: inactiveUsers.length > 0
        ? Math.round(totalInactiveDays / inactiveUsers.length)
        : 0,
      churnRisk,
      campaignsNeeded: inactiveUsers.length,
      analyzedAt: new Date()
    }
  } catch (error) {
    console.error('Error analyzing inactivity:', error)
    throw error
  }
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignMetrics(): Promise<{
  totalCampaigns: number
  sent: number
  opened: number
  clicked: number
  conversions: number
  openRate: number
  clickRate: number
  conversionRate: number
}> {
  try {
    const campaignsRef = collection(db, 'reengagement_campaigns')
    const snapshot = await getDocs(campaignsRef)

    let sent = 0
    let opened = 0
    let clicked = 0
    let conversions = 0

    snapshot.forEach(doc => {
      const data = doc.data()
      if (data.sentAt) sent++
      if (data.opened) opened++
      if (data.clicked) clicked++
      if (data.resulted_in_return) conversions++
    })

    return {
      totalCampaigns: snapshot.size,
      sent,
      opened,
      clicked,
      conversions,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      conversionRate: sent > 0 ? (conversions / sent) * 100 : 0
    }
  } catch (error) {
    console.error('Error getting campaign metrics:', error)
    throw error
  }
}

// ============================================================================
// Email Integration (Placeholder)
// ============================================================================

/**
 * Send re-engagement email
 *
 * NOTE: This is a placeholder. Actual implementation requires:
 * - Email service integration (SendGrid, Resend, Mailgun, etc.)
 * - API keys configured
 * - Email templates
 * - Tracking pixels for open/click tracking
 *
 * For now, this function saves the campaign and logs the intent.
 * Actual sending should be done via Cloud Functions or API route.
 */
export async function sendReEngagementEmail(campaign: ReEngagementCampaign): Promise<boolean> {
  try {
    // Save campaign to Firestore
    await saveCampaign(campaign)

    // TODO: Integrate with email service provider
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const msg = {
      to: user.email,
      from: 'support@weightlossprojectlab.com',
      subject: campaign.emailSubject,
      html: campaign.emailBody,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    }

    await sgMail.send(msg)
    */

    // For now, just log
    console.log(`[EMAIL] Re-engagement campaign ready for user ${campaign.userId}`)
    console.log(`Subject: ${campaign.emailSubject}`)
    console.log(`Type: ${campaign.campaignType}`)

    return true
  } catch (error) {
    console.error('Error sending re-engagement email:', error)
    return false
  }
}

/**
 * Run daily inactive user detection job
 *
 * This should be called by a Cloud Function or cron job
 */
export async function runDailyDetection(): Promise<{
  detected: number
  campaigns: number
  errors: string[]
}> {
  const errors: string[] = []

  try {
    console.log('Starting daily inactive user detection...')

    // Detect inactive users
    const inactiveUsers = await detectInactiveUsers()
    console.log(`Found ${inactiveUsers.length} inactive users`)

    // Generate campaigns
    const campaigns = await generateCampaigns(inactiveUsers)
    console.log(`Generated ${campaigns.length} re-engagement campaigns`)

    // Send emails (or queue them)
    for (const campaign of campaigns) {
      try {
        await sendReEngagementEmail(campaign)
      } catch (error) {
        errors.push(`Failed to send campaign to ${campaign.userId}: ${error}`)
      }
    }

    console.log(`Daily detection complete. Sent ${campaigns.length} campaigns.`)

    return {
      detected: inactiveUsers.length,
      campaigns: campaigns.length,
      errors
    }
  } catch (error) {
    console.error('Error in daily detection:', error)
    errors.push(`Critical error: ${error}`)

    return {
      detected: 0,
      campaigns: 0,
      errors
    }
  }
}
