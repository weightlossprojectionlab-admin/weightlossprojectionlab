/**
 * One-off cleanup: cancel a Stripe subscription that's orphaned
 * (its metadata.firebaseUid references a Firebase user that no
 * longer exists in Firestore). Without cancellation the orphan
 * keeps firing webhook events that hit a deleted user's doc and
 * silently fail.
 *
 * Safety guards:
 *   - Refuses to cancel anything other than 'active' or 'trialing'
 *     subs (canceled / past_due / etc. don't need this script).
 *   - When --expected-firebaseUid is passed, verifies the sub's
 *     metadata matches before cancelling. Prevents canceling the
 *     wrong sub by typo'd ID.
 *   - Dry-run by default. Pass --apply to actually cancel.
 *
 * Usage:
 *   npx tsx scripts/cancel-orphaned-stripe-sub.ts <subId>                                              (dry-run)
 *   npx tsx scripts/cancel-orphaned-stripe-sub.ts <subId> --expected-firebaseUid <uid>                (dry-run + verify)
 *   npx tsx scripts/cancel-orphaned-stripe-sub.ts <subId> --expected-firebaseUid <uid> --apply        (write)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import stripe from '../lib/stripe-config'

const subId = process.argv[2]
const apply = process.argv.includes('--apply')

const expectedFirebaseUidIdx = process.argv.indexOf('--expected-firebaseUid')
const expectedFirebaseUid =
  expectedFirebaseUidIdx >= 0 ? process.argv[expectedFirebaseUidIdx + 1] : undefined

if (!subId) {
  console.error(
    'Usage: npx tsx scripts/cancel-orphaned-stripe-sub.ts <subId> [--expected-firebaseUid <uid>] [--apply]',
  )
  process.exit(1)
}

async function main() {
  console.log(`Fetching subscription ${subId}…`)
  const sub = await stripe.subscriptions.retrieve(subId)
  const customer =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  const metadataFirebaseUid = sub.metadata?.firebaseUid
  const priceId = sub.items.data[0]?.price?.id

  console.log(`  customer:        ${customer}`)
  console.log(`  status:          ${sub.status}`)
  console.log(`  price:           ${priceId}`)
  console.log(`  metadata.firebaseUid: ${metadataFirebaseUid ?? '(none)'}`)

  if (sub.status !== 'active' && sub.status !== 'trialing') {
    console.error(`Refusing to cancel — status is ${sub.status} (only active/trialing are valid).`)
    process.exit(1)
  }

  if (expectedFirebaseUid && metadataFirebaseUid !== expectedFirebaseUid) {
    console.error(
      `Refusing to cancel — metadata.firebaseUid=${metadataFirebaseUid} does not match expected ${expectedFirebaseUid}. Aborting for safety.`,
    )
    process.exit(1)
  }

  if (!apply) {
    console.log()
    console.log(`[DRY-RUN] Would cancel subscription ${subId} immediately.`)
    console.log('Re-run with --apply to actually cancel.')
    return
  }

  console.log()
  console.log(`Canceling subscription ${subId}…`)
  const canceled = await stripe.subscriptions.cancel(subId)
  console.log(`✅ Canceled. New status: ${canceled.status}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
