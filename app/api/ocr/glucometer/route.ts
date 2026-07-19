import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { generateGeminiJSON, validateGeminiConfig } from '@/lib/ai/gemini-client'
import { GlucometerOCRResponseSchema, type GlucometerReading } from '@/lib/validations/glucometer-ocr'

// A meter's results list can be long; match the receipt/medication headroom.
export const maxDuration = 60

const MAX_IMAGES = 6

/**
 * POST /api/ocr/glucometer
 *
 * Server-side OCR of a glucometer's on-screen results list (e.g. "ALL
 * RESULTS": rows of date / time / value). Returns a structured list of
 * readings the client reviews and imports as timestamped blood_sugar vitals.
 *
 * Auth mirrors /api/ocr/receipt. The Gemini call routes through the shared
 * generateGeminiJSON, so it inherits the full Gemini-2.5 hardening pattern
 * (JSON mime, thinkingBudget:0, control-char sanitize, Zod gate) and the
 * api_usage_logs invocation logging — no inline SDK duplication.
 */
const PROMPT = `You are reading a blood-glucose meter's results screen from a photo.

Extract EVERY readable reading row into JSON. For each row capture:
- "date": the date exactly as printed (e.g. "07-16", "12-11", "2026-07-16"). Do not reformat or add a year that isn't shown.
- "time": the time exactly as printed (e.g. "7:22 AM", "11:31 AM", "19:05").
- "value": the numeric glucose value as a number (e.g. 333). No units in this field.
- "unit": the per-row unit only if one is printed on that row; otherwise omit it.

Also return:
- "unit": the device-level unit shown once as a header (usually "mg/dL" or "mmol/L").
- "confidence": your overall confidence 0-100 that the rows were read correctly.

Rules:
- Read values digit-for-digit. Do NOT guess, round, or invent rows that aren't visible.
- If a row is partially cut off or unreadable, omit it rather than guessing.
- Preserve the on-screen order.
- Ignore non-reading UI text (menus, battery, page indicators like "1 of 84", arrows).

Return ONLY the JSON object: { "readings": [ { "date", "time", "value", "unit"? } ], "unit"?, "confidence" }.`

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing authentication token' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    try {
      await adminAuth.verifyIdToken(token)
    } catch (authError) {
      logger.error('[Glucometer OCR] Auth failed', authError as Error)
      return NextResponse.json({ error: 'Unauthorized: Invalid authentication token' }, { status: 401 })
    }

    const config = validateGeminiConfig()
    if (!config.valid) {
      return NextResponse.json({ error: 'Scanning is not configured', details: config.error }, { status: 503 })
    }

    const body = await request.json()
    const { images } = body as { images?: string[] }
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images[] is required (array of base64 data URLs).' }, { status: 400 })
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Too many images (max ${MAX_IMAGES}).` }, { status: 400 })
    }
    if (!images.every(img => typeof img === 'string' && img.startsWith('data:image/'))) {
      return NextResponse.json({ error: 'Each image must be a base64 data URL (data:image/...).' }, { status: 400 })
    }

    // One Gemini call PER image, in parallel, then merge. A single call over
    // many photos can drive the model into a repetition loop that overruns the
    // token budget (observed: a ~10 MiB truncated response → "Unterminated
    // string in JSON"). Per-image bounds each response, isolates a bad photo,
    // and mirrors the medication-scan pattern (per-image calls merged).
    const results = await Promise.allSettled(
      images.map((img, i) =>
        generateGeminiJSON({
          fnName: 'extractGlucometerReadings',
          prompt: PROMPT,
          images: [{ data: img }],
          validateSchema: GlucometerOCRResponseSchema,
          // Slightly warmer than the 0.1 default: long numeric lists can trigger a
          // degenerate digit-repeat loop at very low temperature (receipt-OCR fix).
          temperature: 0.4,
          maxOutputTokens: 4096,
          inputSize: 1,
          metadata: { imageIndex: i, imageCount: images.length },
        })
      )
    )

    // Merge readings across photos, de-duplicating identical rows (meter pages
    // overlap — the same reading is often visible on two consecutive photos).
    const merged: GlucometerReading[] = []
    const seen = new Set<string>()
    let deviceUnit: string | undefined
    let minConfidence = 100
    let okCount = 0
    for (const r of results) {
      if (r.status !== 'fulfilled') {
        logger.warn('[Glucometer OCR] One image failed', {
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        })
        continue
      }
      okCount++
      const d = r.value
      if (d.unit) deviceUnit = d.unit
      minConfidence = Math.min(minConfidence, d.confidence)
      for (const row of d.readings) {
        const key = `${row.date}|${row.time}|${row.value}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(row)
      }
    }

    if (okCount === 0 || merged.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not read the meter screen',
          details: 'Try clearer, straight-on photos with the full list visible and glare minimized.',
        },
        { status: 502 }
      )
    }

    const data = { readings: merged, unit: deviceUnit, confidence: minConfidence }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('[Glucometer OCR] Fatal error', error as Error)
    return NextResponse.json(
      { error: 'Failed to process meter screen', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
