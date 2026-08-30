/**
 * White-label CRM — notes ON an appointment, across MULTIPLE visits (HAST).
 *
 * The pivot's whole point: a note lands on the specific visit it's about, with
 * no ambiguity or cross-contamination. This test seeds two appointments, builds
 * a multi-note thread on one, adds a single note to the other, and asserts —
 * both in Firestore and in the UI — that each note lives under its OWN
 * appointment (never the other). Internal/staff-only.
 *
 * Runs under chromium-franchise (franchise_admin session). Seeds a managed
 * client + two caregiver-visit appointments; cleans up via recursiveDelete
 * (removes the appointments + their notes too).
 */

import { test, expect } from '@playwright/test'
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = admin.firestore()
const TENANT_SLUG = 'little-care-bears'

const stamp = Date.now()
const UID = `e2e_apptnotes_${stamp}`

// Two distinct visits on the same client.
const A = { id: `apptA_${stamp}`, patient: 'Margaret Henderson', type: 'routine-checkup', reason: 'Wellness check + BP review' }
const B = { id: `apptB_${stamp}`, patient: 'Diego Henderson', type: 'follow-up', reason: 'Medication review' }

// Notes: a two-note thread on A, a single note on B.
const A1 = `A1 · systolic 150 today, recheck in a week ${stamp}`
const A2 = `A2 · left a voicemail for the daughter ${stamp}`
const B1 = `B1 · confirmed metformin refill sent ${stamp}`
// A back-and-forth ON note A1: a reply, then the original author replying to
// the reply — a continuous conversation thread, messaging-style.
const R1 = `Reply · daughter called back, recheck booked ${stamp}`
const R2 = `Reply2 · thanks, closing this out ${stamp}`

function rowFor(page: import('@playwright/test').Page, v: typeof A) {
  return page.getByRole('button').filter({ hasText: `${v.patient} · ${v.type}` })
}
/** Fill a controlled input reliably: re-fill until the value sticks (a React
 *  re-render right after a prior mutation can otherwise wipe a single fill). */
async function fillStable(loc: import('@playwright/test').Locator, text: string) {
  await expect
    .poll(async () => {
      await loc.fill(text)
      return loc.inputValue()
    }, { timeout: 10_000, intervals: [150, 250, 400, 600] })
    .toBe(text)
}
async function notesUnder(apptId: string) {
  return db.collection('users').doc(UID).collection('appointments').doc(apptId).collection('notes')
}

test.describe('White-label CRM — appointment notes across multiple visits', () => {
  test.setTimeout(5 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    const tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const soon = (hrs: number) => new Date(Date.now() + hrs * 60 * 60 * 1000).toISOString()

    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: `Appt Notes Family ${stamp}`, email: `apptnotes.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-apptnotes-fixture',
    })
    await userRef.collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: A.patient, relationship: 'client', status: 'active', createdAt: now,
    })
    for (const [i, v] of [A, B].entries()) {
      await userRef.collection('appointments').doc(v.id).set({
        dateTime: soon(2 + i), careContext: 'caregiver-visit', patientName: v.patient,
        type: v.type, reason: v.reason, status: 'scheduled', createdAt: now,
      })
    }
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('each note lands on its own visit — thread on A, single on B, no leakage', async ({ page }) => {
    await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Upcoming appointments' })).toBeVisible({ timeout: 90_000 })
    await expect(rowFor(page, A)).toBeVisible()
    await expect(rowFor(page, B)).toBeVisible()

    // Build a two-note thread on visit A only. Expand A once, add both notes.
    await rowFor(page, A).click()
    for (const text of [A1, A2]) {
      const box = page.getByLabel(`Add a note to ${A.patient} · ${A.type}`)
      await fillStable(box, text)
      await page.getByRole('button', { name: 'Add note', exact: true }).click()
      await expect(page.getByText(text)).toBeVisible({ timeout: 60_000 })
    }

    // Isolation checkpoint: A has both notes; B has NONE (nothing leaked to B).
    await expect.poll(async () => (await (await notesUnder(A.id)).get()).size, { timeout: 30_000 }).toBe(2)
    expect((await (await notesUnder(B.id)).get()).size).toBe(0)

    // Now a single note on visit B.
    await rowFor(page, B).click()
    const boxB = page.getByLabel(`Add a note to ${B.patient} · ${B.type}`)
    await fillStable(boxB, B1)
    await page.getByRole('button', { name: 'Add note', exact: true }).last().click()
    await expect(page.getByText(B1)).toBeVisible({ timeout: 60_000 })

    // Persisted outcome, per visit: A = {A1, A2}, B = {B1}. No cross-contamination.
    await expect.poll(async () => (await (await notesUnder(B.id)).get()).size, { timeout: 30_000 }).toBe(1)
    const aNotesRef = await notesUnder(A.id)
    const aBodies = (await aNotesRef.get()).docs.map(d => d.data().body).sort()
    const bBodies = (await (await notesUnder(B.id)).get()).docs.map(d => d.data().body)
    expect(aBodies).toEqual([A1, A2].sort())
    expect(bBodies).toEqual([B1])

    // Continuous conversation ON note A1: reply R1, then the author replies to
    // the reply (R2). The whole thread must land under A1 only, in order.
    const a1Id = (await aNotesRef.get()).docs.find(d => d.data().body === A1)!.id
    const a2Id = (await aNotesRef.get()).docs.find(d => d.data().body === A2)!.id
    const a1Li = page.locator(`[data-note-id="${a1Id}"]`)
    const a1Replies = aNotesRef.doc(a1Id).collection('replies')

    await fillStable(a1Li.getByPlaceholder('Reply…'), R1)
    await a1Li.getByRole('button', { name: 'Reply', exact: true }).click()
    await expect(page.getByText(R1)).toBeVisible({ timeout: 60_000 })

    // The reply box stays open — reply again to keep the conversation going.
    await fillStable(a1Li.getByPlaceholder('Reply…'), R2)
    await a1Li.getByRole('button', { name: 'Reply', exact: true }).click()
    await expect(page.getByText(R2)).toBeVisible({ timeout: 60_000 })

    // Persisted under A1 only, oldest → newest — A2 and B1 have no replies.
    await expect
      .poll(async () => (await a1Replies.orderBy('createdAt', 'asc').get()).size, { timeout: 30_000 })
      .toBe(2)
    const a1ReplyBodies = (await a1Replies.orderBy('createdAt', 'asc').get()).docs.map(d => d.data().body)
    expect(a1ReplyBodies).toEqual([R1, R2])
    expect((await aNotesRef.doc(a2Id).collection('replies').get()).size).toBe(0)
    const bNoteId = (await (await notesUnder(B.id)).get()).docs[0].id
    expect((await (await notesUnder(B.id)).doc(bNoteId).collection('replies').get()).size).toBe(0)

    // UI reads it all back after a fresh load: A shows (2) notes + both replies,
    // B shows (1), and B's note never appears inside A's drawer.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(rowFor(page, A).getByText('View notes (2)')).toBeVisible({ timeout: 90_000 })
    await expect(rowFor(page, B).getByText('View notes (1)')).toBeVisible()

    await rowFor(page, A).click() // open A only
    await expect(page.getByText(A1)).toBeVisible()
    await expect(page.getByText(A2)).toBeVisible()
    await expect(page.getByText(R1)).toBeVisible() // the conversation persisted
    await expect(page.getByText(R2)).toBeVisible() //   …including the follow-up
    await expect(page.getByText(B1)).toHaveCount(0) // B's note is NOT under A
  })
})
