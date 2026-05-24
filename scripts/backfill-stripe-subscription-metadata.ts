/**
 * One-off recovery: backfill the `firebaseUid` metadata on a Stripe
 * subscription created out-of-band or before the metadata convention
 * was added. Required for the webhook handlers to route events to
 * the correct user — every handler in /api/stripe/webhook gates on
 * `subscription.metadata.firebaseUid` and bails when missing.
 *
 * Looks up the Stripe customer by email, lists their subscriptions,
 * and updates each sub's metadata to set `firebaseUid` (and `userId`
 * for redundancy — webhook handlers don't read it but it makes the
 * Stripe Dashboard easier to grep).
 *
 * Dry-run by default. Pass --apply to actually write.
 *
 * Usage:
 *   npx tsx scripts/backfill-stripe-subscription-metadata.ts <email> <firebaseUid>             (dry-run)
 *   npx tsx scripts/backfill-stripe-subscription-metadata.ts <email> <firebaseUid> --apply     (write)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import stripe from '../lib/stripe-config'

const email = process.argv[2]
const firebaseUid = process.argv[3]
const apply = process.argv.includes('--apply')

if (!email || !firebaseUid) {
  console.error(
    'Usage: npx tsx scripts/backfill-stripe-subscription-metadata.ts <email> <firebaseUid> [--apply]',
  )
  process.exit(1)
}

async function main() {
  console.log(`Looking up Stripe customer by email: ${email}`)
  const customers = await stripe.customers.list({ email, limit: 5 })

  if (customers.data.length === 0) {
    console.error(`No Stripe customer found for email ${email}`)
    process.exit(1)
  }

  console.log(`Found ${customers.data.length} customer(s):`)
  for (const customer of customers.data) {
    console.log(`  customerId=${customer.id}  email=${customer.email}`)
  }

  let updated = 0
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 20,
    })

    if (subs.data.length === 0) {
      console.log(`  customer ${customer.id}: no subscriptions`)
      continue
    }

    for (const sub of subs.data) {
      const existingMetadata = sub.metadata || {}
      const existingFirebaseUid = existingMetadata.firebaseUid
      const status = sub.status
      const priceId = sub.items.data[0]?.price?.id

      if (existingFirebaseUid === firebaseUid) {
        console.log(`  sub ${sub.id} (${status}, price=${priceId}): already has correct firebaseUid — skip`)
        continue
      }

      if (existingFirebaseUid && existingFirebaseUid !== firebaseUid) {
        console.warn(
          `  sub ${sub.id} (${status}): EXISTING firebaseUid=${existingFirebaseUid} differs from target ${firebaseUid}. Skipping for safety. Use Stripe Dashboard to resolve.`,
        )
        continue
      }

      if (!apply) {
        console.log(`  [DRY-RUN] would set metadata.firebaseUid=${firebaseUid} on sub ${sub.id} (${status}, price=${priceId})`)
        updated += 1
        continue
      }

      await stripe.subscriptions.update(sub.id, {
        metadata: {
          ...existingMetadata,
          firebaseUid,
          userId: firebaseUid,
        },
      })
      console.log(`  ✅ updated sub ${sub.id} (${status}) — set firebaseUid=${firebaseUid}`)
      updated += 1
    }
  }

  console.log()
  console.log(`Done. ${apply ? 'Updated' : 'Would update'} ${updated} subscription(s).`)
  if (!apply && updated > 0) {
    console.log('Re-run with --apply to write the metadata to Stripe.')
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
