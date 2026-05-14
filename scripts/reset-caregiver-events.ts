/**
 * One-shot: reset all caregiver events for two households.
 *
 * Wipes:
 *   • shopping_sessions where householdId in {ownerUids}
 *   • notifications where userId in {ownerUid + each accepted caregiver of that household}
 *     AND type matches the caregiver-event set
 *   • shopping_items.purchaseHistory cleared to [] where userId == ownerUid
 *   • /users/{ownerUid}/handoffNotes subcollection deleted
 *
 * Run: npx tsx scripts/reset-caregiver-events.ts
 *
 * Targets: Weight Loss Project's Family (Y8wSTgymg3YXWU94iJVjzoGxsMI2)
 *          + Percy Rice's Family (looked up by firstName == 'Percy').
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const db = getFirestore(getApp())

const WLP_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

const CAREGIVER_EVENT_TYPES = new Set([
  'shopping_started',
  'shopping_done',
  'handoff_note',
  'duty_assigned',
  'duty_reassigned',
  'duty_updated',
  'duty_reminder',
  'duty_overdue',
  'duty_completed',
])

async function findPercyUid(): Promise<string | null> {
  const snap = await db
    .collection('users')
    .where('email', '==', 'wellnessprojectionlab@gmail.com')
    .limit(5)
    .get()
  if (snap.empty) {
    const alt = await db
      .collection('users')
      .where('displayName', '>=', 'Percy')
      .where('displayName', '<=', 'Percy')
      .limit(5)
      .get()
    if (alt.empty) return null
    console.log(
      `  Found ${alt.size} Percy-displayName matches:`,
      alt.docs.map((d) => `${d.id} (${d.data().displayName})`).join(', '),
    )
    return alt.docs[0].id
  }
  console.log(
    `  Found ${snap.size} Percy-firstName matches:`,
    snap.docs.map((d) => `${d.id} (${d.data().firstName} ${d.data().lastName || ''})`).join(', '),
  )
  return snap.docs[0].id
}

async function getAcceptedCaregivers(ownerUid: string): Promise<string[]> {
  const snap = await db
    .collection('users')
    .doc(ownerUid)
    .collection('familyMembers')
    .where('status', '==', 'accepted')
    .get()
  const uids: string[] = []
  for (const d of snap.docs) {
    const data = d.data()
    const uid = data.uid || data.userId || d.id
    if (typeof uid === 'string' && uid.length > 0) uids.push(uid)
  }
  return uids
}

async function deleteCollectionWhere(
  collectionName: string,
  field: string,
  values: string[],
  extraFilter?: (data: FirebaseFirestore.DocumentData) => boolean,
): Promise<number> {
  if (values.length === 0) return 0
  let total = 0
  for (const v of values) {
    const snap = await db.collection(collectionName).where(field, '==', v).get()
    const toDelete = extraFilter
      ? snap.docs.filter((d) => extraFilter(d.data() || {}))
      : snap.docs
    while (toDelete.length > 0) {
      const batch = db.batch()
      const slice = toDelete.splice(0, 400)
      for (const d of slice) batch.delete(d.ref)
      await batch.commit()
      total += slice.length
    }
  }
  return total
}

async function clearPurchaseHistory(ownerUid: string): Promise<number> {
  const snap = await db.collection('shopping_items').where('userId', '==', ownerUid).get()
  let updated = 0
  let docs = snap.docs.filter((d) => {
    const ph = d.data().purchaseHistory
    return Array.isArray(ph) && ph.length > 0
  })
  while (docs.length > 0) {
    const batch = db.batch()
    const slice = docs.splice(0, 400)
    for (const d of slice) batch.update(d.ref, { purchaseHistory: [] })
    await batch.commit()
    updated += slice.length
  }
  return updated
}

async function deleteSubcollection(ownerUid: string, sub: string): Promise<number> {
  const snap = await db
    .collection('users')
    .doc(ownerUid)
    .collection(sub)
    .get()
  let docs = [...snap.docs]
  let total = 0
  while (docs.length > 0) {
    const batch = db.batch()
    const slice = docs.splice(0, 400)
    for (const d of slice) batch.delete(d.ref)
    await batch.commit()
    total += slice.length
  }
  return total
}

async function findHouseholdDocIds(ownerUid: string): Promise<string[]> {
  const byCreated = await db
    .collection('households')
    .where('createdBy', '==', ownerUid)
    .get()
  const byPrimary = await db
    .collection('households')
    .where('primaryCaregiverId', '==', ownerUid)
    .get()
  const ids = new Set<string>()
  for (const d of byCreated.docs) ids.add(d.id)
  for (const d of byPrimary.docs) ids.add(d.id)
  return [...ids]
}

async function clearStoreRoster(ownerUid: string): Promise<boolean> {
  const ref = db.collection('users').doc(ownerUid)
  const snap = await ref.get()
  if (!snap.exists) return false
  const data = snap.data() || {}
  if (!Array.isArray(data.householdStoreIds) || data.householdStoreIds.length === 0) {
    return false
  }
  await ref.update({ householdStoreIds: [] })
  return true
}

async function resetForOwner(ownerUid: string, label: string): Promise<void> {
  console.log(`\n=== ${label} (${ownerUid}) ===`)

  const caregivers = await getAcceptedCaregivers(ownerUid)
  console.log(`  Accepted caregivers: ${caregivers.length ? caregivers.join(', ') : '(none)'}`)

  const householdDocIds = await findHouseholdDocIds(ownerUid)
  console.log(`  households docs owned: ${householdDocIds.length ? householdDocIds.join(', ') : '(none)'}`)

  // Event surfaces (idempotent re-run is harmless).
  const sessionsDeleted = await deleteCollectionWhere('shopping_sessions', 'householdId', [
    ownerUid,
  ])
  console.log(`  shopping_sessions deleted: ${sessionsDeleted}`)

  const notifTargets = [ownerUid, ...caregivers]
  const notifsDeleted = await deleteCollectionWhere(
    'notifications',
    'userId',
    notifTargets,
    (data) => CAREGIVER_EVENT_TYPES.has(data.type),
  )
  console.log(`  notifications (caregiver-event types) deleted: ${notifsDeleted}`)

  const handoffsDeleted = await deleteSubcollection(ownerUid, 'handoffNotes')
  console.log(`  handoffNotes deleted: ${handoffsDeleted}`)

  const patientsDeleted = await deleteSubcollection(ownerUid, 'patients')
  console.log(`  patients deleted: ${patientsDeleted}`)

  // After patients delete, clear patientsAccess on every familyMembers
  // entry so the synthetic "Check in on a patient" worklist stubs go
  // away. Keep the familyMembers entry itself in place — that's what
  // keeps the household visible in the caregiver's AccountSwitcher.
  const fmSnap = await db
    .collection('users')
    .doc(ownerUid)
    .collection('familyMembers')
    .get()
  let fmCleared = 0
  for (const d of fmSnap.docs) {
    const data = d.data()
    if (Array.isArray(data.patientsAccess) && data.patientsAccess.length > 0) {
      await d.ref.update({ patientsAccess: [] })
      fmCleared++
    }
  }
  console.log(`  familyMembers patientsAccess cleared: ${fmCleared}`)

  // Source data — clean slate.
  const itemsDeleted = await deleteCollectionWhere('shopping_items', 'userId', [ownerUid])
  console.log(`  shopping_items deleted (full): ${itemsDeleted}`)

  const dutiesByHouseholdDeleted = await deleteCollectionWhere(
    'household_duties',
    'householdId',
    householdDocIds,
  )
  console.log(`  household_duties deleted (by householdId): ${dutiesByHouseholdDeleted}`)

  // Fallback: any duties keyed by owner uid as the householdId (legacy
  // single-user-as-household pattern pre-migrate-duties-to-households).
  const dutiesByOwnerUidDeleted = await deleteCollectionWhere(
    'household_duties',
    'householdId',
    [ownerUid],
  )
  console.log(`  household_duties deleted (legacy by owner uid): ${dutiesByOwnerUidDeleted}`)

  const actionItemsDeleted = await deleteCollectionWhere(
    'action_items',
    'userId',
    notifTargets,
  )
  console.log(`  action_items deleted: ${actionItemsDeleted}`)

  const rosterCleared = await clearStoreRoster(ownerUid)
  console.log(`  householdStoreIds cleared: ${rosterCleared}`)
}

async function main() {
  console.log('Looking up Percy Rice uid...')
  const percyUid = await findPercyUid()
  if (!percyUid) {
    console.error('Could not find Percy by firstName/displayName. Aborting.')
    process.exit(1)
  }
  console.log(`  Percy uid resolved: ${percyUid}`)

  if (percyUid === WLP_UID) {
    console.error('Percy uid equals WLP uid — refusing to double-purge the same household.')
    process.exit(1)
  }

  await resetForOwner(WLP_UID, "Weight Loss Project's Family")
  await resetForOwner(percyUid, "Percy Rice's Family")

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
