/**
 * Pipeline-level allergen regression test.
 *
 * The 2026-06-01 Nutella mis-tag ([wheat_gluten]: one wrong, three missed) was
 * INVISIBLE to the unit + e2e suites because they seeded canonical allergenTags
 * directly and never exercised the real OFF lookup → parse plumbing. This test
 * closes that gap: it drives `lookupProductByBarcode` against a mocked OFF
 * response shaped exactly like the real Nutella one — LOCALIZED (French)
 * `ingredients_text`, an English `ingredients_text_en`, and the canonical
 * `allergens_tags` — and asserts the pipeline forwards the locale-proof signal
 * so the parse yields the correct canonical tags.
 *
 * Guards against regressions where a lookup layer drops `allergens_tags` or
 * feeds the parser localized prose again.
 */

// USDA must miss so the lookup falls through to the OpenFoodFacts branch.
jest.mock('@/lib/usda-api', () => ({
  searchByBarcode: jest.fn().mockResolvedValue(null),
}))

import { lookupProductByBarcode } from '@/lib/product-lookup-server'
import { allergensFromProductFields } from '@/lib/allergen-parser'

// The real Nutella OFF payload shape: French prose + English variant + tags.
const NUTELLA_OFF = {
  status: 1,
  product: {
    product_name: 'Nutella',
    brands: 'Ferrero',
    quantity: '400 g',
    serving_size: '15 g',
    image_url: 'https://example/nutella.jpg',
    nutriments: { 'energy-kcal_100g': 539 },
    categories: 'Spreads',
    // Localized — the parser can't read this; the bug fed it to the parser.
    ingredients_text: 'Sucre, huile de palme, NOISETTES, LAIT écrémé, [SOJA]. Sans gluten.',
    // English variant — the pipeline should prefer this.
    ingredients_text_en: 'Sugar, palm oil, hazelnuts, skimmed milk, lecithins [soya]. Gluten-free.',
    // Canonical, language-independent — the field that makes the parse correct.
    allergens: 'lait, fruits à coque, soja',
    allergens_tags: ['en:milk', 'en:nuts', 'en:soybeans'],
  },
}

describe('lookupProductByBarcode — allergen signal survives the OFF mapping', () => {
  const realFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => NUTELLA_OFF,
    }) as unknown as typeof fetch
  })
  afterEach(() => {
    global.fetch = realFetch
    jest.clearAllMocks()
  })

  it('forwards allergens_tags and prefers the English ingredients', async () => {
    const p = await lookupProductByBarcode('3017620422003')
    expect(p).not.toBeNull()
    expect(p!.allergens_tags).toEqual(['en:milk', 'en:nuts', 'en:soybeans'])
    // Must be the English variant, NOT the French ingredients_text.
    expect(p!.ingredients_text).toBe(NUTELLA_OFF.product.ingredients_text_en)
    expect(p!.ingredients_text).not.toContain('NOISETTES')
  })

  it('the forwarded signal parses to the correct canonical tags (not [wheat_gluten])', async () => {
    const p = await lookupProductByBarcode('3017620422003')
    const tags = allergensFromProductFields(p!.allergens, p!.ingredients_text, p!.allergens_tags)
    expect(tags).toEqual(['milk', 'soy', 'tree_nut'])
    expect(tags).not.toContain('wheat_gluten') // the old "Sans gluten" false positive
  })

  it('stays correct even if only the localized prose + tags are present', async () => {
    // Simulate a product with NO English variant: French prose + canonical tags.
    // allergens_tags alone must still carry the parse (locale-proof).
    const tags = allergensFromProductFields(
      'lait, fruits à coque, soja',
      'Sucre, NOISETTES, LAIT, [SOJA]. Sans gluten.',
      ['en:milk', 'en:nuts', 'en:soybeans'],
    )
    expect(tags).toEqual(['milk', 'soy', 'tree_nut'])
  })
})
