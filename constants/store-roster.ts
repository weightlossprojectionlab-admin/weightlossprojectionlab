/**
 * Curated household-store catalog.
 *
 * Semantic intent: the owner picks the chains they actually shop at
 * from THIS list (multi-select), not free-text. Caregivers later
 * select "I'm at X" from the household's chosen subset, so the bell
 * fan-out's storeName field is always real, never typoed.
 *
 * Why a hand-curated constants file (not Google Places):
 * - Zero per-add API cost; ships immediately.
 * - Brand-color + initial gives a recognizable visual hit without
 *   sourcing logo assets or running legal review on each one.
 *   `logoUrl` is an optional slot — we can drop a real asset in later
 *   without touching consumers, since picker UI keys off brandColor +
 *   initial when logoUrl is absent.
 *
 * Coverage: ~25 US grocery / pharmacy / general-merch chains the
 * target households are most likely to shop at. If a chain is missing,
 * add it here and the picker surfaces it on next render — no schema
 * change needed. Brand colors are nominative-fair-use identifiers,
 * not asset claims.
 *
 * Logo sourcing (post-Clearbit-deprecation):
 * - Clearbit's free CDN went dark post-HubSpot acquisition (DNS no
 *   longer resolves consistently). Those URLs were rolled back.
 * - Instacart's image-server (`/image-server/x42/...retailer_logos/`)
 *   returns a small PNG; their underlying CloudFront bucket
 *   (`d2lnr5mha7bycj.cloudfront.net/store_configuration/retailer_logos`)
 *   returns the real SVG. Either works in <StoreBrandMark>.
 * - Each retailer has an opaque URL with its own retailer-id + hash,
 *   so URLs are added one retailer at a time as we collect them.
 *   StoreBrandMark falls back cleanly to the brand-color initial tile
 *   for any entry without a logoUrl — no broken-image flashes.
 *
 * Before public launch: download each SVG once and bundle in
 * /public/store-logos/, then swap logoUrl strings to local paths.
 * No consumer changes needed — same field, different host.
 *
 * Ordering: alphabetical by name. Category grouping happens at the
 * picker level so the constants file stays linear and reviewable.
 */

export type StoreCategory =
  | 'grocery'       // supermarkets / co-ops
  | 'big_box'       // Walmart / Target / Costco — broad inventory
  | 'pharmacy'      // CVS / Walgreens — Rx pickup paths
  | 'dollar'        // dollar-store chains
  | 'natural'       // specialty natural / organic grocers

export interface StoreCatalogEntry {
  /** Stable kebab-case identifier — persisted in user.householdStoreIds.
   *  Renaming an entry here would orphan existing rosters; treat as
   *  append-only. */
  id: string
  /** Display name as the brand publishes it. */
  name: string
  /** Hex brand color used as the picker tile background. Picked from
   *  each brand's primary published color; small contrast tweaks are
   *  acceptable (we render white/dark text on top). */
  brandColor: string
  /** Short initials shown on the tile. 1–3 chars. */
  initial: string
  category: StoreCategory
  /** Optional logo URL. When absent, the tile renders brandColor +
   *  initial. Phase 0a-i ships the no-logo path; assets can be added
   *  later as we source them with proper licensing. */
  logoUrl?: string
}

