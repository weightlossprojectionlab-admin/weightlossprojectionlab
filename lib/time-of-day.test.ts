import { bucketForHour, timeOfDayBucket, type TimeOfDayBucket } from './time-of-day'

describe('bucketForHour', () => {
  const cases: Array<[number, TimeOfDayBucket]> = [
    [0, 'overnight'], [4, 'overnight'],
    [5, 'morning'], [11, 'morning'],
    [12, 'afternoon'], [16, 'afternoon'],
    [17, 'evening'], [23, 'evening'],
  ]
  it.each(cases)('hour %i → %s', (hour, expected) => {
    expect(bucketForHour(hour)).toBe(expected)
  })
})

describe('timeOfDayBucket', () => {
  it('buckets by UTC hour when no timezone is given', () => {
    expect(timeOfDayBucket('2026-07-18T08:00:00Z')).toBe('morning')
    expect(timeOfDayBucket('2026-07-18T20:00:00Z')).toBe('evening')
    expect(timeOfDayBucket('2026-07-18T02:00:00Z')).toBe('overnight')
  })

  it('uses local wall-clock hour when a timezone is supplied', () => {
    // 12:00 UTC is 08:00 in New York (EDT, UTC-4) → morning, not afternoon.
    expect(timeOfDayBucket('2026-07-18T12:00:00Z', 'America/New_York')).toBe('morning')
    // 00:00 UTC is 20:00 previous day in New York → evening.
    expect(timeOfDayBucket('2026-07-18T00:00:00Z', 'America/New_York')).toBe('evening')
  })

  it('separates a fixed-offset patient\'s morning vs evening even without a timezone', () => {
    // The whole point: grouping stays correct on UTC hours because the offset is constant.
    const morningLocal = timeOfDayBucket('2026-07-18T13:00:00Z') // ~8am for UTC-5
    const eveningLocal = timeOfDayBucket('2026-07-19T01:00:00Z') // ~8pm for UTC-5
    expect(morningLocal).not.toBe(eveningLocal)
  })

  it('falls back to UTC on an invalid timezone string', () => {
    expect(timeOfDayBucket('2026-07-18T08:00:00Z', 'Not/AZone')).toBe('morning')
  })

  it('is safe on an invalid date', () => {
    expect(timeOfDayBucket('not-a-date')).toBe('overnight')
  })
})
