/**
 * One-off recovery: pull the current subscription state for a user
 * directly from Stripe and write it into Firestore, bypassing the
 * webhook handler entirely.
 *
 * Use when `stripe listen` wasn't running during a checkout/upgrade,
 * so the relevant webhook events fired into the void and Firestore
 * is stuck on the previous subscription state.
 *
 * Reuses the exact mapping + write functions the webhook handler uses
 * (resolvePlanFromSubscription + updateUserSubscription) — exported
 * from the route file specifically so this script can call them and
 * stay DRY. If the webhook logic changes, this script picks it up
 * automatically; no parallel mapping to keep in sync.
 *
 * Dry-run by default. Pass --apply to actually write to Firestore.
 *
 * Usage:
 *   npx tsx scripts/sync-subscription-from-stripe.ts <userId>             (dry-run)
 *   npx tsx scripts/sync-subscription-from-stripe.ts <userId> --apply     (write)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import stripe from '../lib/stripe-config'
import { adminDb } from '../lib/firebase-admin'
import {
  resolvePlanFromSubscription,
  updateUserSubscription,
} from '../app/api/stripe/webhook/route'

const userId = process.argv[2]
const apply = process.argv.includes('--apply')

if (!userId) {
  console.error('Usage: npx tsx scripts/sync-subscription-from-stripe.ts <userId> [--apply]')
  process.exit(1)
}

;(async () => {
  console.log(`\n${apply ? '🔥 APPLY MODE' : '🧪 DRY-RUN MODE'} — syncing subscription for user: ${userId}\n`)

  // 1. Look up the user doc to get stripeCustomerId
  const userDoc = await adminDb.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    console.error('❌ User document not found in Firestore.')
    process.exit(1)
  }
  const userData = userDoc.data() ?? {}
  const customerId: string | undefined = userData.subscription?.stripeCustomerId

  if (!customerId) {
    console.error('❌ User doc has no subscription.stripeCustomerId. Cannot look up Stripe subscription.')
    process.exit(1)
  }
  console.log(`👤 User: ${userData.email ?? '(no email)'}\n💳 Stripe customer: ${customerId}\n`)

  // 2. Fetch ALL subscriptions for this customer from Stripe. Prefer
  //    the most-recent non-canceled one. (Customers can have multiple
  //    historical subs; we want the live one driving access today.)
  const subsResp = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  })

  if (subsResp.data.length === 0) {
    console.error('❌ No subscriptions found for this Stripe customer.')
    process.exit(1)
  }

  console.log(`📋 Found ${subsResp.data.length} subscription(s) on Stripe side. Picking the most relevant...\n`)
  for (const s of subsResp.data) {
    console.log(`   - ${s.id} status=${s.status} created=${new Date(s.created * 1000).toISOString()}`)
  }
  console.log('')

  // Prefer active/trialing/past_due over canceled/incomplete_expired.
  const priority = ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'canceled', 'incomplete_expired', 'paused']
  const chosen =
    [...subsResp.data].sort((a, b) => {
      const ap = priority.indexOf(a.status)
      const bp = priority.indexOf(b.status)
      if (ap !== bp) return ap - bp
      return b.created - a.created // newer first as tiebreak
    })[0]

  console.log(`✅ Chose subscription: ${chosen.id} (status=${chosen.status})\n`)

  // 3. Derive plan + interval using the webhook's resolver — same code
  //    path the live handler would run.
  const { plan, billingInterval } = resolvePlanFromSubscription(chosen)
  if (!plan) {
    console.error('❌ Could not resolve plan from subscription price. Check lib/stripe-price-mapping.ts.')
    console.error(`   priceId: ${chosen.items.data[0]?.price?.id}`)
    process.exit(1)
  }

  console.log(`🧭 Resolved: plan=${plan} interval=${billingInterval}`)
  // Mirror the webhook handler's items-first fallback (Stripe moved
  // current_period_* from Subscription to its items in recent API
  // versions).
  const previewItem: any = chosen.items.data[0]
  const previewStart =
    previewItem?.current_period_start ?? (chosen as any).current_period_start
  const previewEnd =
    previewItem?.current_period_end ?? (chosen as any).current_period_end
  console.log(`📅 currentPeriodStart=${previewStart ? new Date((previewStart as number) * 1000).toISOString() : '(missing)'}`)
  console.log(`📅 currentPeriodEnd=${previewEnd ? new Date((previewEnd as number) * 1000).toISOString() : '(missing)'}`)
  console.log('')

  // 4. Apply if requested.
  if (!apply) {
    console.log('   (dry-run — pass --apply to write to Firestore)\n')
    return
  }

  console.log('🔥 Writing to Firestore via webhook handler\'s updateUserSubscription...')
  await updateUserSubscription(userId, chosen, plan, billingInterval)
  console.log('✅ Done.\n')

  // 5. Re-read and confirm.
  const after = await adminDb.collection('users').doc(userId).get()
  console.log('📋 Updated subscription field:')
  console.log(JSON.stringify(after.data()?.subscription, null, 2))
})().catch((err) => {
  console.error('💥 Error:', err)
  process.exit(1)
})
