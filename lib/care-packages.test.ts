import { normalizePackageInput } from './care-packages'

describe('normalizePackageInput — includedCategories', () => {
  const base = { name: 'Standard Care', monthlyPrice: 120000 }

  it('keeps only known categories and dedups', () => {
    const r = normalizePackageInput({
      ...base,
      includedCategories: ['cleaning_bathroom', 'laundry', 'cleaning_bathroom', 'bogus'],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const cats = r.value.includedCategories ?? []
    expect(cats).toContain('cleaning_bathroom')
    expect(cats).toContain('laundry')
    expect(cats).not.toContain('bogus')
    expect(cats.filter(c => c === 'cleaning_bathroom')).toHaveLength(1)
  })

  it('defaults to [] when absent or not an array', () => {
    const r1 = normalizePackageInput({ ...base })
    expect(r1.ok && (r1.value.includedCategories ?? null)).toEqual([])
    const r2 = normalizePackageInput({ ...base, includedCategories: 'nope' })
    expect(r2.ok && (r2.value.includedCategories ?? null)).toEqual([])
  })
})
