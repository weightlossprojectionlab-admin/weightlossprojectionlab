/**
 * Health Records battery — semantic-intent test for Phases B + C + D.
 *
 * Models how a real caregiver uses the Health Records page:
 *   1. Adds several immunizations (vaccine series, multiple shots)
 *   2. Adds several pieces of medical equipment (varied categories)
 *   3. Adds several family-history entries (relatives + conditions)
 *   4. Verifies all of them coexist in the UI at once
 *   5. Verifies every record persisted to Firestore with every field
 *   6. Deletes each one via the per-row affordance and confirms gone
 *      from both UI and Firestore
 *
 * Multi-record coverage catches bugs the single-record tests can't:
 *   - row-targeting regressions (clicking Delete on row N nukes M)
 *   - list-ordering bugs
 *   - stale-cache issues when cards have multiple items
 *   - layout regressions when one card is much longer than the other
 */

import { test, expect } from './fixtures'

interface ImmunizationFixture {
  vaccineName: string
  administeredAt: string
  doseNumber: string
  lotNumber: string
  administeredBy: string
  nextDueAt: string
  notes: string
}

interface EquipmentFixture {
  name: string
  type: string
  manufacturer: string
  model: string
  serialNumber: string
  prescribedBy: string
  acquiredAt: string
  nextMaintenanceAt: string
  notes: string
}

interface FamilyHistoryFixture {
  /** Visible label in the UI (matches the select option text). */
  relationshipLabel: string
  /** Persisted enum value for Firestore. */
  relationshipValue:
    | 'mother'
    | 'father'
    | 'sibling'
    | 'maternal_grandparent'
    | 'paternal_grandparent'
    | 'aunt_uncle'
    | 'child'
    | 'other'
  condition: string
  ageOfOnset: string
  livingStatus: 'unknown' | 'living' | 'deceased'
  causeOfDeath: string
  notes: string
}