export const STORE_CATALOG: readonly StoreCatalogEntry[] = [
  { id: 'aldi',          name: 'ALDI',                brandColor: '#00549F', initial: 'A',  category: 'grocery',  logoUrl: 'https://d2lnr5mha7bycj.cloudfront.net/store_configuration/retailer_logos/1672/default/dark/S88CaEzlTj2yWFIAgBGI_aldius-logo.svg' },
  { id: 'albertsons',    name: 'Albertsons',          brandColor: '#004A98', initial: 'A',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/233/ca07b011-2df2-4e1d-bdef-e47d2d0f24d7.png' },
  { id: 'costco',        name: 'Costco',              brandColor: '#E31837', initial: 'C',  category: 'big_box',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/5/65f2304b-908e-4cd0-981d-0d4e4effa8de.png' },
  { id: 'cvs',           name: 'CVS',                 brandColor: '#CC0000', initial: 'CV', category: 'pharmacy', logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/118/6ede4bd3-cc58-4e32-b10b-24ed1d656131.png' },
  // dollar-general: scraper captured CVS's logo (cross-contaminated via related-retailers carousel); refined re-scrape pending
  { id: 'dollar-general',name: 'Dollar General',      brandColor: '#FFC528', initial: 'DG', category: 'dollar' },
  { id: 'dollar-tree',   name: 'Dollar Tree',         brandColor: '#00833F', initial: 'DT', category: 'dollar',   logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/1425/841f212e-4938-4245-9a31-62f61dd99d6b.jpg' },
  { id: 'family-dollar', name: 'Family Dollar',       brandColor: '#FF0000', initial: 'FD', category: 'dollar',   logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/1424/cec0f3bd-c2fe-4d14-a18e-856b6f97ee63.jpg' },
  { id: 'food-lion',     name: 'Food Lion',           brandColor: '#005DAA', initial: 'FL', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/133/797e4d4c-4e74-4c2a-bde3-b525e71c4302.png' },
  { id: 'fresh-market',  name: 'The Fresh Market',    brandColor: '#5C6F3F', initial: 'FM', category: 'natural',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/264/7ee72632-a7ba-44e4-b874-519f2f678551.png' },
  { id: 'giant',         name: 'Giant',               brandColor: '#E22128', initial: 'G',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/159/30be17e8-9509-4032-9d4c-92262050cbaf.png' },
  // harris-teeter: scraper captured fresh-market's logo (cross-contamination); refined re-scrape pending
  { id: 'harris-teeter', name: 'Harris Teeter',       brandColor: '#005CAB', initial: 'HT', category: 'grocery' },
  { id: 'h-e-b',         name: 'H-E-B',               brandColor: '#DD1D24', initial: 'HE', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/45/d10d0f4b-1fca-4b84-bc19-bbf492c040da.png' },
  { id: 'hy-vee',        name: 'Hy-Vee',              brandColor: '#D52B1E', initial: 'HV', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/457/87419e93-2e92-4c73-8d48-2fc0c2cd390c.png' },
  { id: 'kroger',        name: 'Kroger',              brandColor: '#004B93', initial: 'K',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/58/bc25fc5b-fb60-4c10-a871-ce427c1d7e78.png' },
  { id: 'meijer',        name: 'Meijer',              brandColor: '#C8202F', initial: 'M',  category: 'big_box',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/238/472b9436-9858-474d-a668-a79d6aba47c8.png' },
  { id: 'publix',        name: 'Publix',              brandColor: '#007A33', initial: 'P',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/57/2c9013f3-910d-4a8e-a340-dbf8c78cd655.png' },
  { id: 'ralphs',        name: 'Ralphs',              brandColor: '#C8102E', initial: 'R',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/38/bef2eb95-7375-4547-ab37-21502de090e0.png' },
  { id: 'safeway',       name: 'Safeway',             brandColor: '#E21836', initial: 'S',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/1/1fe0065e-a947-4b5d-b274-3900694536d5.png' },
  { id: 'sams-club',     name: "Sam's Club",          brandColor: '#0067A0', initial: 'SC', category: 'big_box',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/352/ea8710be-0cff-4d79-8c42-2c0ea3f516d5.png' },
  { id: 'shoprite',      name: 'ShopRite',            brandColor: '#E21F26', initial: 'SR', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/205/3e0e5623-e36a-4d07-9474-c7eac09f8e33.png' },
  { id: 'sprouts',       name: 'Sprouts Farmers Market', brandColor: '#6FB343', initial: 'SP', category: 'natural', logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/279/d32b62ca-80e7-416f-8f2a-9068b68393c5.webp' },
  { id: 'stop-and-shop', name: 'Stop & Shop',         brandColor: '#E21F26', initial: 'SS', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/235/80fb9e2f-334f-4f2c-8b9a-df612a862570.png' },
  // target: Instacart presence minimal (Shipt is Target-owned); scraper found no warehouse-logo URL in 6s
  { id: 'target',        name: 'Target',              brandColor: '#CC0000', initial: 'T',  category: 'big_box' },
  { id: 'trader-joes',   name: "Trader Joe's",        brandColor: '#B53932', initial: 'TJ', category: 'natural' },
  { id: 'vons',          name: 'Vons',                brandColor: '#D52027', initial: 'V',  category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/290/627b03bd-1ef8-4d74-8f3d-346f7f6d18a5.png' },
  { id: 'walgreens',     name: 'Walgreens',           brandColor: '#E11B22', initial: 'W',  category: 'pharmacy', logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/1573/230283d3-fcec-402b-856f-ca0292afddd9.png' },
  { id: 'walmart',       name: 'Walmart',             brandColor: '#0071CE', initial: 'W',  category: 'big_box',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/1487/5ffe3fb7-2a0c-4714-8c71-364d7186a3d3.png' },
  { id: 'wegmans',       name: 'Wegmans',             brandColor: '#005DAA', initial: 'WG', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/231/30647104-9adb-4346-babc-3757295650b8.png' },
  // whole-foods: Instacart presence minimal (Amazon delivers); scraper found no warehouse-logo URL in 6s
  { id: 'whole-foods',   name: 'Whole Foods Market',  brandColor: '#006B40', initial: 'WF', category: 'natural' },
  { id: 'winn-dixie',    name: 'Winn-Dixie',          brandColor: '#E51937', initial: 'WD', category: 'grocery',  logoUrl: 'https://www.instacart.com/image-server/72x72/www.instacart.com/assets/domains/warehouse/logo/371/552e9cbe-f7ef-400a-9410-a25ea23c23c3.png' },
] as const

/** O(1) lookup by id — used by consumers to render a chosen store
 *  (e.g. the eventual Start Shopping picker, the bell title builder)
 *  without re-scanning the array. */
export const STORE_CATALOG_BY_ID: Readonly<Record<string, StoreCatalogEntry>> =
  Object.fromEntries(STORE_CATALOG.map((s) => [s.id, s]))

/** Category labels for the picker's section headers. Keeping this
 *  separate from the entries keeps the source linear. */
export const STORE_CATEGORY_LABELS: Readonly<Record<StoreCategory, string>> = {
  grocery: 'Grocery',
  big_box: 'Big-box & Wholesale',
  pharmacy: 'Pharmacy',
  dollar: 'Dollar Stores',
  natural: 'Natural & Organic',
}

/**
 * Normalize a free-text store name (typically from a receipt OCR's
 * `store` field — "WALMART INC #1234" / "WAL-MART SUPERCENTER" /
 * "ALDI US") to the catalog `id` ('walmart' / 'aldi').
 *
 * Replaces the legacy `identifyGroceryChain` in lib/location-service.ts,
 * which returned a chain NAME from a separate hardcoded array and
 * couldn't bridge to the catalog ids that Phase 0a's roster uses.
 * This function is the single normalization point — receipt OCR,
 * Start Shopping picker, best-store auto-fill, and the
 * ShoppingItem.assignedStoreId writer all flow through here so a
 * given chain has one canonical id everywhere.
 *
 * Matching strategy: case-insensitive substring on each catalog
 * entry's name AND id. The catalog name "Whole Foods Market" matches
 * receipt strings like "WHOLE FOODS MARKET #10123" and the catalog
 * id "whole-foods" matches "whole-foods.com" (defensive). Returns
 * the FIRST match in catalog order — entries with longer names sort
 * later in the iteration so shorter, more-specific names win on
 * ambiguity (e.g. "Family Dollar" wins over "Dollar Tree" when the
 * receipt says "FAMILY DOLLAR").
 *
 * Returns null when no entry matches — caller falls back to the
 * raw free-text store name for display, but no `assignedStoreId`
 * gets set (preserves "any store" semantics).
 */
export function normalizeStoreNameToCatalogId(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null
  const lower = text.toLowerCase().trim()
  if (lower.length === 0) return null

  // Sort by name length DESC so longer (more specific) names match
  // before shorter ones that are substrings. "Family Dollar" must
  // beat the substring "Dollar" if the catalog ever held both.
  const sortedByLength = [...STORE_CATALOG].sort(
    (a, b) => b.name.length - a.name.length,
  )
  for (const entry of sortedByLength) {
    const entryName = entry.name.toLowerCase()
    if (lower.includes(entryName)) return entry.id
    // Also try the id pattern (e.g. "harris-teeter" from a URL/slug)
    if (lower.includes(entry.id)) return entry.id
  }
  return null
}
