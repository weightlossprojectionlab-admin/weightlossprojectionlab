import {
  parseDoseFrequency,
  dosesPerDayFor,
  dosesPerDayForCode,
  describeDosage,
  isUsableForAdherence,
} from './medication-dosage'

describe('parseDoseFrequency — explicit schedules (high confidence)', () => {
  it.each([
    ['Take 1 tablet by mouth twice daily', 2],
    ['Take 1 tablet once daily', 1],
    ['three times a day', 3],
    ['Take 2 capsules four times daily', 4],
    ['2 times per day', 2],
    ['3x daily', 3],
    ['every 8 hours', 3],
    ['every 12 hours', 2],
    ['every 6 hrs', 4],
  ])('%s -> %s doses/day', (sig, expected) => {
    const r = parseDoseFrequency(sig)
    expect(r.dosesPerDay).toBeCloseTo(expected, 5)
    expect(r.confidence).toBe('high')
  })

  it.each([
    ['BID', 2],
    ['b.i.d.', 2],
    ['TID', 3],
    ['QID', 4],
    ['QD', 1],
    ['take at bedtime', 1],
  ])('abbreviation %s -> %s', (sig, expected) => {
    const r = parseDoseFrequency(sig)
    expect(r.dosesPerDay).toBe(expected)
    expect(r.confidence).toBe('high')
  })

  it.each([
    ['every other day', 0.5],
    ['once a week', 1 / 7],
    ['weekly', 1 / 7],
    ['every two weeks', 1 / 14],
    ['monthly', 1 / 30],
    ['every 3 days', 1 / 3],
  ])('sub-daily %s -> %s', (sig, expected) => {
    const r = parseDoseFrequency(sig)
    expect(r.dosesPerDay).toBeCloseTo(expected, 5)
    expect(r.confidence).toBe('high')
  })
})

describe('parseDoseFrequency — the bug that started this', () => {
  it('treats a bare "2" as AMBIGUOUS, never as a frequency', () => {
    const r = parseDoseFrequency('2')
    expect(r.dosesPerDay).toBeNull()
    expect(r.confidence).toBe('ambiguous')
    expect(r.ambiguousBetween).toEqual(['dose', 'frequency'])
    expect(r.rawValue).toBe(2)
    expect(r.reason).toMatch(/per dose or .* times per day/i)
  })

  it('REGRESSION: never silently returns 1 for unparseable input', () => {
    // The old parseFrequency ended with "Default to 1 if we can't parse". Any of
    // these previously produced a confident 1 dose/day and a fabricated adherence %.
    for (const sig of ['2', 'take as directed', '???', 'one pill', 'qwerty', '5']) {
      const r = parseDoseFrequency(sig)
      if (r.dosesPerDay === 1) {
        throw new Error(`"${sig}" fell back to 1 dose/day — the original bug`)
      }
      expect(isUsableForAdherence(r.confidence)).toBe(false)
    }
  })

  it('treats PRN / as-needed as having no schedule (not merely unknown)', () => {
    for (const sig of ['as needed', 'PRN', 'Take 1 tablet as needed for pain']) {
      const r = parseDoseFrequency(sig)
      expect(r.dosesPerDay).toBeNull()
      expect(r.confidence).toBe('none')
      expect(r.reason).toMatch(/as needed/i)
    }
  })

  it('returns none for empty/missing instructions', () => {
    for (const sig of [undefined, null, '', '   ']) {
      const r = parseDoseFrequency(sig as any)
      expect(r.dosesPerDay).toBeNull()
      expect(r.confidence).toBe('none')
    }
  })

  it('reads bare "daily" as once/day but flags it low, not high', () => {
    const r = parseDoseFrequency('take daily with food')
    expect(r.dosesPerDay).toBe(1)
    expect(r.confidence).toBe('low')
  })
})

describe('dosesPerDayForCode', () => {
  it.each([['1x', 1], ['2x', 2], ['3x', 3], ['4x', 4], ['6x', 6], ['daily', 1]] as const)(
    '%s -> %s', (code, expected) => expect(dosesPerDayForCode(code)).toBe(expected))

  it('handles sub-daily codes and unknown', () => {
    expect(dosesPerDayForCode('weekly')).toBeCloseTo(1 / 7, 5)
    expect(dosesPerDayForCode('monthly')).toBeCloseTo(1 / 30, 5)
    expect(dosesPerDayForCode(undefined)).toBeNull()
  })
})

describe('dosesPerDayFor — authoritative resolution', () => {
  it('prefers the structured code over the prose', () => {
    // Prose says twice daily, structured code says 4x — the code wins.
    expect(dosesPerDayFor({ frequencyCode: '4x', frequency: 'take twice daily' })).toBe(4)
  })

  it('falls back to parsing legacy prose when no code', () => {
    expect(dosesPerDayFor({ frequency: 'Take 1 tablet twice daily' })).toBe(2)
  })

  it('prefers sig over the legacy frequency field', () => {
    expect(dosesPerDayFor({ sig: 'every 8 hours', frequency: 'once daily' })).toBe(3)
  })

  it('returns null (no adherence) for ambiguous or unknown', () => {
    expect(dosesPerDayFor({ frequency: '2' })).toBeNull()
    expect(dosesPerDayFor({ frequency: 'as needed' })).toBeNull()
    expect(dosesPerDayFor({})).toBeNull()
  })
})

describe('describeDosage', () => {
  it('surfaces confidence + reason for the UI', () => {
    const d = describeDosage({ frequency: '2' })
    expect(d.confidence).toBe('ambiguous')
    expect(d.reason).toBeTruthy()
  })
  it('reports high confidence when a structured code is set', () => {
    expect(describeDosage({ frequencyCode: '2x' })).toEqual({ dosesPerDay: 2, confidence: 'high' })
  })
})