test.describe('Health Records — Phase B + C + D battery @battery', () => {
  // Many add+delete round-trips at human pace + cold-compile waits
  // exceed the default 2-minute per-test timeout. Give it 20.
  test.setTimeout(20 * 60_000)

  test('add several immunizations + equipment + family history, verify, delete all', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    const stamp = Date.now()

    const immunizations: ImmunizationFixture[] = [
      {
        vaccineName: `Tetanus-${stamp}-A`,
        administeredAt: '2024-03-12',
        doseNumber: '1',
        lotNumber: `LOT-A-${stamp}`,
        administeredBy: 'Walgreens',
        nextDueAt: '2034-03-12',
        notes: 'Routine 10-year booster',
      },
      {
        vaccineName: `Influenza-${stamp}-B`,
        administeredAt: '2025-10-04',
        doseNumber: '1',
        lotNumber: `LOT-B-${stamp}`,
        administeredBy: 'CVS Pharmacy',
        nextDueAt: '2026-10-04',
        notes: 'Annual flu shot — quadrivalent',
      },
      {
        vaccineName: `MMR-${stamp}-C`,
        administeredAt: '2015-12-04',
        doseNumber: '2',
        lotNumber: `LOT-C-${stamp}`,
        administeredBy: 'Pediatric Associates',
        nextDueAt: '',
        notes: 'Series complete',
      },
    ]

    const equipment: EquipmentFixture[] = [
      {
        name: `CPAP-${stamp}-A`,
        type: 'respiratory',
        manufacturer: 'ResMed',
        model: 'AirSense 11',
        serialNumber: `SN-CPAP-${stamp}`,
        prescribedBy: 'Dr. Patel',
        acquiredAt: '2024-09-01',
        nextMaintenanceAt: '2036-03-01',
        notes: 'Filter monthly',
      },
      {
        name: `Glucose-${stamp}-B`,
        type: 'monitoring',
        manufacturer: 'Dexcom',
        model: 'G7',
        serialNumber: `SN-DX-${stamp}`,
        prescribedBy: 'Dr. Lee',
        acquiredAt: '2025-08-15',
        nextMaintenanceAt: '',
        notes: 'Continuous monitor',
      },
      {
        name: `Walker-${stamp}-C`,
        type: 'mobility',
        manufacturer: 'Drive Medical',
        model: 'Nitro Rollator',
        serialNumber: `SN-WK-${stamp}`,
        prescribedBy: 'Physical Therapy',
        acquiredAt: '2026-02-10',
        nextMaintenanceAt: '2027-02-10',
        notes: 'Adjusted height for daily use',
      },
    ]

    const familyHistory: FamilyHistoryFixture[] = [
      {
        relationshipLabel: 'Mother',
        relationshipValue: 'mother',
        condition: `Breast cancer-${stamp}`,
        ageOfOnset: '52',
        livingStatus: 'living',
        causeOfDeath: '',
        notes: 'In remission since 2024',
      },
      {
        relationshipLabel: 'Father',
        relationshipValue: 'father',
        condition: `Heart disease-${stamp}`,
        ageOfOnset: '60',
        livingStatus: 'deceased',
        causeOfDeath: 'Heart attack',
        notes: 'Two stents at 58',
      },
      {
        relationshipLabel: 'Paternal grandparent',
        relationshipValue: 'paternal_grandparent',
        condition: `Type 2 diabetes-${stamp}`,
        ageOfOnset: '65',
        livingStatus: 'unknown',
        causeOfDeath: '',
        notes: 'Late-onset',
      },
    ]

    // Phase A — set bloodType on the patient profile so the
    // health summary / info aggregates have it. Idempotent merge.
    if (process.env.KEEP_DATA === '1') {
      await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(patientId)
        .set({ bloodType: 'A+' }, { merge: true })
      console.log('[battery] Phase A — bloodType=A+ set on patient profile.')
    }

    await gotoPatientTab('health-records')

    const immunizationsCard = page.locator('div.bg-card', {
      has: page.getByRole('heading', { name: 'Immunizations', exact: true }),
    })
    const equipmentCard = page.locator('div.bg-card', {
      has: page.getByRole('heading', { name: 'Medical Equipment', exact: true }),
    })
    const familyHistoryCard = page.locator('div.bg-card', {
      has: page.getByRole('heading', { name: 'Family Medical History', exact: true }),
    })

    await expect(immunizationsCard).toBeVisible({ timeout: 30_000 })
    await expect(equipmentCard).toBeVisible({ timeout: 10_000 })
    await expect(familyHistoryCard).toBeVisible({ timeout: 10_000 })

    // ============= Add all immunizations =============
    for (const imm of immunizations) {
      await immunizationsCard.getByRole('button', { name: '+ Add', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Add Immunization', exact: true }),
      ).toBeVisible()

      await page.getByLabel('Vaccine *').pressSequentially(imm.vaccineName, { delay: 40 })
      await page.getByLabel('Date administered *').fill(imm.administeredAt)
      await page.getByLabel(/^Dose #/).fill(imm.doseNumber)
      await page.getByLabel(/^Lot #/).fill(imm.lotNumber)
      await page.getByLabel(/^Administered by/).fill(imm.administeredBy)
      if (imm.nextDueAt) await page.getByLabel(/^Next dose due/).fill(imm.nextDueAt)
      await page.getByLabel(/^Notes/).fill(imm.notes)
      await page.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(
        page.getByRole('heading', { name: 'Add Immunization', exact: true }),
      ).not.toBeVisible({ timeout: 60_000 })
      await expect(page.locator('li', { hasText: imm.vaccineName })).toBeVisible({
        timeout: 10_000,
      })
    }

    // ============= Add all equipment =============
    for (const eq of equipment) {
      await equipmentCard.getByRole('button', { name: '+ Add', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Add Medical Equipment', exact: true }),
      ).toBeVisible()

      await page.getByLabel('Device *').pressSequentially(eq.name, { delay: 40 })
      await page.getByLabel(/^Category/).fill(eq.type)
      await page.getByLabel(/^Manufacturer/).fill(eq.manufacturer)
      await page.getByLabel(/^Model/).fill(eq.model)
      await page.getByLabel(/^Serial number/).fill(eq.serialNumber)
      await page.getByLabel(/^Prescribed by/).fill(eq.prescribedBy)
      await page.getByLabel(/^Acquired/).fill(eq.acquiredAt)
      if (eq.nextMaintenanceAt) await page.getByLabel(/^Next maintenance/).fill(eq.nextMaintenanceAt)
      await page.getByLabel(/^Notes/).fill(eq.notes)
      await page.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(
        page.getByRole('heading', { name: 'Add Medical Equipment', exact: true }),
      ).not.toBeVisible({ timeout: 60_000 })
      await expect(page.locator('li', { hasText: eq.name })).toBeVisible({ timeout: 10_000 })
    }

    // ============= Add all family-history entries =============
    for (const fh of familyHistory) {
      await familyHistoryCard.getByRole('button', { name: '+ Add', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: 'Add Family History', exact: true }),
      ).toBeVisible()

      await page.getByLabel('Relative *').selectOption({ label: fh.relationshipLabel })
      await page.getByLabel('Condition *').pressSequentially(fh.condition, { delay: 40 })
      if (fh.ageOfOnset) await page.getByLabel(/^Age of onset/).fill(fh.ageOfOnset)
      if (fh.livingStatus !== 'unknown') {
        await page
          .getByLabel(/^Living status/)
          .selectOption(fh.livingStatus === 'living' ? 'living' : 'deceased')
      }
      if (fh.livingStatus === 'deceased' && fh.causeOfDeath) {
        await page.getByLabel(/^Cause of death/).fill(fh.causeOfDeath)
      }
      await page.getByLabel(/^Notes/).fill(fh.notes)
      await page.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(
        page.getByRole('heading', { name: 'Add Family History', exact: true }),
      ).not.toBeVisible({ timeout: 60_000 })
      await expect(page.locator('li', { hasText: fh.condition })).toBeVisible({ timeout: 10_000 })
    }

    // ============= Coexistence: every row visible at once =============
    for (const imm of immunizations) {
      await expect(page.locator('li', { hasText: imm.vaccineName })).toBeVisible()
    }
    for (const eq of equipment) {
      await expect(page.locator('li', { hasText: eq.name })).toBeVisible()
    }
    for (const fh of familyHistory) {
      await expect(page.locator('li', { hasText: fh.condition })).toBeVisible()
    }

    // ============= Firestore persistence =============
    const immunizationsCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('immunizations')
    const equipmentCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('equipment')
    const familyHistoryCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('family-history')

    const persistedDocIds: { immunizations: string[]; equipment: string[]; familyHistory: string[] } = {
      immunizations: [],
      equipment: [],
      familyHistory: [],
    }

    for (const imm of immunizations) {
      const snap = await immunizationsCol.where('vaccineName', '==', imm.vaccineName).get()
      expect(snap.size, `one Firestore doc for ${imm.vaccineName}`).toBe(1)
      const data = snap.docs[0].data()
      expect(data.administeredAt).toBe(imm.administeredAt)
      expect(data.doseNumber).toBe(parseInt(imm.doseNumber, 10))
      expect(data.lotNumber).toBe(imm.lotNumber)
      expect(data.administeredBy).toBe(imm.administeredBy)
      if (imm.nextDueAt) expect(data.nextDueAt).toBe(imm.nextDueAt)
      expect(data.notes).toBe(imm.notes)
      persistedDocIds.immunizations.push(snap.docs[0].id)
    }

    for (const eq of equipment) {
      const snap = await equipmentCol.where('name', '==', eq.name).get()
      expect(snap.size, `one Firestore doc for ${eq.name}`).toBe(1)
      const data = snap.docs[0].data()
      expect(data.type).toBe(eq.type)
      expect(data.manufacturer).toBe(eq.manufacturer)
      expect(data.model).toBe(eq.model)
      expect(data.serialNumber).toBe(eq.serialNumber)
      expect(data.prescribedBy).toBe(eq.prescribedBy)
      expect(data.acquiredAt).toBe(eq.acquiredAt)
      if (eq.nextMaintenanceAt) expect(data.nextMaintenanceAt).toBe(eq.nextMaintenanceAt)
      expect(data.notes).toBe(eq.notes)
      persistedDocIds.equipment.push(snap.docs[0].id)
    }

    for (const fh of familyHistory) {
      const snap = await familyHistoryCol.where('condition', '==', fh.condition).get()
      expect(snap.size, `one Firestore doc for ${fh.condition}`).toBe(1)
      const data = snap.docs[0].data()
      expect(data.relativeRelationship).toBe(fh.relationshipValue)
      expect(data.condition).toBe(fh.condition)
      if (fh.ageOfOnset) expect(data.ageOfOnset).toBe(parseInt(fh.ageOfOnset, 10))
      if (fh.livingStatus === 'living') expect(data.isLiving).toBe(true)
      if (fh.livingStatus === 'deceased') {
        expect(data.isLiving).toBe(false)
        if (fh.causeOfDeath) expect(data.causeOfDeath).toBe(fh.causeOfDeath)
      }
      expect(data.notes).toBe(fh.notes)
      persistedDocIds.familyHistory.push(snap.docs[0].id)
    }

    // ============= Delete everything (unless KEEP_DATA=1) =============
    // KEEP_DATA=1 lets the test seed records and walk away, so the
    // human can inspect downstream surfaces (health summary, info
    // tab aggregates) that consume these records.
    if (process.env.KEEP_DATA === '1') {
      console.log('[battery] KEEP_DATA=1 — skipping deletes; seeded records remain in Firestore.')
    } else {
      for (const imm of immunizations) {
        const row = page.locator('li', { hasText: imm.vaccineName })
        await row.getByRole('button', { name: /^delete/i }).click()
        await page.getByRole('button', { name: 'Remove', exact: true }).click()
        await expect(page.getByText(imm.vaccineName, { exact: false })).toHaveCount(0, {
          timeout: 60_000,
        })
      }
      for (const eq of equipment) {
        const row = page.locator('li', { hasText: eq.name })
        await row.getByRole('button', { name: /^delete/i }).click()
        await page.getByRole('button', { name: 'Remove', exact: true }).click()
        await expect(page.getByText(eq.name, { exact: false })).toHaveCount(0, {
          timeout: 60_000,
        })
      }
      for (const fh of familyHistory) {
        const row = page.locator('li', { hasText: fh.condition })
        await row.getByRole('button', { name: /^delete/i }).click()
        await page.getByRole('button', { name: 'Remove', exact: true }).click()
        await expect(page.getByText(fh.condition, { exact: false })).toHaveCount(0, {
          timeout: 60_000,
        })
      }

      // ============= Firestore cleanup verified =============
      for (const id of persistedDocIds.immunizations) {
        const doc = await immunizationsCol.doc(id).get()
        expect(doc.exists, `immunization ${id} removed from Firestore`).toBe(false)
      }
      for (const id of persistedDocIds.equipment) {
        const doc = await equipmentCol.doc(id).get()
        expect(doc.exists, `equipment ${id} removed from Firestore`).toBe(false)
      }
      for (const id of persistedDocIds.familyHistory) {
        const doc = await familyHistoryCol.doc(id).get()
        expect(doc.exists, `family history ${id} removed from Firestore`).toBe(false)
      }
    }

    if (process.env.KEEP_OPEN !== '0') {
      await page.pause()
    }
  })
})
