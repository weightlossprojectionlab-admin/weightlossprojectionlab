import { checkDuplicateVital } from './vital-service'
import type { VitalSign } from '@/types/medical'

/** Minimal VitalSign for dedupe tests (only type + recordedAt are read). */
function vital(type: string, recordedAt: string, id = recordedAt): VitalSign {
  return { id, type, recordedAt } as unknown as VitalSign
}

const existing: VitalSign[] = [
  vital('blood_sugar', '2026-07-16T06:10:00.000Z'),
  vital('blood_sugar', '2026-07-16T06:30:00.000Z'),
  vital('blood_sugar', '2026-07-16T07:22:00.000Z'),
  vital('blood_pressure', '2026-07-16T06:10:00.000Z'),
]

describe('checkDuplicateVital — multiple readings per day allowed', () => {
  it('allows another same-day reading at a different time (the glucometer case)', () => {
    const res = checkDuplicateVital(existing, 'blood_sugar', new Date('2026-07-16T21:00:00.000Z'))
    expect(res.isDuplicate).toBe(false)
  })

  it('flags an exact same-minute re-submit of the same type as a duplicate', () => {
    const res = checkDuplicateVital(existing, 'blood_sugar', new Date('2026-07-16T06:30:20.000Z'))
    expect(res.isDuplicate).toBe(true)
    expect(res.existingVital?.recordedAt).toBe('2026-07-16T06:30:00.000Z')
  })

  it('does NOT treat a different vital type at the same minute as a duplicate', () => {
    // 07:22 blood_pressure — same minute as an existing blood_sugar, different type.
    const res = checkDuplicateVital(existing, 'blood_pressure', new Date('2026-07-16T07:22:00.000Z'))
    expect(res.isDuplicate).toBe(false)
  })

  it('allows the same clock time on a different day', () => {
    const res = checkDuplicateVital(existing, 'blood_sugar', new Date('2026-07-17T06:10:00.000Z'))
    expect(res.isDuplicate).toBe(false)
  })

  it('is not tripped up by seconds within the same minute (minute granularity)', () => {
    const res = checkDuplicateVital(existing, 'blood_sugar', new Date('2026-07-16T07:22:45.000Z'))
    expect(res.isDuplicate).toBe(true)
  })

  it('ignores existing rows with an unparseable recordedAt', () => {
    const withBad = [vital('blood_sugar', 'not-a-date'), ...existing]
    const res = checkDuplicateVital(withBad, 'blood_sugar', new Date('2026-07-16T09:00:00.000Z'))
    expect(res.isDuplicate).toBe(false)
  })
})
