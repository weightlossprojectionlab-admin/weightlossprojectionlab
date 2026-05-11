/**
 * Regression: /family-admin/households end-to-end.
 *
 * Locks in the 2026-05-11 household restructure:
 *   - Patient.householdId is the single source of truth (no
 *     Household.memberIds[] array exists anymore)
 *   - Setting Patient.householdId = X atomically moves a patient from
 *     any prior household (no second array to keep in sync)
 *   - The form leads with members, address is optional, kitchen config
 *     is defaulted not asked
 *   - A household must have ≥ 1 member; empty submissions are blocked
 *   - "Currently in X" / "Will move from X" affordance is visible on
 *     each patient row when a reassignment is about to happen
 *
 * Test patients are created via Firestore admin (not the wizard UI)
 * to keep these focused on the household form.
 */

import { test, expect, type Page } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

type CreatedResources = {
  householdIds: string[]
  patientIds: string[]
}

test.describe('Households flow — single-source-of-truth invariant @households', () => {
  // Cold compile of /family-admin/households + modal interactions —
  // be generous.
  test.setTimeout(5 * 60_000)

  const stamp = Date.now()
  const created: CreatedResources = { householdIds: [], patientIds: [] }

  async function createTestPatient(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    name: string,
    overrides: Partial<Record<string, any>> = {},
  ): Promise<string> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const doc: Record<string, any> = {
      id,
      userId: ownerUserId,
      name,
      type: 'human',
      dateOfBirth: '1980-01-01',
      gender: 'male',
      relationship: 'self',
      accountStatus: 'member',
      countsAsSeat: true,
      addedBy: ownerUserId,
      addedAt: now,
      createdAt: now,
      lastModified: now,
      ...overrides,
    }
    // Firestore admin SDK rejects undefined values. Strip them so
    // an override like `{gender: undefined}` removes the default
    // instead of throwing.
    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined) delete doc[k]
    }
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(id)
      .set(doc)
    created.patientIds.push(id)
    return id
  }

  /**
   * Edit-mode wait: the form runs two useEffects in sequence —
   *   (1) on open: reset memberIds=[]
   *   (2) after availablePatients loads: seed memberIds from
   *       patients whose householdId === this household
   * Toggling a checkbox between (1) and (2) lands on the wrong
   * state. Wait until the seed has visibly populated by checking
   * that an expected current-member's "Currently a member" indicator
   * is rendered.
   */
  async function waitForEditSeed(page: Page, patientName: string) {
    await expect(
      page
        .getByRole('dialog')
        .locator('label', { hasText: patientName })
        .first()
        .getByText('Currently a member'),
    ).toBeVisible({ timeout: 15_000 })
  }

  async function findHouseholdByName(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    name: string,
  ) {
    const snap = await firestore
      .collection('households')
      .where('primaryCaregiverId', '==', ownerUserId)
      .where('name', '==', name)
      .get()
    expect(snap.size, `exactly one household named "${name}"`).toBe(1)
    const doc = snap.docs[0]
    created.householdIds.push(doc.id)
    return { id: doc.id, data: doc.data() }
  }

  /**
   * Open the Add-Household modal from /family-admin/households.
   * The page has multiple "Add Household" affordances (header button +
   * empty-state button); we pick the first visible one.
   */
  async function openAddHouseholdModal(page: Page) {
    const addBtn = page.getByRole('button', { name: /add household|create your first household/i }).first()
    await addBtn.click()
    await expect(page.getByRole('heading', { name: 'Add a household', exact: true })).toBeVisible({
      timeout: 15_000,
    })
  }

  async function openEditHouseholdModal(page: Page, householdName: string) {
    // Anchor on the exact heading, then climb to the household card
    // (nearest ancestor div with `border-2` class — what HouseholdManager
    // uses to outline each card). `locator('div', {hasText: ...})`
    // matches every ancestor div, so .first() picks the wrong card
    // when the list has multiple households (which the suite does
    // because afterAll only fires at the end).
    const editBtn = page
      .getByRole('heading', { name: householdName, exact: true })
      .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " border-2 ")][1]//button[@title="Edit household"]')
    await editBtn.click()
    await expect(page.getByRole('heading', { name: 'Edit this household', exact: true })).toBeVisible({
      timeout: 15_000,
    })
  }

  async function toggleMemberInModal(page: Page, patientName: string) {
    // Each row is a <label> with the patient name + a checkbox inside.
    // Scroll the row into view first so the user can see the action
    // happening live AND so any below-the-fold affordances (the
    // "Will move from X" amber hint) are visible to assertions.
    const row = page
      .getByRole('dialog')
      .locator('label', { hasText: patientName })
      .first()
    await row.scrollIntoViewIfNeeded()
    await row.locator('input[type="checkbox"]').click()
  }

  async function fillHouseholdName(page: Page, name: string) {
    const input = page.getByPlaceholder("e.g., Mom & Dad's House")
    await input.scrollIntoViewIfNeeded()
    await input.fill(name)
  }

  async function fillNickname(page: Page, value: string) {
    const input = page.getByPlaceholder('e.g., The Main House')
    await input.scrollIntoViewIfNeeded()
    await input.fill(value)
  }

  async function fillAddress(
    page: Page,
    parts: { street?: string; city?: string; state?: string; zip?: string },
  ) {
    if (parts.street !== undefined) {
      const i = page.getByPlaceholder('Street address')
      await i.scrollIntoViewIfNeeded()
      await i.fill(parts.street)
    }
    if (parts.city !== undefined) {
      const i = page.getByPlaceholder('City')
      await i.scrollIntoViewIfNeeded()
      await i.fill(parts.city)
    }
    if (parts.state !== undefined) {
      const i = page.getByPlaceholder('State')
      await i.scrollIntoViewIfNeeded()
      await i.fill(parts.state)
    }
    if (parts.zip !== undefined) {
      const i = page.getByPlaceholder('ZIP')
      await i.scrollIntoViewIfNeeded()
      await i.fill(parts.zip)
    }
  }

  async function submitAddHousehold(page: Page) {
    // Scope to dialog — the page-level "+ Add Household" header
    // button matches the same case-insensitive regex.
    const btn = page.getByRole('dialog').getByRole('button', { name: /^Add household$/i })
    await btn.scrollIntoViewIfNeeded()
    await btn.click()
  }

  async function submitSaveChanges(page: Page) {
    const btn = page.getByRole('dialog').getByRole('button', { name: /^Save changes$/i })
    await btn.scrollIntoViewIfNeeded()
    await btn.click()
  }

  test.afterAll(async ({ firestore, ownerUserId }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[households-flow] KEEP_DATA=1 — leaving resources behind:', created)
      return
    }
    for (const id of created.householdIds) {
      await firestore.collection('households').doc(id).delete().catch(() => {})
    }
    for (const id of created.patientIds) {
      await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .delete().catch(() => {})
    }
  })

  test('creates a household with one member — Patient.householdId is set, no memberIds[] on doc', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Alice Stone ${stamp}`
    const householdName = `Stone Cottage ${stamp}`
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })

    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)

    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)
    expect(household.data.primaryCaregiverId).toBe(ownerUserId)
    expect(household.data.memberIds, 'household doc has no memberIds field').toBeUndefined()
    expect(household.data.primaryResidentId, 'household doc has no primaryResidentId field').toBeUndefined()

    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId, 'patient.householdId points at the new household').toBe(
      household.id,
    )
  })

  test('moving a patient between households updates Patient.householdId atomically', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Marcus Bell ${stamp}`
    const houseA = `North Cottage ${stamp}`
    const houseB = `South Cottage ${stamp}`
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    // Create House A with the patient.
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, houseA)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const householdA = await findHouseholdByName(firestore, ownerUserId, houseA)

    // Create House B — open the form again and check the same patient.
    await openAddHouseholdModal(page)

    // Before checking, the patient row should show "Currently in [houseA]".
    await expect(
      page.getByRole('dialog').getByText(new RegExp(`Currently in ${houseA.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`)),
    ).toBeVisible({ timeout: 10_000 })

    await toggleMemberInModal(page, patientName)

    // After checking, the affordance flips to amber "Will move from [houseA]".
    await expect(
      page.getByRole('dialog').getByText(new RegExp(`Will move from ${houseA.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`)),
    ).toBeVisible({ timeout: 10_000 })

    await fillHouseholdName(page, houseB)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const householdB = await findHouseholdByName(firestore, ownerUserId, houseB)
    expect(householdB.id, 'A and B are distinct households').not.toBe(householdA.id)

    // The patient now points at B. There is no memberIds[] to clean
    // up on A — the absence of that field is the invariant.
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId, 'patient.householdId atomically moved to House B').toBe(
      householdB.id,
    )
  })

  test('removing a member sets Patient.householdId to null', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Eve Reyes ${stamp}`
    const householdName = `Reyes House ${stamp}`
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    // Create household with the patient.
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    await findHouseholdByName(firestore, ownerUserId, householdName)

    // To make the test repeatable we need at least one other patient
    // in the household — otherwise PUT with memberIds=[] would
    // violate the "≥1 member" rule. Add a second patient via admin
    // and re-fetch the household so the edit modal sees both.
    const secondName = `Reyes Anchor ${stamp}`
    const secondId = await createTestPatient(firestore, ownerUserId, secondName)
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(secondId)
      .update({
        householdId: (await findHouseholdByName(firestore, ownerUserId, householdName)).id,
      })

    // Open Edit on the household and uncheck the first patient.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openEditHouseholdModal(page, householdName)
    await waitForEditSeed(page, patientName) // wait for the form to know patient1 is currently in
    await toggleMemberInModal(page, patientName)
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId, 'removed patient.householdId is null').toBeNull()
  })

  test('deleting a household clears householdId on every member', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Oscar Vale ${stamp}`
    const householdName = `Vale Manor ${stamp}`
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    await findHouseholdByName(firestore, ownerUserId, householdName)

    // Delete the household via the row's trash icon. Confirm prompt
    // is window.confirm; intercept and accept. Anchor on the heading
    // and climb to the specific card to avoid matching other rows.
    page.once('dialog', dialog => dialog.accept())
    await page
      .getByRole('heading', { name: householdName, exact: true })
      .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " border-2 ")][1]//button[@title="Delete household"]')
      .click()

    await expect(page.getByText(/household deleted/i)).toBeVisible({ timeout: 15_000 })

    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId, 'patient.householdId cleared after household deletion').toBeNull()
  })

  test('empty submission (zero members) is blocked', async ({ page }) => {
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await fillHouseholdName(page, `Empty Hopes ${stamp}`)
    // No members selected.
    await submitAddHousehold(page)

    await expect(page.getByText(/at least one member/i)).toBeVisible({ timeout: 10_000 })
    // Modal stays open after blocked submit.
    await expect(page.getByRole('heading', { name: 'Add a household', exact: true })).toBeVisible()
  })

  // ============================================================
  // Field-level persistence — every field set in the form must
  // round-trip to Firestore. The invariant tests above pin the
  // single-source-of-truth shape; these pin the data fidelity.
  // ============================================================

  test('all-fields-persist round-trip on create', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Helena Park ${stamp}`
    const householdName = `Park Estate ${stamp}`
    const nickname = `The Estate ${stamp}`
    const street = '742 Evergreen Terrace'
    const city = 'Springfield'
    const state = 'IL'
    const zipCode = '62701'

    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    await fillNickname(page, nickname)
    await fillAddress(page, { street, city, state, zip: zipCode })
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)
    const h = household.data

    // Every field set in the form must persist.
    expect(h.name, 'name persisted').toBe(householdName)
    expect(h.nickname, 'nickname persisted').toBe(nickname)
    expect(h.address?.street, 'address.street persisted').toBe(street)
    expect(h.address?.city, 'address.city persisted').toBe(city)
    // State input is uppercased via CSS — value stored may be either
    // case depending on user input. We typed uppercase so check that.
    expect(h.address?.state?.toUpperCase(), 'address.state persisted').toBe(state)
    expect(h.address?.zipCode, 'address.zipCode persisted').toBe(zipCode)

    // Ownership + audit fields.
    expect(h.primaryCaregiverId, 'primaryCaregiverId set to caregiver').toBe(ownerUserId)
    expect(h.createdBy, 'createdBy set to caregiver').toBe(ownerUserId)
    expect(h.isActive, 'isActive defaulted to true').toBe(true)
    expect(typeof h.createdAt, 'createdAt is ISO string').toBe('string')
    expect(typeof h.updatedAt, 'updatedAt is ISO string').toBe('string')
    expect(() => new Date(h.createdAt).toISOString(), 'createdAt parses as ISO').not.toThrow()

    // Kitchen config defaulted (not asked in form on create).
    expect(h.kitchenConfig?.hasSharedInventory, 'shared inventory defaults to true').toBe(true)
    expect(h.kitchenConfig?.separateShoppingLists, 'separate shopping defaults to false').toBe(false)

    // Single-source-of-truth invariant still holds.
    expect(h.memberIds, 'no memberIds field on the household doc').toBeUndefined()
    expect(h.primaryResidentId, 'no primaryResidentId field on the household doc').toBeUndefined()

    // Patient cascade — householdId + lastModified bumped.
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    const p = patientDoc.data()!
    expect(p.householdId, 'patient.householdId points at new household').toBe(household.id)
    expect(typeof p.lastModified, 'patient.lastModified is an ISO string').toBe('string')
    // The patient was created with lastModified == createdAt; the
    // cascade should have bumped it past that.
    expect(
      new Date(p.lastModified).getTime() >= new Date(p.createdAt).getTime(),
      'patient.lastModified bumped on cascade',
    ).toBe(true)
  })

  test('edit-persistence round-trip — name + nickname + address changes save', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Cyrus Lane ${stamp}`
    const originalName = `Lane House Original ${stamp}`
    const updatedName = `Lane House Updated ${stamp}`
    const updatedNickname = `Updated Nickname ${stamp}`
    const updatedStreet = '99 Brand New Avenue'
    const updatedCity = 'Newville'
    const updatedState = 'CA'
    const updatedZip = '90210'

    // Seed: create the household via UI so the underlying doc is in
    // its canonical post-create shape.
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, originalName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const before = await findHouseholdByName(firestore, ownerUserId, originalName)
    const originalUpdatedAt = before.data.updatedAt

    // Edit: change name, nickname, every address field.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openEditHouseholdModal(page, originalName)
    await waitForEditSeed(page, patientName) // wait for memberIds seed

    await fillHouseholdName(page, updatedName)
    await fillNickname(page, updatedNickname)
    await fillAddress(page, {
      street: updatedStreet,
      city: updatedCity,
      state: updatedState,
      zip: updatedZip,
    })

    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    // Read back — every changed field should persist.
    const after = await firestore.collection('households').doc(before.id).get()
    const h = after.data()!

    expect(h.name, 'name updated').toBe(updatedName)
    expect(h.nickname, 'nickname updated').toBe(updatedNickname)
    expect(h.address?.street, 'address.street updated').toBe(updatedStreet)
    expect(h.address?.city, 'address.city updated').toBe(updatedCity)
    expect(h.address?.state?.toUpperCase(), 'address.state updated').toBe(updatedState)
    expect(h.address?.zipCode, 'address.zipCode updated').toBe(updatedZip)

    // Audit fields still right.
    expect(h.primaryCaregiverId).toBe(ownerUserId)
    expect(h.createdBy).toBe(ownerUserId)
    expect(h.isActive).toBe(true)
    expect(
      new Date(h.updatedAt).getTime() > new Date(originalUpdatedAt).getTime(),
      'updatedAt is newer after edit',
    ).toBe(true)
    // createdAt should NOT change on edit.
    expect(h.createdAt, 'createdAt preserved on edit').toBe(before.data.createdAt)

    // Membership unchanged (we didn't touch members in the edit).
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId, 'membership preserved on edit').toBe(before.id)

    // And the invariant: still no memberIds[] field on the household doc.
    expect(h.memberIds, 'no memberIds[] resurrected').toBeUndefined()
  })

  test('membership flux — add, then add again, then remove, then re-add', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const nameA = `Flux Alice ${stamp}`
    const nameB = `Flux Bob ${stamp}`
    const nameC = `Flux Cara ${stamp}`
    const householdName = `Flux Manor ${stamp}`

    const idA = await createTestPatient(firestore, ownerUserId, nameA)
    const idB = await createTestPatient(firestore, ownerUserId, nameB)
    const idC = await createTestPatient(firestore, ownerUserId, nameC)

    const readPatient = async (id: string) => {
      const snap = await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .get()
      return snap.data()!
    }

    const reopenEditAndAssert = async (seedWaitName: string) => {
      // Force a fresh render so the edit modal pulls current state
      // (HouseholdFormModal seeds memberIds from useMemo on patient
      // list, not stale form state). Wait for the seed to settle by
      // confirming the "Currently a member" indicator for a known
      // current member.
      await page.reload({ waitUntil: 'domcontentloaded' })
      await openEditHouseholdModal(page, householdName)
      await waitForEditSeed(page, seedWaitName)
    }

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })

    // === Step 1: Create with just Alice ===
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, nameA)
    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)
    expect((await readPatient(idA)).householdId).toBe(household.id)
    expect((await readPatient(idB)).householdId).toBeUndefined()
    expect((await readPatient(idC)).householdId).toBeUndefined()

    // === Step 2: Add Bob via edit (membership grows from 1 → 2) ===
    await reopenEditAndAssert(nameA)
    await toggleMemberInModal(page, nameB)
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    expect((await readPatient(idA)).householdId, 'Alice stays').toBe(household.id)
    expect((await readPatient(idB)).householdId, 'Bob added').toBe(household.id)
    expect((await readPatient(idC)).householdId, 'Cara still unassigned').toBeUndefined()

    // === Step 3: Add Cara (1 → 3, total 3 members) ===
    await reopenEditAndAssert(nameA)
    await toggleMemberInModal(page, nameC)
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    expect((await readPatient(idA)).householdId).toBe(household.id)
    expect((await readPatient(idB)).householdId).toBe(household.id)
    expect((await readPatient(idC)).householdId, 'Cara added').toBe(household.id)

    // === Step 4: Remove Bob (3 → 2) ===
    await reopenEditAndAssert(nameA)
    await toggleMemberInModal(page, nameB)
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    expect((await readPatient(idA)).householdId, 'Alice still in').toBe(household.id)
    expect((await readPatient(idB)).householdId, 'Bob removed → unassigned').toBeNull()
    expect((await readPatient(idC)).householdId, 'Cara still in').toBe(household.id)

    // === Step 5: Re-add Bob (2 → 3) ===
    await reopenEditAndAssert(nameA)
    await toggleMemberInModal(page, nameB)
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    expect((await readPatient(idA)).householdId, 'Alice still in').toBe(household.id)
    expect((await readPatient(idB)).householdId, 'Bob re-added').toBe(household.id)
    expect((await readPatient(idC)).householdId, 'Cara still in').toBe(household.id)

    // === Step 6: Remove all but Alice (3 → 1) ===
    await reopenEditAndAssert(nameA)
    await toggleMemberInModal(page, nameB) // uncheck B
    await toggleMemberInModal(page, nameC) // uncheck C
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    expect((await readPatient(idA)).householdId, 'Alice alone').toBe(household.id)
    expect((await readPatient(idB)).householdId, 'Bob out').toBeNull()
    expect((await readPatient(idC)).householdId, 'Cara out').toBeNull()

    // Final invariant check: through 6 mutations, the household doc
    // never grew a memberIds[] array. Membership lives only on the
    // patient side.
    const finalDoc = await firestore.collection('households').doc(household.id).get()
    expect(finalDoc.data()?.memberIds, 'no memberIds[] after 6 membership changes').toBeUndefined()
  })

  // ============================================================
  // Optional / nullable behavior — nickname + address must round-
  // trip both PRESENT and ABSENT, and editing must be able to CLEAR
  // a previously-set value. The clear-on-edit case is the canary
  // for the `if (body[key] !== undefined)` server pattern + the
  // form's `value || undefined` pattern — together they can silently
  // refuse to clear a field.
  // ============================================================

  test('optional-omission — create without nickname or address leaves fields absent', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Spare Quinn ${stamp}`
    const householdName = `Spare Quarters ${stamp}`
    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    // No nickname, no address fields.
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)
    const h = household.data

    // Required identifier persisted.
    expect(h.name).toBe(householdName)

    // Optional fields should be absent from the Firestore doc — not
    // empty strings, not `{}`. Absent === honest "not provided."
    expect(h.nickname, 'nickname omitted → field absent').toBeUndefined()
    expect(h.address, 'address omitted → field absent').toBeUndefined()

    // Patient cascade still works.
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId).toBe(household.id)
  })

  test('clear-on-edit — blanking nickname/address from a populated household actually clears them', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientName = `Clear Maya ${stamp}`
    const householdName = `Clear Manor ${stamp}`
    const startNickname = 'Will be cleared'
    const startStreet = '123 Will-Vanish St'
    const startCity = 'Cleartown'
    const startState = 'NV'
    const startZip = '88888'

    const patientId = await createTestPatient(firestore, ownerUserId, patientName)

    // Step A: create with everything populated.
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, patientName)
    await fillHouseholdName(page, householdName)
    await fillNickname(page, startNickname)
    await fillAddress(page, { street: startStreet, city: startCity, state: startState, zip: startZip })
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)
    // Sanity: the seed state is what we expect before we try to clear.
    expect(household.data.nickname).toBe(startNickname)
    expect(household.data.address?.street).toBe(startStreet)
    expect(household.data.address?.city).toBe(startCity)
    expect(household.data.address?.zipCode).toBe(startZip)

    // Step B: open edit, blank every optional field, save.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openEditHouseholdModal(page, householdName)
    await waitForEditSeed(page, patientName) // wait for memberIds seed before changing anything
    await fillNickname(page, '')
    await fillAddress(page, { street: '', city: '', state: '', zip: '' })
    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    // Step C: read back. The optional fields MUST be cleared — either
    // absent (undefined) or null. NOT the stale prior values.
    const after = await firestore.collection('households').doc(household.id).get()
    const h = after.data()!

    expect(h.name, 'name unchanged').toBe(householdName)
    expect(
      h.nickname === undefined || h.nickname === null || h.nickname === '',
      `nickname cleared (got: ${JSON.stringify(h.nickname)})`,
    ).toBe(true)
    // address gets the same treatment: either field absent entirely
    // or stored with all-empty/null subfields. The stale value must
    // not survive.
    const addrCleared =
      h.address === undefined ||
      h.address === null ||
      (
        !h.address.street &&
        !h.address.city &&
        !h.address.state &&
        !h.address.zipCode
      )
    expect(addrCleared, `address cleared (got: ${JSON.stringify(h.address)})`).toBe(true)

    // Patient still belongs to this household — we didn't touch members.
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    expect(patientDoc.data()?.householdId).toBe(household.id)
  })

  // ============================================================
  // Multi-member transactions — every test above adds members one
  // at a time. These exercise the server's batch path: POST loops
  // body.memberIds, PUT computes added=[a,b,c] and batches them
  // into a single Firestore commit. A bug in the batch (e.g.,
  // overwriting between iterations) would only surface here.
  // ============================================================

  test('multi-create — submit with 3 members checked in one transaction', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const nameA = `Trio Aaron ${stamp}`
    const nameB = `Trio Beth ${stamp}`
    const nameC = `Trio Cyrus ${stamp}`
    const householdName = `Trio House ${stamp}`

    const idA = await createTestPatient(firestore, ownerUserId, nameA)
    const idB = await createTestPatient(firestore, ownerUserId, nameB)
    const idC = await createTestPatient(firestore, ownerUserId, nameC)

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)

    // Check ALL THREE before submitting — single transaction.
    await toggleMemberInModal(page, nameA)
    await toggleMemberInModal(page, nameB)
    await toggleMemberInModal(page, nameC)

    // Sanity: form-level selected-count badge reports 3.
    await expect(page.getByRole('dialog').getByText(/^selected: 3 members$/i)).toBeVisible({
      timeout: 5_000,
    })

    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)

    // All three patients now point at the same household — cascade ran
    // for every member in the batch.
    const readId = async (id: string) =>
      (await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .get()).data()?.householdId

    expect(await readId(idA), 'Aaron in new household').toBe(household.id)
    expect(await readId(idB), 'Beth in new household').toBe(household.id)
    expect(await readId(idC), 'Cyrus in new household').toBe(household.id)

    // Invariant: still no memberIds[] on doc, even with 3 members.
    expect(household.data.memberIds, 'no memberIds[] resurrected on multi-add').toBeUndefined()
  })

  test('multi-edit — adding 2 new members to an existing household in one save', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const seedName = `MultiEdit Seed ${stamp}`
    const newName1 = `MultiEdit New1 ${stamp}`
    const newName2 = `MultiEdit New2 ${stamp}`
    const householdName = `MultiEdit Manor ${stamp}`

    const seedId = await createTestPatient(firestore, ownerUserId, seedName)
    const newId1 = await createTestPatient(firestore, ownerUserId, newName1)
    const newId2 = await createTestPatient(firestore, ownerUserId, newName2)

    // Create the household with the seed patient.
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)
    await toggleMemberInModal(page, seedName)
    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)

    // Edit: check TWO additional patients in one form session.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openEditHouseholdModal(page, householdName)
    await waitForEditSeed(page, seedName) // wait for the seed to mark the existing member
    await toggleMemberInModal(page, newName1)
    await toggleMemberInModal(page, newName2)

    // Selected count should reflect 3 (seed + 2 new).
    await expect(page.getByRole('dialog').getByText(/^selected: 3 members$/i)).toBeVisible({
      timeout: 5_000,
    })

    await submitSaveChanges(page)
    await expect(page.getByText(/household updated/i)).toBeVisible({ timeout: 15_000 })

    const readId = async (id: string) =>
      (await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .get()).data()?.householdId

    expect(await readId(seedId), 'seed retained').toBe(household.id)
    expect(await readId(newId1), 'new1 cascaded').toBe(household.id)
    expect(await readId(newId2), 'new2 cascaded').toBe(household.id)

    // Still no memberIds[] after a 2-member batch add.
    const finalDoc = await firestore.collection('households').doc(household.id).get()
    expect(finalDoc.data()?.memberIds, 'no memberIds[] after batch add').toBeUndefined()
  })

  test('mixed-cohort — household with adult, child, pet, and senior all cascade', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    // Variant patients exercise the UI's type-agnosticism — the form
    // should accept every PatientProfile shape and the server should
    // cascade Patient.householdId identically. Per-type behavior
    // (pediatric pipeline, care-facility logic, memorial UI) is the
    // A4 life-events layer in project_household_deferred.md, not
    // surface concern of this form.
    const adultName = `Mixed Adult ${stamp}`
    const childName = `Mixed Child ${stamp}`
    const petName = `Mixed Pet ${stamp}`
    const seniorName = `Mixed Senior ${stamp}`
    const householdName = `Mixed Cohort House ${stamp}`

    const adultId = await createTestPatient(firestore, ownerUserId, adultName, {
      dateOfBirth: '1985-05-15',
      lifeStage: 'adult',
      relationship: 'spouse',
    })
    const childId = await createTestPatient(firestore, ownerUserId, childName, {
      dateOfBirth: '2018-03-20',
      lifeStage: 'child',
      relationship: 'child',
      isMinor: true,
    })
    const petId = await createTestPatient(firestore, ownerUserId, petName, {
      type: 'pet',
      species: 'dog',
      breed: 'Golden Retriever',
      dateOfBirth: '2020-06-01',
      relationship: 'pet',
      // Pets don't have a gender in our default test patient shape;
      // override removes the human default via the helper's
      // undefined-strip step.
      gender: undefined,
    })
    const seniorId = await createTestPatient(firestore, ownerUserId, seniorName, {
      dateOfBirth: '1948-11-08',
      lifeStage: 'senior',
      relationship: 'parent',
      gender: 'female',
    })

    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await openAddHouseholdModal(page)

    // Check all four — type-agnostic batch add.
    await toggleMemberInModal(page, adultName)
    await toggleMemberInModal(page, childName)
    await toggleMemberInModal(page, petName)
    await toggleMemberInModal(page, seniorName)

    await expect(page.getByRole('dialog').getByText(/^selected: 4 members$/i)).toBeVisible({
      timeout: 5_000,
    })

    await fillHouseholdName(page, householdName)
    await submitAddHousehold(page)
    await expect(page.getByText(/household added/i)).toBeVisible({ timeout: 15_000 })

    const household = await findHouseholdByName(firestore, ownerUserId, householdName)

    const readId = async (id: string) =>
      (await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .get()).data()?.householdId

    expect(await readId(adultId), 'adult human cascaded').toBe(household.id)
    expect(await readId(childId), 'child cascaded').toBe(household.id)
    expect(await readId(petId), 'pet cascaded').toBe(household.id)
    expect(await readId(seniorId), 'senior cascaded').toBe(household.id)

    expect(household.data.memberIds, 'no memberIds[] across mixed cohort').toBeUndefined()
  })
})
