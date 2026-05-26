# Medication label fixtures

Drop prescription label images here and the opt-in integration spec
[`e2e/profile-medication-scan-integration.spec.ts`](../../profile-medication-scan-integration.spec.ts)
will create one test case per image at run time.

## Contract

- **File types:** `.jpg`, `.jpeg`, `.png`, `.webp` (case-insensitive)
- **Naming:** descriptive filenames help failing-test triage. Convention:
  `{pharmacy}-{medication}-{layout}.{ext}`, e.g.
  - `cvs-lovastatin-bottle.jpg`
  - `cvs-pantoprazole-bottle.jpg`
  - `amber-tacrolimus-bottle.png`
  - `cvs-ketorolac-info-sheet.jpg`
- **Resolution:** any size, but bear in mind larger images mean larger
  base64 payloads which mean larger Gemini token bills. ~1500–2000px on
  the longest edge is a reasonable upper bound.
- **Source guidance:**
  - **Preferred — stock / sample images with synthetic data**
    (e.g. pharmacy-template demo labels with `Jane Doe` / `Test
    Doctor` placeholders). These commit to the repo as-is. No PHI
    concerns, and the layouts/fonts/photography quality already
    match real-world labels because they ARE real label templates
    populated with fake names.
  - **Acceptable — real labels you photographed yourself, with
    explicit consent.** Redact patient names, prescriber names,
    NDC, Rx#, and addresses with an image editor BEFORE adding.
    Note that re-photographing after marker-redaction often
    introduces angle/glare artifacts that make the test image
    different from real production scans — prefer the stock path.
  - **Not OK — unredacted real-patient labels.** These would
    commit PHI to git history. Don't.

## What the test does with each fixture

For each image found in this directory:

1. Loads `/profile`, opens the Medications section, clicks the scan
   button.
2. Uploads the fixture as the front photo.
3. Submits via "Skip — only front available."
4. Calls the **real Gemini** OCR pipeline (no mock — that's the point
   of the integration spec).
5. Waits up to 30s for the `MedicationReviewModal` to open.
6. Reads the extracted fields out of the modal's inputs.
7. Logs the extracted result so a human can spot-check for
   confabulation, missed fields, or layout-specific drift.
8. **Cancels the review modal** so the medication is NOT saved (the
   test must not pollute the test account's medications list).

The spec asserts the extraction returned *something* (medication name
non-empty, modal opened, no uncaught errors). It does NOT assert
specific values — Gemini output is non-deterministic and asserting
exact strings would create flaky tests.

## Running

```sh
# Skipped by default in regular test runs:
npx playwright test e2e/profile-medication-scan-integration.spec.ts

# Opt in to actually call real Gemini:
RUN_OCR_INTEGRATION=1 npx playwright test e2e/profile-medication-scan-integration.spec.ts
```

PowerShell:

```powershell
$env:RUN_OCR_INTEGRATION="1"; npx playwright test e2e/profile-medication-scan-integration.spec.ts
```

## Why opt-in

Real Gemini calls cost money, are slow (10–30s each), and produce
non-deterministic output. CI should not pay that bill on every push.
The mocked counterpart at
[`e2e/profile-medication-scan.spec.ts`](../../profile-medication-scan.spec.ts)
catches the UX regression class (stuck spinners, missing toasts,
modal-close bugs, Tesseract sneaking back in) using fixture-free
inline buffers. This integration spec catches the *prompt* regression
class (missed `patientName`, garbled NDC, info-sheet layout drift, a
new Gemini config bug) — and only when you ask for it.

See `feedback_gemini_2_5_flash_gotchas` in memory for the failure
modes this catches.
