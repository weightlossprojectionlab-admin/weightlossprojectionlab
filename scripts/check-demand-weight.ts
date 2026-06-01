/**
 * Show the inventory health-demand weight D on your REAL inventory.
 *
 *   npx tsx scripts/check-demand-weight.ts                      # real members as-is
 *   npx tsx scripts/check-demand-weight.ts --condition diabetes # simulate a condition
 *   npx tsx scripts/check-demand-weight.ts --condition hypertension
 *
 * Read-only. For each in-stock item it prints whether it carries a nutrient
 * panel, the demand weight D (1.00 = neutral, <1 = de-prioritized for a member's
 * conditions, >1 = boosted), the attention score, action, and any unsafeFor.
 *
 * D only differs from 1.00 when (a) a member has a matching condition AND (b) the
 * item carries a `nutrients` panel — re-scan an item to populate its panel.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as fs from 'fs'
import * as path from 'path'
import { inventoryAttentionScore, compareAttention } from '../lib/inventory-attention'
import { toMemberHealthProfiles, toItemHealthProfile } from '../lib/health-context'
import type { ShoppingItem } from '../types/shopping'
import type { PatientProfile } from '../types/medical'

function findKey(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    dir = path.dirname(dir)
  }
  throw new Error('service_account_key.json not found')
}

const EMAIL = 'weightlossprojectionlab@gmail.com'

initializeApp({ credential: cert(require(findKey())) })
const db = getFirestore()

;(async () => {
  const ci = process.argv.indexOf('--condition')
  const simulatedCondition = ci !== -1 ? process.argv[ci + 1] : undefined

  const uid = (await getAuth().getUserByEmail(EMAIL)).uid

  const patientsSnap = await db.collection('users').doc(uid).collection('patients').get()
  const patients = patientsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as PatientProfile[]
  let members = toMemberHealthProfiles(patients)
  if (simulatedCondition) {
    members = members.map(m => ({ ...m, conditions: [...m.conditions, simulatedCondition] }))
    console.log(`\n(simulating condition "${simulatedCondition}" on all ${members.length} members)`)
  }
  console.log('members:', members.map(m => `${m.id}[${m.conditions.join(',') || 'no conditions'}]`).join(', '))

  const itemsSnap = await db.collection('shopping_items').where('userId', '==', uid).where('inStock', '==', true).get()
  const items = itemsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ShoppingItem[]

  const now = Date.now()
  const rows = items
    .map(item => ({ item, r: inventoryAttentionScore(item, now, { members, itemHealth: toItemHealthProfile(item) }) }))
    .sort((a, b) => compareAttention(a.r, b.r))

  console.log(`\n${items.length} in-stock items (sorted by attention, top = most urgent):\n`)
  console.log('  D     score  action     panel  name')
  console.log('  ----- ------ ---------- -----  ----')
  for (const { item, r } of rows) {
    const panel = item.nutrients ? `y/${item.nutrients.basis[0]}` : 'no'
    const flag = r.unsafeFor.length ? `  ⚠ unsafeFor ${r.unsafeFor.join(',')}` : ''
    console.log(
      `  ${r.demandWeight.toFixed(2)}  ${r.score.toFixed(2)}   ${r.action.padEnd(10)} ${panel.padEnd(6)} ${item.productName}${flag}`,
    )
  }
  process.exit(0)
})()
