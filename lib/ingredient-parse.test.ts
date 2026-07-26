import { parseIngredientLine, parseIngredientList, type ParsedIngredient } from './ingredient-parse'

describe('parseIngredientLine', () => {
  describe('numeric quantities + units', () => {
    const cases: Array<[string, Partial<ParsedIngredient>]> = [
      ['2 eggs', { quantity: 2, unit: undefined, name: 'eggs' }],
      ['1 tbsp butter', { quantity: 1, unit: 'tbsp', name: 'butter' }],
      ['1/2 cup oats', { quantity: 0.5, unit: 'cup', name: 'oats' }],
      ['1 cup sugar', { quantity: 1, unit: 'cup', name: 'sugar' }],
      ['3/4 tablespoon of olive oil', { quantity: 0.75, unit: 'tablespoon', name: 'olive oil' }],
      ['1 1/2 cups milk', { quantity: 1.5, unit: 'cups', name: 'milk' }],
      ['0.5 lb beef', { quantity: 0.5, unit: 'lb', name: 'beef' }],
    ]
    it.each(cases)('%s', (input, expected) => {
      expect(parseIngredientLine(input)).toMatchObject(expected)
    })
  })

  describe('number words → digits', () => {
    const cases: Array<[string, Partial<ParsedIngredient>]> = [
      ['two eggs', { quantity: 2, name: 'eggs' }],
      ['three cloves of garlic', { quantity: 3, unit: 'cloves', name: 'garlic' }],
      ['quarter cup of milk', { quantity: 0.25, unit: 'cup', name: 'milk' }],
      ['half a cup of oats', { quantity: 0.5, unit: 'cup', name: 'oats' }],
      ['a dozen eggs', { quantity: 12, name: 'eggs' }],
      ['three quarters cup rice', { quantity: 0.75, unit: 'cup', name: 'rice' }],
      ['an onion', { quantity: 1, name: 'onion' }],
    ]
    it.each(cases)('%s', (input, expected) => {
      expect(parseIngredientLine(input)).toMatchObject(expected)
    })
  })

  describe('unicode + mixed fractions', () => {
    it('normalizes a standalone unicode fraction', () => {
      expect(parseIngredientLine('½ cup oats')).toMatchObject({ quantity: 0.5, unit: 'cup', name: 'oats' })
    })
    it('normalizes a glued unicode fraction (1½ → 1.5)', () => {
      expect(parseIngredientLine('1½ cups flour')).toMatchObject({ quantity: 1.5, unit: 'cups', name: 'flour' })
    })
  })

  describe('leading list conjunctions are stripped', () => {
    it.each(['and milk', 'with milk', 'plus milk'])('%s → milk', (input) => {
      const r = parseIngredientLine(input)
      expect(r?.ingredientText).toBe('milk')
      expect(r?.name).toBe('milk')
    })
    it('strips the conjunction before number-word parsing', () => {
      expect(parseIngredientLine('and three garlic cloves')).toMatchObject({
        ingredientText: 'three garlic cloves',
        quantity: 3,
        name: 'garlic cloves',
      })
    })
    it('does not strip a word that merely starts with a conjunction', () => {
      // "android" starts with "and" but is not the standalone conjunction.
      expect(parseIngredientLine('android')?.name).toBe('android')
    })
  })

  describe('filler "of" is dropped', () => {
    it('after a unit', () => {
      expect(parseIngredientLine('pinch of salt')).toMatchObject({ unit: 'pinch', name: 'salt' })
    })
    it('after a quantity with no unit', () => {
      expect(parseIngredientLine('2 of eggs')).toMatchObject({ quantity: 2, name: 'eggs' })
    })
  })

  describe('display text (ingredientText)', () => {
    it('keeps the original words for number-word input', () => {
      expect(parseIngredientLine('two eggs')?.ingredientText).toBe('two eggs')
    })
    it('trims surrounding whitespace', () => {
      expect(parseIngredientLine('   2 eggs   ')?.ingredientText).toBe('2 eggs')
    })
  })

  describe('edge cases', () => {
    it('returns null for empty / whitespace', () => {
      expect(parseIngredientLine('')).toBeNull()
      expect(parseIngredientLine('   ')).toBeNull()
    })
    it('returns null for a bare conjunction', () => {
      expect(parseIngredientLine('and')).toBeNull()
    })
    it('parses a plain name with no quantity or unit', () => {
      expect(parseIngredientLine('salt')).toMatchObject({
        ingredientText: 'salt',
        name: 'salt',
        quantity: undefined,
        unit: undefined,
      })
    })
    it('leaves a multi-word name intact when no unit matches', () => {
      expect(parseIngredientLine('red pepper flakes')).toMatchObject({ name: 'red pepper flakes' })
    })
  })
})

describe('parseIngredientList', () => {
  it('splits a comma-separated list', () => {
    const r = parseIngredientList('2 eggs, 1 tbsp butter, 1/2 cup oats')
    expect(r).toHaveLength(3)
    expect(r.map((i) => i.name)).toEqual(['eggs', 'butter', 'oats'])
  })

  it('splits on newlines', () => {
    expect(parseIngredientList('2 eggs\n1 cup rice')).toHaveLength(2)
  })

  it('drops empty fragments', () => {
    const r = parseIngredientList('2 eggs, , ,1 cup rice')
    expect(r).toHaveLength(2)
  })

  it('returns an empty array for empty input', () => {
    expect(parseIngredientList('')).toEqual([])
    expect(parseIngredientList('  ,  , ')).toEqual([])
  })

  it('normalizes number words across the whole list', () => {
    const r = parseIngredientList('two eggs, quarter cup of milk')
    expect(r[0]).toMatchObject({ quantity: 2, name: 'eggs' })
    expect(r[1]).toMatchObject({ quantity: 0.25, unit: 'cup', name: 'milk' })
  })
})
