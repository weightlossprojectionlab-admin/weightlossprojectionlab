/**
 * Server-side barcode variant generator for product_database lookups.
 *
 * Why we need this: scanners and source catalogs disagree on canonical
 * length and encoding for the same physical barcode. Concrete examples:
 *
 *   - A UPC-E barcode on a small package prints "0 134660 4" (8 digits).
 *     ZXing returns the 8-digit form by default; some configs auto-expand
 *     to the 12-digit UPC-A `013000004664`. USDA's branded catalog stores
 *     the same product under whichever form was supplied to FDC, often
 *     the compressed 8-digit one.
 *   - EAN-13 is just `0` + UPC-A; some scanners report `0013000004664`.
 *   - GTIN-14 prepends another `0` for case-pack codes.
 *
 * Without variant fallback, the scanner's emitted form must exactly match
 * the doc id, which it routinely doesn't. This helper enumerates the
 * plausible alternatives (length pads, leading-zero strip, UPC-E ↔ UPC-A
 * expansion/compression) so a single missed `doc.get()` can fan out to a
 * small set of candidate ids.
 *
 * Returned in priority order — caller should try each and stop on first
 * hit. Duplicates are dropped via Set.
 */
export function barcodeVariants(input: string): string[] {
  // GS1 Application Identifier extraction: 2D codes (DataMatrix/QR/GS1-128)
  // commonly wrap a GTIN as `(01)<14 digits>` followed by other AIs. If we
  // see that prefix, peel out the 14-digit GTIN and recurse so all the
  // length/encoding variants apply to the real payload, not the raw scan.
  const gs1Match = (input || '').match(/^\s*\(?01\)?(\d{14})/)
  if (gs1Match) return barcodeVariants(gs1Match[1])

  const cleaned = (input || '').replace(/\D/g, '')
  if (!cleaned) return []

  const out = new Set<string>()
  out.add(cleaned)

  // 1. UPC-E → UPC-A expansion (8-digit scanner output → 12-digit doc id)
  if (cleaned.length === 8) {
    const expanded = expandUpcE(cleaned)
    if (expanded) {
      out.add(expanded)
      out.add('0' + expanded)   // EAN-13 form
      out.add('00' + expanded)  // GTIN-14 form
    }
  }

  // 2. UPC-A → UPC-E compression (12-digit scanner output → 8-digit doc id)
  if (cleaned.length === 12) {
    const compressed = compressUpcA(cleaned)
    if (compressed) out.add(compressed)
  }

  // 3. EAN-13 with leading 0 → UPC-A (13-digit → 12-digit)
  if (cleaned.length === 13 && cleaned[0] === '0') {
    const upcA = cleaned.slice(1)
    out.add(upcA)
    const compressed = compressUpcA(upcA)
    if (compressed) out.add(compressed)
  }

  // 4. GTIN-14 with leading 00 → UPC-A
  if (cleaned.length === 14 && cleaned.startsWith('00')) {
    out.add(cleaned.slice(2))
    out.add(cleaned.slice(1)) // drop one zero (→ 13-digit)
  }

  // 5. Strip-leading-zeros form (USDA sometimes stores bare numbers)
  const stripped = cleaned.replace(/^0+/, '')
  if (stripped && stripped !== cleaned) out.add(stripped)

  // 6. Zero-pad to common GTIN lengths (covers the inverse case where the
  //    scanner returns a stripped form but the doc is stored zero-padded)
  for (const target of [8, 12, 13, 14]) {
    if (cleaned.length < target) out.add(cleaned.padStart(target, '0'))
    if (stripped && stripped.length < target) out.add(stripped.padStart(target, '0'))
  }

  return [...out]
}

/**
 * Expand an 8-digit UPC-E to a 12-digit UPC-A using the standard rule
 * (https://en.wikipedia.org/wiki/Universal_Product_Code#UPC-E).
 *
 * Returns null when the input isn't a valid UPC-E candidate.
 */
function expandUpcE(upcE: string): string | null {
  if (!/^[01]\d{7}$/.test(upcE)) return null
  const ns = upcE[0]
  const x1 = upcE[1], x2 = upcE[2], x3 = upcE[3], x4 = upcE[4], x5 = upcE[5], x6 = upcE[6]
  const c = upcE[7]
  let body: string
  switch (x6) {
    case '0':
    case '1':
    case '2':
      body = `${x1}${x2}${x6}0000${x3}${x4}${x5}`
      break
    case '3':
      body = `${x1}${x2}${x3}00000${x4}${x5}`
      break
    case '4':
      body = `${x1}${x2}${x3}${x4}00000${x5}`
      break
    default: // 5..9
      body = `${x1}${x2}${x3}${x4}${x5}0000${x6}`
      break
  }
  return `${ns}${body}${c}`
}

/**
 * Compress a 12-digit UPC-A to its 8-digit UPC-E form when the bit
 * pattern allows. Returns null when the UPC-A isn't compressible.
 */
function compressUpcA(upcA: string): string | null {
  if (!/^[01]\d{11}$/.test(upcA)) return null
  const ns = upcA[0]
  const c = upcA[11]
  const d = upcA.split('')

  // Pattern A (X6 ∈ {0,1,2}): NS X1 X2 X6 0000 X3 X4 X5 C
  if (d[4] === '0' && d[5] === '0' && d[6] === '0' && d[7] === '0' && '012'.includes(d[3])) {
    return ns + d[1] + d[2] + d[8] + d[9] + d[10] + d[3] + c
  }
  // Pattern B (X6 = 3): NS X1 X2 X3 00000 X4 X5 C
  if (d[3] === '3' && d[4] === '0' && d[5] === '0' && d[6] === '0' && d[7] === '0' && d[8] === '0') {
    return ns + d[1] + d[2] + d[3] + d[9] + d[10] + '3' + c
  }
  // Pattern C (X6 = 4): NS X1 X2 X3 X4 00000 X5 C — requires X4 != 0
  if (d[4] !== '0' && d[5] === '0' && d[6] === '0' && d[7] === '0' && d[8] === '0' && d[9] === '0') {
    return ns + d[1] + d[2] + d[3] + d[4] + d[10] + '4' + c
  }
  // Pattern D (X6 ∈ {5..9}): NS X1 X2 X3 X4 X5 0000 X6 C — requires X5 != 0
  if (d[5] !== '0' && d[6] === '0' && d[7] === '0' && d[8] === '0' && d[9] === '0' && '56789'.includes(d[10])) {
    return ns + d[1] + d[2] + d[3] + d[4] + d[5] + d[10] + c
  }
  return null
}
