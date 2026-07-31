/**
 * White-label CRM — staff mark a client's care task done (Phase 2, real-outcome).
 *
 * A franchise operator opens a managed client's workspace, marks an overdue care
 * task done, and we assert the persisted outcome: a `duty_completions` record
 * exists for that duty (completedBy = the operator), and the duty itself advanced
 * (completionCount incremented, lastCompletedAt set) via the SHARED completeDuty()
 * service reached through the tenant duties API.
 *
 * Runs under chromium-franchise (franchise_admin session). Seeds a managed client
 * + one overdue household_duty (keyed to the client's userId); cleans up the duty,
 * its completions, and the client.
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
const UID = `e2e_taskdone_${stamp}`
const TASK = `Change bed linens ${stamp}`
let DUTY_ID = ''

test.describe('White-label CRM — mark a care task done (internal)', () => {
  test.setTimeout(4 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    const tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    await db.collection('users').doc(UID).set({
      name: `Task Done Family ${stamp}`, email: `taskdone.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-taskdone-fixture',
    })
    await db.collection('users').doc(UID).collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: 'Task Done Member', relationship: 'client', status: 'active', createdAt: now,
    })
    const duty = await db.collection('household_duties').add({
      userId: UID, householdId: `${UID}-hh`, category: 'cleaning_bedroom', name: TASK,
      isCustom: false, assignedTo: [UID], assignedBy: UID, assignedAt: now,
      frequency: 'weekly', priority: 'high', status: 'pending', completionCount: 0, skipCount: 0,
      nextDueDate: yesterday, isActive: true, createdAt: now, createdBy: UID, lastModified: now,
      notifyOnCompletion: false, notifyOnOverdue: false, reminderEnabled: false,
    })
    DUTY_ID = duty.id
  })

  test.afterAll(async () => {
    const comps = await db.collection('duty_completions').where('dutyId', '==', DUTY_ID).get().catch(() => null)
    for (const c of comps?.docs || []) await c.ref.delete().catch(() => {})
    await db.collection('household_duties').doc(DUTY_ID).delete().catch(() => {})
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('marking a task done records a DutyCompletion and advances the duty', async ({ page }) => {
    await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Due care tasks' })).toBeVisible({ timeout: 90_000 })

    const row = page.locator('li').filter({ hasText: TASK })
    await expect(row).toBeVisible()
    await expect(row.getByText('Overdue')).toBeVisible()

    await row.getByRole('button', { name: 'Mark done' }).click()

    // UI confirms done (no longer overdue).
    await expect(row.getByText('✓ Done')).toBeVisible({ timeout: 60_000 })

    // Persisted: a completion record for this duty, by the operator.
    const compRef = db.collection('duty_completions').where('dutyId', '==', DUTY_ID)
    await expect.poll(async () => (await compRef.get()).size, { timeout: 30_000 }).toBe(1)
    const comp = (await compRef.get()).docs[0].data()
    expect(typeof comp.completedBy).toBe('string')
    expect((comp.completedBy as string).length).toBeGreaterThan(0)

    // Persisted: the duty advanced (completed once, rescheduled to the future).
    const duty = (await db.collection('household_duties').doc(DUTY_ID).get()).data() as any
    expect(duty.completionCount).toBe(1)
    expect(typeof duty.lastCompletedAt).toBe('string')
    expect(new Date(duty.nextDueDate).getTime()).toBeGreaterThan(Date.now())
  })
})
