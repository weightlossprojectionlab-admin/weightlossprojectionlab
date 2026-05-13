/**
 * One-shot scraper for Instacart retailer logo URLs.
 *
 * Visits each retailer's storefront page with Playwright and captures
 * the first image URL matching the warehouse-logo pattern:
 *   /assets/domains/warehouse/logo/{warehouse_id}/{uuid}.png
 * via Instacart's /image-server/{NxN}/... proxy. This is the current
 * Instacart logo URL shape — distinct from the older
 * /store_configuration/retailer_logos/ pattern (ALDI's URL still uses
 * the old shape, kept as-is in the catalog).
 *
 * Prints a TypeScript-ready catalog patch so the maintainer can paste
 * the logoUrl line for each entry. Non-idempotent — re-run by hand
 * when URLs need refreshing.
 *
 * Usage:
 *   npx tsx scripts/fetch-instacart-retailer-logos.ts
 */

import { chromium } from 'playwright'

const RETAILER_SLUGS: Array<{ id: string; slug: string }> = [
  { id: 'albertsons',    slug: 'albertsons' },
  { id: 'costco',        slug: 'costco' },
  { id: 'cvs',           slug: 'cvs' },
  { id: 'dollar-general',slug: 'dollar-general' },
  { id: 'dollar-tree',   slug: 'dollar-tree' },
  { id: 'family-dollar', slug: 'family-dollar' },
  { id: 'food-lion',     slug: 'food-lion' },
  { id: 'fresh-market',  slug: 'the-fresh-market' },
  { id: 'giant',         slug: 'giant' },
  { id: 'harris-teeter', slug: 'harris-teeter' },
  { id: 'h-e-b',         slug: 'heb' },
  { id: 'hy-vee',        slug: 'hy-vee' },
  { id: 'kroger',        slug: 'kroger' },
  { id: 'meijer',        slug: 'meijer' },
  { id: 'publix',        slug: 'publix' },
  { id: 'ralphs',        slug: 'ralphs' },
  { id: 'safeway',       slug: 'safeway' },
  { id: 'sams-club',     slug: 'sams-club' },
  { id: 'shoprite',      slug: 'shoprite' },
  { id: 'sprouts',       slug: 'sprouts' },
  { id: 'stop-and-shop', slug: 'stop-shop' },
  { id: 'target',        slug: 'target' },
  { id: 'vons',          slug: 'vons' },
  { id: 'walgreens',     slug: 'walgreens' },
  { id: 'walmart',       slug: 'walmart' },
  { id: 'wegmans',       slug: 'wegmans' },
  { id: 'whole-foods',   slug: 'whole-foods' },
  { id: 'winn-dixie',    slug: 'winn-dixie' },
]

const LOGO_PATTERN = /\/assets\/domains\/warehouse\/logo\//

interface Found { id: string; slug: string; logoUrl: string | null; note?: string }

async function findLogoFor(
  slug: string,
  newPage: () => Promise<import('playwright').Page>,
): Promise<{ logoUrl: string | null; note?: string }> {
  const page = await newPage()
  let logoUrl: string | null = null
  page.on('response', (r) => {
    if (!logoUrl) {
      const u = r.url()
      if (LOGO_PATTERN.test(u)) logoUrl = u
    }
  })
  try {
    await page.goto(`https://www.instacart.com/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    // Don't wait for networkidle (Instacart never reaches it; ad calls
    // are continuous). Wait specifically for our logo response OR
    // ~6s of additional load time, whichever comes first.
    await page
      .waitForResponse((r) => LOGO_PATTERN.test(r.url()), { timeout: 6_000 })
      .catch(() => {})
    if (!logoUrl) {
      const fromDom = await page.evaluate((src) => {
        const re = new RegExp(src)
        for (const img of Array.from(document.querySelectorAll('img'))) {
          const s = (img as HTMLImageElement).src
          if (s && re.test(s)) return s
        }
        return null
      }, LOGO_PATTERN.source)
      if (fromDom) logoUrl = fromDom
    }
  } catch (e: any) {
    return { logoUrl: null, note: `nav failed: ${e?.message || e}` }
  } finally {
    await page.close()
  }
  return logoUrl ? { logoUrl } : { logoUrl: null, note: 'no logo captured in 6s' }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })

  const results: Found[] = []
  for (const { id, slug } of RETAILER_SLUGS) {
    const { logoUrl, note } = await findLogoFor(slug, () => ctx.newPage())
    results.push({ id, slug, logoUrl, note })
    console.log(
      logoUrl
        ? `  ✓ ${id.padEnd(16)} ${logoUrl.slice(0, 100)}`
        : `  ✗ ${id.padEnd(16)} ${note || 'no logo'}`,
    )
  }

  await browser.close()

  console.log('\n' + '='.repeat(70))
  console.log('Catalog patch — paste these logoUrl values into the matching rows of')
  console.log('constants/store-roster.ts STORE_CATALOG:')
  console.log('='.repeat(70))
  for (const r of results) {
    if (r.logoUrl) {
      console.log(`  ${r.id}: '${r.logoUrl}'`)
    } else {
      console.log(`  ${r.id}: // ${r.note || 'no logo'}`)
    }
  }
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
