import { emergencyCompleteness } from './emergency-completeness'

describe('emergencyCompleteness', () => {
  it('is 0% and lists all three when nothing is on file', () => {
    const r = emergencyCompleteness({})
    expect(r.pct).toBe(0)
    expect(r.complete).toBe(false)
    expect(r.missing.map((f) => f.key)).toEqual(['bloodType', 'drugAllergies', 'codeStatus'])
  })

  it('is 100% and complete when all three are present', () => {
    const r = emergencyCompleteness({
      bloodType: 'O+',
      drugAllergies: ['Penicillin'],
      codeStatus: 'dnr',
    })
    expect(r.pct).toBe(100)
    expect(r.complete).toBe(true)
    expect(r.missing).toHaveLength(0)
  })

  it('treats the "unknown" sentinels as NOT on file (honest, not answered)', () => {
    const r = emergencyCompleteness({ bloodType: 'unknown', codeStatus: 'unknown', drugAllergies: [] })
    expect(r.pct).toBe(0)
    expect(r.missing.map((f) => f.key)).toEqual(['bloodType', 'drugAllergies', 'codeStatus'])
  })

  it('rounds partial completion and reports exactly what is missing', () => {
    const r = emergencyCompleteness({ bloodType: 'A-', drugAllergies: [], codeStatus: undefined })
    expect(r.pct).toBe(33) // 1 of 3
    expect(r.complete).toBe(false)
    expect(r.missing.map((f) => f.key)).toEqual(['drugAllergies', 'codeStatus'])
  })

  it('an empty allergy array is missing; a populated one is present', () => {
    expect(emergencyCompleteness({ drugAllergies: [] }).fields.find((f) => f.key === 'drugAllergies')!.present).toBe(false)
    expect(emergencyCompleteness({ drugAllergies: ['Sulfa'] }).fields.find((f) => f.key === 'drugAllergies')!.present).toBe(true)
  })
})
