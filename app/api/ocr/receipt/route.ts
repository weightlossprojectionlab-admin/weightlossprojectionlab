import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { ReceiptOCRResponseSchema } from '@/lib/validations/receipt-ocr'

// Long receipts (Costco, Sam's, multi-section captures) can take Gemini
// 20-40s. Match the medication route's headroom.
export const maxDuration = 60

/**
 * POST /api/ocr/receipt
 *
 * Server-side receipt OCR via Gemini Vision. Accepts an array of base64
 * data URLs (one per receipt section the user captured) and returns
 * a structured list of line items + totals + store/date.
 *
 * The shopping-trip apply flow consumes this — items are matched against
 * the trip's `found` list to backfill purchasePriceCents on inventory
 * rows. Receipt-only items (impulse buys at the register) are surfaced
 * to the user for an "add to inventory?" prompt.
 *
 * Auth + Gemini setup mirrors /api/ocr/medication. The prompt is the
 * primary divergence.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      userId = decodedToken.uid
    } catch (authError) {
      logger.error('[Receipt OCR] Auth failed', authError as Error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { images, correctedFlags, knownItems, failureReasons } = body as {
      images?: string[]
      correctedFlags?: boolean[]
      knownItems?: Array<{ name: string; upc?: string | null; quantity?: number | null }>
      failureReasons?: Array<string | null | undefined>
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'images[] is required (array of base64 data URLs).' },
        { status: 400 }
      )
    }
    // Reconciliation context: when the caller provides the user's
    // already-scanned cart (in-store flow), Gemini's job changes from
    // cold-OCR-everything to match-prices-and-flag-extras — much less
    // hallucination surface because item names come from UPC catalog
    // lookups, not from re-reading cryptic abbreviations. When absent
    // (PO / retroactive flow — user didn't shop with the app), the
    // route falls back to the cold-OCR prompt.
    const hasKnownItems =
      Array.isArray(knownItems) && knownItems.length > 0 &&
      knownItems.every((k) => typeof k?.name === 'string' && k.name.length > 0)
    const safeKnownItems = hasKnownItems ? knownItems! : null
    // Phase 0j telemetry: how many of the captured frames had jscanify
    // perspective correction applied vs. silently fell back to raw.
    // Helps us correlate Gemini behavior (esp. address hallucination)
    // with whether the geometry was actually fixed. Absent on older
    // clients — log as `unknown` in that case.
    const correctedCount = Array.isArray(correctedFlags)
      ? correctedFlags.filter(Boolean).length
      : null

    // Aggregate the per-frame failure reasons into a tag → count map so
    // the log line is short and scannable. Without this, with N=6
    // captures every scan would have ~6 lines of reason strings; with
    // this we see `{ 'no-contour': 6 }` at a glance.
    const failureReasonCounts: Record<string, number> | null = (() => {
      if (!Array.isArray(failureReasons) || failureReasons.length === 0) return null
      const counts: Record<string, number> = {}
      for (const r of failureReasons) {
        if (typeof r !== 'string' || r.length === 0) continue
        counts[r] = (counts[r] ?? 0) + 1
      }
      return Object.keys(counts).length > 0 ? counts : null
    })()
    if (images.length > 12) {
      return NextResponse.json(
        { error: 'Too many images. Cap is 12 per receipt — re-capture a longer receipt in fewer wider sections.' },
        { status: 400 }
      )
    }
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image. Each entry must be a base64 image data URL.' },
          { status: 400 }
        )
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      logger.error('[Receipt OCR] GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OCR service not configured' },
        { status: 500 }
      )
    }

    logger.info('[Receipt OCR] Processing receipt', {
      userId,
      imageCount: images.length,
      correctedCount,
      knownItemCount: safeKnownItems?.length ?? 0,
      failureReasonCounts,
    })

    const imageParts = images.map((img) => {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, '')
      const mimeType = img.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'
      return {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      }
    })

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // The legacy @google/generative-ai SDK doesn't type
      // thinkingConfig, but it forwards generationConfig as-is to the
      // REST API, which DOES honor thinkingBudget. Without this, 2.5
      // Flash dynamically allocates thinking tokens out of the same
      // maxOutputTokens pool — at 16384 we observed 67s renders that
      // STILL truncated mid-items[] because thinking consumed most of
      // the budget. thinkingBudget: 0 disables thinking entirely;
      // receipt OCR is transcription, not reasoning, so we don't need
      // it. Migrating to @google/genai (the new unified SDK) would
      // expose this property properly; this cast is the bridge until
      // that migration happens.
      generationConfig: {
        // Higher than the usual structured-extraction default (0.2)
        // on purpose: Gemini 2.5 Flash at temperature 0.2 + a field
        // asking for a long digit string (transactionCode) + zeros
        // visible elsewhere on the receipt (AID fields etc.) caused a
        // degenerate generation loop — the model latched onto "0" and
        // emitted it until maxOutputTokens, blowing JSON parse with
        // "Unterminated string". responseMimeType: 'application/json'
        // enforces structure independently, so temperature is free to
        // do its actual job — token-level diversity that prevents
        // loops. 0.4 is in the production OCR-pipeline range.
        temperature: 0.4,
        topK: 32,
        topP: 1,
        // Long receipts can produce 8k+ tokens of JSON. 16384 covers
        // the multi-section Costco case with headroom; well below the
        // model's 65536 ceiling. Combined with thinkingBudget:0, this
        // means the full budget goes to actual JSON.
        maxOutputTokens: 16384,
        // Gemini 2.5 Flash thinks-out-loud by default — without this,
        // response.text() returns the model's planning preamble
        // ("The user wants to extract structured JSON...") concatenated
        // with the JSON, and the JSON.parse below blows up. Constraining
        // the response MIME type to JSON suppresses the thinking prefix
        // and gives us a parseable payload.
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    })

    const sectionsHeader =
      images.length > 1
        ? `You are looking at ${images.length} sequential photos of ONE printed receipt — the user captured it in sections because it's long. Stitch the line items together IN ORDER (image 1 first, image 2 next, etc.). If a single line is split across two photos, deduplicate it; do not double-count.`
        : `You are looking at ONE photo of a printed receipt.`

    // Cart-context block — only when the caller passed knownItems
    // (in-store flow with a scanned cart). Reframes the task: instead
    // of reading items from scratch (where Gemini hallucinates from
    // cryptic abbreviations), it matches PRINTED LINES to user-scanned
    // KNOWN ITEMS by name proximity / UPC equality, extracts the
    // price, and flags any printed lines that don't match. Much less
    // hallucination surface — the items are authoritative ground
    // truth from the user's UPC scans, not Gemini's interpretation.
    const cartContextBlock = safeKnownItems
      ? `

THE USER ALREADY SCANNED THEIR CART IN-STORE. Here is the list of items they confirmed putting in their cart, with UPCs where they were captured. These are GROUND TRUTH — the names below come from UPC-based catalog lookups, not from reading the receipt. Your job is to MATCH each printed receipt line to an entry in this list and extract the price. Do NOT invent item names; use the printed receipt text only to find the matching cart entry by fuzzy name proximity or UPC equality.

User's cart (${safeKnownItems.length} item${safeKnownItems.length === 1 ? '' : 's'}):
${safeKnownItems
          .map(
            (k, idx) =>
              `  ${idx + 1}. ${k.name}${k.upc ? ` [UPC: ${k.upc}]` : ''}${
                typeof k.quantity === 'number' && k.quantity > 0 ? ` × ${k.quantity}` : ''
              }`,
          )
          .join('\n')}

For each printed receipt line:
  - If it matches a cart item (by UPC if the receipt prints one, otherwise by name proximity — abbreviations like "GV WHL MILK 1G" should match cart entries like "Great Value Whole Milk 1 Gallon"), emit it in items[] with rawName = printed text, normalizedName = the cart-list name (verbatim), upc = printed UPC if any, totalPriceCents = the printed price.
  - If you cannot confidently match it to ANY cart item, STILL emit it in items[] with normalizedName = null — the downstream review screen will surface it to the user as "extra / impulse buy."
  - Do NOT fabricate cart items that aren't in the list above. The cart list is authoritative.
`
      : ''

    const prompt = `${sectionsHeader}${cartContextBlock}

Extract the receipt as STRUCTURED JSON. Return ONLY valid JSON (no markdown, no code blocks, no commentary) with this exact structure:

{
  "store": "merchant name from the receipt header (e.g., 'Costco', 'Walmart', 'Whole Foods'). null if not visible.",
  "storeAddress": "physical address of the store EXACTLY AS PRINTED on this specific receipt (e.g., '478 Clubhouse Dr, Middletown, NJ 07748' or '101 Main St'). Combine multi-line address into one string preserving the printed order. null if the address text is not visible or you cannot read every line with confidence.",
  "storePhone": "store phone number as printed on the receipt (e.g., '(732) 554-2076' or '732-554-2076'). Keep the formatting the receipt uses. null if not visible.",
  "storeHours": "store hours as printed on the receipt (e.g., 'Mon-Sun 6am-11pm', 'Open 24 Hours', '7-10 Daily'). null if not visible.",
  "transactionCode": "the transaction code / receipt reference printed near the receipt-level barcode at the bottom (Walmart labels it 'TC#' followed by 4-5 groups of digits like '5020 4127 6951 9320 2400'; Costco prints similar; ShopRite uses 'Reference:' followed by a long number). Concatenate all digit groups into one space-separated string EXACTLY as printed. null if not visible. DIFFERENT from the per-line UPCs — this is the receipt-level barcode, usually one per receipt at the bottom.",
  "date": "transaction date as printed (any format — '2026-05-07', '05/07/26', 'May 7, 2026'). null if not visible.",
  "items": [
    {
      "rawName": "the exact text printed on the line (e.g., 'GV WHL MILK 1G', 'KS BANANA 3LB')",
      "normalizedName": "your best-guess clean product name (e.g., 'Great Value Whole Milk 1 Gallon', 'Kirkland Signature Banana 3lb'). null if you can't expand abbreviations confidently.",
      "upc": "the UPC / EAN / GTIN printed next to the product name on the same line (12 or 13 digits, e.g. '084099774460'). Walmart and most grocery chains print this between the product name and the price. Return as a STRING of digits only, no spaces or dashes. null if not visible on this line.",
      "quantity": numeric unit count if printed (e.g., 2 for '2 @ 3.49'); otherwise null,
      "unitPriceCents": per-unit price in INTEGER CENTS (349 for $3.49). null when only a line total is printed.,
      "totalPriceCents": line total in INTEGER CENTS (698 for $6.98). null if not visible.
    }
  ],
  "subtotalCents": subtotal in cents, null if not printed,
  "taxCents": tax total in cents, null if not printed,
  "totalCents": grand total in cents, null if not printed,
  "confidence": YOUR self-rating 0-100 of how cleanly you read this receipt (account for blur, glare, faded thermal print, handwriting)
}

CRITICAL RULES:

**DO NOT GUESS THE STORE ADDRESS.** This is the most important rule. You know many real store addresses for major chains (Sprouts, Costco, Walmart, etc.) from your training data — DO NOT use that knowledge here. Return ONLY what you can read on THIS receipt's printed pixels, character-by-character. If the printed address is blurry, cut off, partially obscured, or you can't read every line clearly, return null — DO NOT fill in a plausible-looking address from memory. A null address is FAR more useful than a fabricated one because downstream code can look up the canonical address from storePhone or transactionCode; a fabricated address poisons that pipeline. Cross-check: if the ZIP code you read doesn't match the state you read (e.g. "Tampa FL 07721" — 07721 is a NJ ZIP), at least one is wrong and you should return null rather than guess which.

**Prices are CENTS, not dollars.** $3.49 = 349. $11.00 = 1100. $0.79 = 79. NEVER return decimal numbers for any *Cents field.

**Skip non-product lines from items[]:**
  - Skip header/footer junk: cashier ID, register #, "Thank you", "Member savings"
  - The store ADDRESS and HOURS belong in their own fields (storeAddress, storeHours) — do NOT skip them, do NOT put them in items[].
  - The receipt-level transaction code (TC#, Reference) belongs in transactionCode — do NOT put it in items[].
  - Skip subtotal/tax/total LINES (those go into subtotalCents/taxCents/totalCents fields)
  - Skip discount/coupon lines that are NOT a separate product:
    • "INSTANT SAVINGS -$2.00 on prior line"
    • "On Sale You Saved 1.00" (ShopRite pattern — savings annotation under the prior item line, NOT a separate item)
    • "Member Savings", "Coupon", "Manufacturer Coupon"
  - Each entry in items[] must represent one product the customer took home

**UPC extraction is high-leverage:**
  - When you see a digit string next to a product name (e.g. "SHOE MAT 843624126510 6.24"), the digits ARE the UPC. Capture them — downstream code looks up the canonical product in our catalog using this number, which fixes the cases where the printed name is a cryptic abbreviation you couldn't expand.
  - Strip spaces / dashes from the digit string; return only the digits.
  - If you're uncertain whether a digit string is a UPC vs. a quantity vs. some other number: UPCs are 12 or 13 digits (sometimes 8 for UPC-E or 14 for GTIN). Quantities are 1-3 digits. Long numeric strings between the name and the price ARE the UPC.

**Multi-quantity lines** (e.g., "BANANA 3 @ 0.79  2.37"):
  - quantity: 3
  - unitPriceCents: 79
  - totalPriceCents: 237

**Weighed items** (e.g., "1.42 LB @ 2.99/LB  4.25"):
  - rawName includes the weight as printed
  - quantity: null (it's a weight, not unit count)
  - unitPriceCents: null (price-per-pound is not a per-unit price)
  - totalPriceCents: 425

**Negative lines** (refunds, member discounts attached to a line): ignore unless they're their own product line — receipts vary, use judgment.

**rawName quality matters** — keep the cryptic abbreviations. Downstream code matches these against the user's shopping list, so 'GV WHL MILK 1G' is more useful than 'Milk' when GV stocks differently from store-brand milk.

**Confidence** — be honest. Faded thermal paper, glare, blur, partial captures, mid-receipt text cuts: drop confidence accordingly. The UI uses this to decide whether to surface a "review carefully" warning.

If you cannot read ANY items (image too blurry / not a receipt), return:
{ "store": null, "storeAddress": null, "storeHours": null, "transactionCode": null, "date": null, "items": [], "subtotalCents": null, "taxCents": null, "totalCents": null, "confidence": 0 }`

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Sanitize raw control characters INSIDE string literals. Gemini
    // (even with responseMimeType: 'application/json') occasionally
    // emits literal \n / \r / \t inside string values rather than the
    // escaped \\n / \\r / \\t the JSON spec requires. The resulting
    // payload looks valid to a human but breaks JSON.parse with
    // "Bad control character in string literal". This walker tracks
    // string-literal context (with proper escape handling) and
    // converts in-string control chars to their JSON-escape form;
    // everything outside strings is passed through untouched.
    const sanitizedJson = sanitizeJsonControlChars(cleanedText)

    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(sanitizedJson)
    } catch (parseErr) {
      logger.warn('[Receipt OCR] JSON parse failed', {
        userId,
        error: (parseErr as Error).message,
        textPreview: cleanedText.slice(0, 200),
      })
      return NextResponse.json(
        {
          error: 'Couldn’t read the receipt',
          details:
            'Turn on the flash if you haven’t, hold the phone steady, and re-capture under good light. Thermal receipts older than ~30 days are usually too faded to scan.',
        },
        { status: 502 }
      )
    }

    const validated = ReceiptOCRResponseSchema.safeParse(parsedRaw)
    if (!validated.success) {
      logger.warn('[Receipt OCR] Output failed schema validation', {
        userId,
        issueCount: validated.error.issues.length,
        issues: validated.error.issues.slice(0, 5).map((i) => ({
          path: i.path.join('.'),
          code: i.code,
        })),
      })
      return NextResponse.json(
        {
          error: 'Receipt data was malformed',
          details: 'Re-capture in better light and try again.',
        },
        { status: 502 }
      )
    }

    const data = validated.data

    logger.info('[Receipt OCR] Successfully extracted receipt', {
      userId,
      store: data.store,
      storeAddress: data.storeAddress,
      storePhone: data.storePhone,
      date: data.date,
      itemCount: data.items.length,
      totalCents: data.totalCents,
      confidence: data.confidence,
      correctedCount,
      imageCount: images.length,
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error('[Receipt OCR] Extraction failed', error as Error)
    return NextResponse.json(
      {
        error: 'Failed to process receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Walk a JSON string and escape any raw control characters that appear
 * INSIDE string literals. Text outside strings (whitespace, structural
 * tokens) is passed through unchanged.
 *
 * Gemini occasionally returns payloads with literal \n / \r / \t inside
 * string values instead of the \\n / \\r / \\t the JSON spec requires;
 * those break JSON.parse with "Bad control character in string literal."
 * This is cheap defense-in-depth and rarely fires on a well-behaved
 * response (untouched output is still valid JSON).
 */
function sanitizeJsonControlChars(raw: string): string {
  let result = ''
  let inString = false
  let escapeNext = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (escapeNext) {
      result += ch
      escapeNext = false
      continue
    }
    if (ch === '\\' && inString) {
      result += ch
      escapeNext = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }
    if (inString) {
      const code = ch.charCodeAt(0)
      if (code < 0x20) {
        switch (ch) {
          case '\n':
            result += '\\n'
            break
          case '\r':
            result += '\\r'
            break
          case '\t':
            result += '\\t'
            break
          case '\b':
            result += '\\b'
            break
          case '\f':
            result += '\\f'
            break
          default:
            result += '\\u' + code.toString(16).padStart(4, '0')
        }
        continue
      }
    }
    result += ch
  }
  return result
}
