/**
 * Regression test for the stuck-spinner bug on the Recent Documents
 * card.
 *
 * Symptom: a document is uploaded; OCR completes server-side and
 * Firestore reflects ocrStatus='completed' with extractedText set;
 * but the Recent Documents card on the patient page never refreshes
 * and the "Processing document..." spinner spins forever until the
 * user manually reloads.
 *
 * Root cause (pre-fix): /patients/[id]/page.tsx fetches documents
 * once on mount via fetchDocuments() and only re-fetches on a few
 * imperative events (after upload, after delete, after the manual
 * "Stop" button). It never subscribes to Firestore changes, so the
 * async OCR completion that happens server-side after upload is
 * invisible to the open page.
 *
 * Test approach: deterministic + cheap, no real Gemini call.
 *   1. Use Admin SDK to seed a document with ocrStatus='processing'
 *   2. Open the patient page; assert the spinner is visible (initial
 *      state correct)
 *   3. Use Admin SDK to flip ocrStatus → 'completed' (simulates the
 *      server-side OCR finishing)
 *   4. Assert the spinner disappears WITHOUT a manual reload, within
 *      a reasonable timeout. The page must be observing Firestore
 *      changes for this to pass.
 *   5. Cleanup: delete the seeded doc.
 *
 * This test FAILS on the pre-fix codebase (no listener) and PASSES
 * once the page subscribes to the documents subcollection.
 */

import { test, expect } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

test.describe('Recent Documents — OCR status auto-updates @bug-fix', () => {
  // Cold-compile + 90s wait for ocrStatus to transition. Generous.
  test.setTimeout(5 * 60_000)

  test('spinner clears automatically when ocrStatus flips to completed', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    const stamp = Date.now()
    const documentId = uuidv4()
    const documentName = `OCR-Status-Test-${stamp}`
    const docsCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('documents')

    const now = new Date().toISOString()
    await docsCol.doc(documentId).set({
      id: documentId,
      patientId,
      userId: ownerUserId,
      name: documentName,
      category: 'insurance',
      fileType: 'image',
      url: 'https://example.com/fake-image.jpg', // never actually fetched in this test
      uploadedAt: now,
      ocrStatus: 'processing',
      uploadedBy: ownerUserId,
    })

    try {
      // Land on the Info tab so Recent Documents is visible. The
      // sidebar Recent Documents widget is on the patient overview.
      await gotoPatientTab('info')

      // The seeded doc should appear in the Recent Documents card.
      // Heading anchors the section.
      await expect(
        page.getByRole('heading', { name: 'Recent Documents', level: 3 }),
      ).toBeVisible({ timeout: 30_000 })

      // The doc's name should be visible in the card.
      const docCard = page.locator('div', { hasText: documentName }).first()
      await expect(docCard).toBeVisible({ timeout: 30_000 })

      // Initial state: spinner visible (ocrStatus='processing').
      await expect(page.getByText('Processing document...')).toBeVisible({
        timeout: 10_000,
      })

      // Now simulate OCR completing on the server side.
      await docsCol.doc(documentId).update({
        ocrStatus: 'completed',
        extractedText: 'simulated OCR result',
        'metadata.ocrProcessedAt': new Date().toISOString(),
        'metadata.confidence': 95,
        'metadata.textLength': 21,
      })

      // The fix: the page must observe this Firestore change and
      // re-render without the spinner. Generous timeout because a
      // listener fires near-immediately but UI re-render + the
      // animation of the spinner-removal can lag.
      await expect(page.getByText('Processing document...')).toBeHidden({
        timeout: 30_000,
      })
    } finally {
      // Cleanup: delete the seeded doc so reruns don't pile up.
      await docsCol.doc(documentId).delete().catch(() => {})
    }
  })
})
