/**
 * Direct-upload OCR test — bypasses the camera, phone, and Phase 0j
 * pipeline entirely. Renders a synthetic receipt HTML page to a clean
 * PNG via headless Playwright, then POSTs it to the dev server's
 * /api/ocr/receipt with the same knownItems cart context that the
 * in-store flow would pass. Use this to isolate "is Gemini + the
 * prompt working on a pristine image?" from "is the phone camera
 * the bottleneck?"
 *
 * Run:
 *   npm run dev    (in another terminal; needs the dev server running)
 *   npx tsx scripts/test-receipt-ocr-direct.ts                       # default sprouts-receipt-38
 *   npx tsx scripts/test-receipt-ocr-direct.ts sprouts-receipt-379   # try the long one
 *   npx tsx scripts/test-receipt-ocr-direct.ts sprouts-receipt-584   # try the longest
 *
 * Reads:
 *   .env.local for FIREBASE service account + NEXT_PUBLIC_FIREBASE_API_KEY
 *
 * Writes:
 *   $TEMP/test-receipt-rendered.png (the rendered receipt — saved so
 *   you can visually verify it looks right before blaming Gemini)
 */

import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Dev server uses a self-signed HTTPS cert via --experimental-https.
// Node's fetch + Playwright would otherwise refuse the connection.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const DEV_BASE = 'https://localhost:3003'
const TARGET_USER_ID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
// Accept the receipt slug as the first CLI argument; default to the
// small ($38) Sprouts receipt. Stripping any '.html' suffix the user
// might paste so both forms work: `sprouts-receipt-379` or `sprouts-receipt-379.html`.
const RECEIPT_SLUG = (process.argv[2] ?? 'sprouts-receipt-38').replace(/\.html$/i, '')
const RECEIPT_URL = `${DEV_BASE}/${RECEIPT_SLUG}.html`
const OCR_URL = `${DEV_BASE}/api/ocr/receipt`

// Mirrors scripts/seed-test-shopping-list.ts so the receipt's UPCs
// match what the cart claims to have.
const KNOWN_ITEMS = [
  { name: 'Toasted Whole Grain Oat Cereal',        upc: '016000275645',   quantity: 1 },
  { name: 'Sweetened Condensed Milk',              upc: '078742433042',   quantity: 1 },
  { name: 'Large Eggs',                            upc: '021130049134',   quantity: 1 },
  { name: 'Avocado',                               upc: '767119318395',   quantity: 2 },
  { name: 'Aussie Smooth Whole Milk Yogurt 32oz',  upc: '00795709020021', quantity: 1 },
  { name: 'Chocolate Peanut Butter Yogurt Raisins', upc: '00041143090541', quantity: 1 },
]

async function renderReceiptToPng(): Promise<Buffer> {
  console.log(`\n[1/4] Rendering ${RECEIPT_URL} to PNG via Playwright...`)
  const playwright = await import('playwright')
  const browser = await playwright.chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: 480, height: 1400 },
      deviceScaleFactor: 2,           // 2x = sharper text, closer to what a real receipt photo of a 1440-tall phone would have
      ignoreHTTPSErrors: true,        // dev server's self-signed cert
    })
    const page = await context.newPage()
    await page.goto(RECEIPT_URL, { waitUntil: 'networkidle', timeout: 15000 })
    const receipt = await page.$('.receipt')
    if (!receipt) throw new Error('Could not find .receipt element on the page')
    const png = await receipt.screenshot({ type: 'png' })
    const outPath = path.join(process.env.TEMP ?? '.', 'test-receipt-rendered.png')
    fs.writeFileSync(outPath, png)
    console.log(`      ✓ ${png.length.toLocaleString()} bytes (saved to ${outPath} for visual verification)`)
    return png
  } finally {
    await browser.close()
  }
}

async function mintIdToken(): Promise<string> {
  console.log(`\n[2/4] Minting Firebase ID token for ${TARGET_USER_ID}...`)
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')

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

  const customToken = await getAuth(getApp()).createCustomToken(TARGET_USER_ID)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY missing from .env.local')

  // Exchange custom token → ID token via Identity Toolkit REST.
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Custom-token exchange failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { idToken?: string }
  if (!data.idToken) throw new Error('No idToken in custom-token exchange response')
  console.log('      ✓ ID token minted')
  return data.idToken
}

async function postToOcr(pngBuffer: Buffer, idToken: string): Promise<unknown> {
  console.log(`\n[3/4] POSTing PNG (${pngBuffer.length.toLocaleString()} bytes) to ${OCR_URL}...`)
  const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`
  const t0 = Date.now()
  const res = await fetch(OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      images: [dataUrl],
      correctedFlags: [false],
      // Direct-upload tag so the route log distinguishes this from
      // real phone-captured runs.
      failureReasons: ['direct-upload-test'],
      knownItems: KNOWN_ITEMS,
    }),
  })
  const dt = Date.now() - t0
  console.log(`      ← HTTP ${res.status} in ${(dt / 1000).toFixed(1)}s`)
  const body = await res.json()
  return body
}

async function main() {
  const png = await renderReceiptToPng()
  const idToken = await mintIdToken()
  const result = (await postToOcr(png, idToken)) as {
    success?: boolean
    data?: {
      store?: string | null
      storeAddress?: string | null
      storePhone?: string | null
      date?: string | null
      items?: Array<{
        rawName: string
        normalizedName?: string | null
        upc?: string | null
        quantity?: number | null
        unitPriceCents?: number | null
        totalPriceCents?: number | null
      }>
      subtotalCents?: number | null
      taxCents?: number | null
      totalCents?: number | null
      confidence?: number
    }
    error?: string
    details?: string
  }

  console.log('\n[4/4] Response:\n')
  console.log(JSON.stringify(result, null, 2))

  // Quick verdict against ground truth.
  if (result.success && result.data) {
    const d = result.data
    console.log('\n=== VERDICT ===')
    console.log(`store:        ${d.store === 'SPROUTS FARMERS MARKET' ? '✓' : '✗'} ${d.store}`)
    console.log(`storeAddress: ${d.storeAddress?.includes('Cliffwood') ? '✓' : '✗'} ${d.storeAddress}`)
    console.log(`storePhone:   ${d.storePhone?.replace(/\D/g, '').includes('7325542076') ? '✓' : '✗'} ${d.storePhone}`)
    console.log(`totalCents:   ${d.totalCents === 3871 ? '✓' : '✗'} ${d.totalCents} (expected 3871)`)
    console.log(`itemCount:    ${d.items?.length === 8 ? '✓' : '✗'} ${d.items?.length} (expected 8: 6 cart + 2 impulse)`)

    const matchedByUpc = (d.items ?? []).filter((it) =>
      KNOWN_ITEMS.some((k) => k.upc === (it.upc ?? '').replace(/^0+/, '').padStart(12, '0') ||
                              k.upc === it.upc),
    )
    console.log(`UPC matches:  ${matchedByUpc.length} / 6 cart items`)
    console.log('')
    if (d.items?.length) {
      console.log('Items extracted:')
      for (const it of d.items) {
        console.log(`  ${(it.rawName || '').padEnd(22)} ${(it.upc ?? '').padEnd(15)} ${it.totalPriceCents ?? '-'}c`)
      }
    }
  }
}

main().catch((err) => {
  console.error('\n[FAIL]', err)
  process.exit(1)
})
