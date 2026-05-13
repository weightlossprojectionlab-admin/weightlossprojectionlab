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
  { id: 'aldi',          name: 'ALDI',                brandColor: '#00549F', initial: 'A',  category: 'grocery' },
  { id: 'albertsons',    name: 'Albertsons',          brandColor: '#004A98', initial: 'A',  category: 'grocery' },
  { id: 'costco',        name: 'Costco',              brandColor: '#E31837', initial: 'C',  category: 'big_box' },
  { id: 'cvs',           name: 'CVS',                 brandColor: '#CC0000', initial: 'CV', category: 'pharmacy' },
  { id: 'dollar-general',name: 'Dollar General',      brandColor: '#FFC528', initial: 'DG', category: 'dollar' },
  { id: 'dollar-tree',   name: 'Dollar Tree',         brandColor: '#00833F', initial: 'DT', category: 'dollar' },
  { id: 'family-dollar', name: 'Family Dollar',       brandColor: '#FF0000', initial: 'FD', category: 'dollar' },
  { id: 'food-lion',     name: 'Food Lion',           brandColor: '#005DAA', initial: 'FL', category: 'grocery' },
  { id: 'fresh-market',  name: 'The Fresh Market',    brandColor: '#5C6F3F', initial: 'FM', category: 'natural' },
  { id: 'giant',         name: 'Giant',               brandColor: '#E22128', initial: 'G',  category: 'grocery' },
  { id: 'harris-teeter', name: 'Harris Teeter',       brandColor: '#005CAB', initial: 'HT', category: 'grocery' },
  { id: 'h-e-b',         name: 'H-E-B',               brandColor: '#DD1D24', initial: 'HE', category: 'grocery' },
  { id: 'hy-vee',        name: 'Hy-Vee',              brandColor: '#D52B1E', initial: 'HV', category: 'grocery' },
  { id: 'kroger',        name: 'Kroger',              brandColor: '#004B93', initial: 'K',  category: 'grocery' },
  { id: 'meijer',        name: 'Meijer',              brandColor: '#C8202F', initial: 'M',  category: 'big_box' },
  { id: 'publix',        name: 'Publix',              brandColor: '#007A33', initial: 'P',  category: 'grocery' },
  { id: 'ralphs',        name: 'Ralphs',              brandColor: '#C8102E', initial: 'R',  category: 'grocery' },
  { id: 'safeway',       name: 'Safeway',             brandColor: '#E21836', initial: 'S',  category: 'grocery' },
  { id: 'sams-club',     name: "Sam's Club",          brandColor: '#0067A0', initial: 'SC', category: 'big_box' },
  { id: 'shoprite',      name: 'ShopRite',            brandColor: '#E21F26', initial: 'SR', category: 'grocery' },
  { id: 'sprouts',       name: 'Sprouts Farmers Market', brandColor: '#6FB343', initial: 'SP', category: 'natural' },
  { id: 'stop-and-shop', name: 'Stop & Shop',         brandColor: '#E21F26', initial: 'SS', category: 'grocery' },
  { id: 'target',        name: 'Target',              brandColor: '#CC0000', initial: 'T',  category: 'big_box' },
  { id: 'trader-joes',   name: "Trader Joe's",        brandColor: '#B53932', initial: 'TJ', category: 'natural' },
  { id: 'vons',          name: 'Vons',                brandColor: '#D52027', initial: 'V',  category: 'grocery' },
  { id: 'walgreens',     name: 'Walgreens',           brandColor: '#E11B22', initial: 'W',  category: 'pharmacy' },
  { id: 'walmart',       name: 'Walmart',             brandColor: '#0071CE', initial: 'W',  category: 'big_box' },
  { id: 'wegmans',       name: 'Wegmans',             brandColor: '#005DAA', initial: 'WG', category: 'grocery' },
  { id: 'whole-foods',   name: 'Whole Foods Market',  brandColor: '#006B40', initial: 'WF', category: 'natural' },
  { id: 'winn-dixie',    name: 'Winn-Dixie',          brandColor: '#E51937', initial: 'WD', category: 'grocery' },
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
