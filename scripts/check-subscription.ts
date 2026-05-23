/**
 * Read-only diagnostic: dump a user's subscription state from Firestore.
 *
 * Usage:
 *   npx tsx scripts/check-subscription.ts <userId>
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { adminDb } from '../lib/firebase-admin'

const userId = process.argv[2]

if (!userId) {
  console.error('Usage: npx tsx scripts/check-subscription.ts <userId>')
  process.exit(1)
}

;(async () => {
  console.log(`\n🔍 Looking up user: ${userId}\n`)

  const userRef = adminDb.collection('users').doc(userId)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    console.log('❌ User document does NOT exist in Firestore.')
    console.log('   (After a wipe this is expected — Firebase Auth account may still exist.)')
    return
  }

  const data = userDoc.data() ?? {}
  console.log('✅ User document exists.\n')

  // Subscription nested object
  if (data.subscription) {
    console.log('💳 Subscription field present:')
    console.log(JSON.stringify(data.subscription, null, 2))
  } else {
    console.log('💳 No `subscription` field on this user doc.')
  }
  console.log('')

  // Other useful top-level identity bits (read-only preview)
  const interesting = ['email', 'name', 'displayName', 'createdAt', 'role', 'isGrandfathered']
  const preview: Record<string, unknown> = {}
  for (const k of interesting) {
    if (k in data) preview[k] = data[k]
  }
  if (Object.keys(preview).length > 0) {
    console.log('👤 Identity preview:')
    console.log(JSON.stringify(preview, null, 2))
  }
})().catch((err) => {
  console.error('💥 Error:', err)
  process.exit(1)
})
