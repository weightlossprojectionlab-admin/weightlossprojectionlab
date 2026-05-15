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
    const { images } = body as { images?: string[] }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'images[] is required (array of base64 data URLs).' },
        { status: 400 }
      )
    }
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
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        // Receipts are list-heavy — Costco runs can hit ~80 items.
        // Bigger budget than the medication route (1024) so we don't
        // truncate mid-line and break JSON parse.
        maxOutputTokens: 4096,
      },
    })

    const sectionsHeader =
      images.length > 1
        ? `You are looking at ${images.length} sequential photos of ONE printed receipt — the user captured it in sections because it's long. Stitch the line items together IN ORDER (image 1 first, image 2 next, etc.). If a single line is split across two photos, deduplicate it; do not double-count.`
        : `You are looking at ONE photo of a printed receipt.`

    const prompt = `${sectionsHeader}

Extract the receipt as STRUCTURED JSON. Return ONLY valid JSON (no markdown, no code blocks, no commentary) with this exact structure:

{
  "store": "merchant name from the receipt header (e.g., 'Costco', 'Walmart', 'Whole Foods'). null if not visible.",
  "storeAddress": "physical address of the store as printed at the top of the receipt (e.g., '478 Clubhouse Dr, Middletown, NJ 07748' or '101 Main St'). Combine multi-line address into one string. null if not visible.",
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

    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(cleanedText)
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
      itemCount: data.items.length,
      totalCents: data.totalCents,
      confidence: data.confidence,
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
