import { DEFAULT_RATE_CARD, getRateCard, estimateVisit } from './rate-card'
import type { DutyCategory } from '@/types/household-duties'

// Every DutyCategory the app can assign must be priceable, or a task falls
// through the estimate with no rate. This is the invariant that keeps the
// rate card and the duty model in sync.
const ALL_CATEGORIES: DutyCategory[] = [
  'laundry',
  'shopping',
  'cleaning_bedroom',
  'cleaning_bathroom',
  'cleaning_kitchen',
  'cleaning_living_areas',
  'meal_preparation',
  'grocery_shopping',
  'medication_pickup',
  'transportation',
  'personal_care',
  'pet_care',
  'yard_work',
  'custom',
]

describe('DEFAULT_RATE_CARD', () => {
  it('prices every DutyCategory (no task can fall through)', () => {
    for (const c of ALL_CATEGORIES) {
      expect(DEFAULT_RATE_CARD.find(r => r.category === c)).toBeDefined()
    }
  })

  it('keeps defaultRate within its own rateRange', () => {
    for (const item of DEFAULT_RATE_CARD) {
      const [min, max] = item.rateRange
      expect(item.defaultRate).toBeGreaterThanOrEqual(min)
      expect(item.defaultRate).toBeLessThanOrEqual(max)
    }
  })
})

describe('getRateCard', () => {
  it('returns the shipped defaults when the tenant has no custom card', () => {
    expect(getRateCard()).toBe(DEFAULT_RATE_CARD)
    expect(getRateCard(null)).toBe(DEFAULT_RATE_CARD)
    expect(getRateCard([])).toBe(DEFAULT_RATE_CARD)
  })

  it('returns the tenant card when present', () => {
    const custom = [DEFAULT_RATE_CARD[0]]
    expect(getRateCard(custom)).toBe(custom)
  })
})

describe('estimateVisit — pricing by unit', () => {
  it('hourly: labor = rate × hours', () => {
    // cleaning_bathroom = 5000c/hr
    const e = estimateVisit([{ category: 'cleaning_bathroom', quantity: 2 }], DEFAULT_RATE_CARD)
    expect(e.lines[0].laborCents).toBe(10000)
    expect(e.billableLaborCents).toBe(10000)
    expect(e.totalBillableCents).toBe(10000)
    expect(e.lines[0].covered).toBe(false)
  })

  it('per_unit: labor = rate × count (defaults to 1)', () => {
    // laundry = 1800c/load
    expect(estimateVisit([{ category: 'laundry' }], DEFAULT_RATE_CARD).lines[0].laborCents).toBe(1800)
    expect(
      estimateVisit([{ category: 'laundry', quantity: 3 }], DEFAULT_RATE_CARD).lines[0].laborCents
    ).toBe(5400)
  })

  it('flat: labor = rate × 1 by default', () => {
    // pet_care = 2800c/visit (flat)
    const e = estimateVisit([{ category: 'pet_care' }], DEFAULT_RATE_CARD)
    expect(e.lines[0].unit).toBe('flat')
    expect(e.lines[0].laborCents).toBe(2800)
  })
})

describe('estimateVisit — package coverage', () => {
  it('covered category bills $0 labor but records the covered value', () => {
    const e = estimateVisit([{ category: 'cleaning_bathroom', quantity: 2 }], DEFAULT_RATE_CARD, {
      includedCategories: ['cleaning_bathroom'],
    })
    expect(e.lines[0].covered).toBe(true)
    expect(e.lines[0].laborCents).toBe(0)
    expect(e.billableLaborCents).toBe(0)
    expect(e.coveredValueCents).toBe(10000)
    expect(e.totalBillableCents).toBe(0)
  })

  it('mixes covered + à-la-carte in one visit', () => {
    const e = estimateVisit(
      [
        { category: 'cleaning_bathroom', quantity: 1 }, // covered → $0
        { category: 'laundry', quantity: 2 }, // not covered → 3600
      ],
      DEFAULT_RATE_CARD,
      { includedCategories: ['cleaning_bathroom'] }
    )
    expect(e.coveredValueCents).toBe(5000)
    expect(e.billableLaborCents).toBe(3600)
    expect(e.totalBillableCents).toBe(3600)
  })
})

describe('estimateVisit — pass-through + care tier', () => {
  it('pass-through (groceries) is billed even when the labor is covered', () => {
    const e = estimateVisit(
      [{ category: 'grocery_shopping', quantity: 1, passThroughCents: 8500 }],
      DEFAULT_RATE_CARD,
      { includedCategories: ['grocery_shopping'] }
    )
    expect(e.lines[0].laborCents).toBe(0) // labor covered
    expect(e.passThroughCents).toBe(8500) // goods still billed
    expect(e.totalBillableCents).toBe(8500)
  })

  it('care-tier multiplier applies to care categories only', () => {
    // personal_care = 3800, requiresCareTier true → ×1.2 = 4560
    const care = estimateVisit([{ category: 'personal_care', quantity: 1 }], DEFAULT_RATE_CARD, {
      careTierMultiplier: 1.2,
    })
    expect(care.lines[0].rateCents).toBe(4560)
    expect(care.lines[0].laborCents).toBe(4560)

    // cleaning_bathroom does NOT require care tier → unchanged
    const clean = estimateVisit([{ category: 'cleaning_bathroom', quantity: 1 }], DEFAULT_RATE_CARD, {
      careTierMultiplier: 1.2,
    })
    expect(clean.lines[0].rateCents).toBe(5000)
  })
})

describe('estimateVisit — robustness', () => {
  it('an uncatalogued category (missing from the card) bills $0, never NaN', () => {
    const e = estimateVisit([{ category: 'yard_work', quantity: 3 }], []) // empty card
    expect(e.lines[0].laborCents).toBe(0)
    expect(e.totalBillableCents).toBe(0)
    expect(Number.isNaN(e.totalBillableCents)).toBe(false)
  })

  it('empty task list → all zeros', () => {
    const e = estimateVisit([], DEFAULT_RATE_CARD)
    expect(e.lines).toHaveLength(0)
    expect(e.totalBillableCents).toBe(0)
    expect(e.coveredValueCents).toBe(0)
  })
})
