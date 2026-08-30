/**
 * White-label CRM — a managed client's due care tasks on the workspace (Phase 1,
 * read-only). A franchise operator opens a client's workspace and sees the
 * client's active household duties rendered as the visit "care plan", with an
 * overdue task flagged. Reads via the tenant workspace loader (admin SDK).
 *
 * Runs under chromium-franchise (franchise_admin session). Seeds a managed
 * client + two household_duties (one overdue, one future); cleans both up.
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
const UID = `e2e_caretasks_${stamp}`
const OVERDUE_TASK = `Change bed linens ${stamp}`
const FUTURE_TASK = `Weekly grocery run ${stamp}`
const dutyIds: string[] = []

test.describe('White-label CRM — client care tasks (read-only)', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    const tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await db.collection('users').doc(UID).set({
      name: `Care Tasks Family ${stamp}`, email: `caretasks.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-caretasks-fixture',
    })
    await db.collection('users').doc(UID).collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: 'Care Tasks Member', relationship: 'client', status: 'active', createdAt: now,
    })

    // Duties key to the client's OWN userId (family-created). One overdue, one future.
    const overdue = await db.collection('household_duties').add({
      userId: UID, householdId: `${UID}-hh`, category: 'cleaning_bedroom', name: OVERDUE_TASK,
      isCustom: false, assignedTo: [UID], assignedBy: UID, assignedAt: now,
      frequency: 'weekly', priority: 'high', status: 'pending', completionCount: 0, skipCount: 0,
      nextDueDate: yesterday, isActive: true, createdAt: now, createdBy: UID, lastModified: now,
      notifyOnCompletion: false, notifyOnOverdue: false, reminderEnabled: false,
    })
    const future = await db.collection('household_duties').add({
      userId: UID, householdId: `${UID}-hh`, category: 'grocery_shopping', name: FUTURE_TASK,
      isCustom: false, assignedTo: [UID], assignedBy: UID, assignedAt: now,
      frequency: 'weekly', priority: 'medium', status: 'pending', completionCount: 0, skipCount: 0,
      nextDueDate: nextWeek, isActive: true, createdAt: now, createdBy: UID, lastModified: now,
      notifyOnCompletion: false, notifyOnOverdue: false, reminderEnabled: false,
    })
    dutyIds.push(overdue.id, future.id)
  })

  test.afterAll(async () => {
    for (const id of dutyIds) await db.collection('household_duties').doc(id).delete().catch(() => {})
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('the workspace shows the client’s active duties, overdue flagged', async ({ page }) => {
    await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Due care tasks' })).toBeVisible({ timeout: 90_000 })

    // Both active duties render.
    const overdueRow = page.locator('li').filter({ hasText: OVERDUE_TASK })
    const futureRow = page.locator('li').filter({ hasText: FUTURE_TASK })
    await expect(overdueRow).toBeVisible()
    await expect(futureRow).toBeVisible()

    // The past-due one is flagged Overdue; the future one is not.
    await expect(overdueRow.getByText('Overdue')).toBeVisible()
    await expect(futureRow.getByText('Overdue')).toHaveCount(0)
  })
})
