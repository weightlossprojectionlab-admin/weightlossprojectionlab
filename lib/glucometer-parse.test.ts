import {
  parseReadingTimestamp,
  isPlausibleGlucose,
  normalizeUnit,
  toVitalDrafts,
} from './glucometer-parse'
import type { GlucometerOCRResponse } from '@/lib/validations/glucometer-ocr'

const NOW = new Date('2026-07-19T12:00:00') // local

describe('parseReadingTimestamp', () => {
  it('parses MM-DD + 12h AM time, inferring the current year', () => {
    const iso = parseReadingTimestamp('07-16', '7:22 AM', NOW)
    const d = new Date(iso!)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // July
    expect(d.getDate()).toBe(16)
    expect(d.getHours()).toBe(7)
    expect(d.getMinutes()).toBe(22)
  })

  it('infers LAST year when the month/day would be in the future', () => {
    // Scanned in July; "12-11" must be last December, not this coming one.
    const iso = parseReadingTimestamp('12-11', '11:31 AM', NOW)
    expect(new Date(iso!).getFullYear()).toBe(2025)
  })

  it('handles PM correctly and midnight/noon edge cases', () => {
    expect(new Date(parseReadingTimestamp('07-16', '1:00 PM', NOW)!).getHours()).toBe(13)
    expect(new Date(parseReadingTimestamp('07-16', '12:00 AM', NOW)!).getHours()).toBe(0)
    expect(new Date(parseReadingTimestamp('07-16', '12:00 PM', NOW)!).getHours()).toBe(12)
  })

  it('accepts 24-hour times and explicit YYYY-MM-DD', () => {
    const d = new Date(parseReadingTimestamp('2026-07-16', '19:05', NOW)!)
    expect(d.getHours()).toBe(19)
    expect(d.getMinutes()).toBe(5)
  })

  it('accepts MM/DD/YYYY and MM/DD/YY forms', () => {
    expect(new Date(parseReadingTimestamp('07/16/2026', '8:00 AM', NOW)!).getFullYear()).toBe(2026)
    expect(new Date(parseReadingTimestamp('07/16/25', '8:00 AM', NOW)!).getFullYear()).toBe(2025)
  })

  it('rolls a bare MM-DD that looks future back to last year (meters never show future dates)', () => {
    // "07-20" scanned on 07-19: ambiguous year → interpret as LAST year, not null.
    expect(new Date(parseReadingTimestamp('07-20', '9:00 AM', NOW)!).getFullYear()).toBe(2025)
  })

  it('rejects an explicit future-year datetime', () => {
    expect(parseReadingTimestamp('2027-01-01', '9:00 AM', NOW)).toBeNull()
  })

  it('rejects garbage and impossible dates', () => {
    expect(parseReadingTimestamp('99-99', '7:22 AM', NOW)).toBeNull()
    expect(parseReadingTimestamp('02-30', '7:22 AM', NOW)).toBeNull() // rolls to March
    expect(parseReadingTimestamp('07-16', '25:00', NOW)).toBeNull()
    expect(parseReadingTimestamp('not a date', 'noon', NOW)).toBeNull()
  })
})

describe('isPlausibleGlucose', () => {
  it('accepts normal mg/dL and rejects OCR garbage', () => {
    expect(isPlausibleGlucose(333, 'mg/dL')).toBe(true)
    expect(isPlausibleGlucose(3330, 'mg/dL')).toBe(false)
    expect(isPlausibleGlucose(5, 'mg/dL')).toBe(false)
  })
  it('uses mmol/L range', () => {
    expect(isPlausibleGlucose(7.2, 'mmol/L')).toBe(true)
    expect(isPlausibleGlucose(333, 'mmol/L')).toBe(false)
  })
})

describe('normalizeUnit', () => {
  it('maps to the two accepted units, default mg/dL', () => {
    expect(normalizeUnit('mg/dL')).toBe('mg/dL')
    expect(normalizeUnit('mmol/L')).toBe('mmol/L')
    expect(normalizeUnit(undefined)).toBe('mg/dL')
    expect(normalizeUnit('MMOL')).toBe('mmol/L')
  })
})

describe('toVitalDrafts', () => {
  const response: GlucometerOCRResponse = {
    unit: 'mg/dL',
    confidence: 90,
    readings: [
      { date: '07-16', time: '6:10 AM', value: 329 },
      { date: '07-16', time: '7:22 AM', value: 333 },
      { date: '07-16', time: '6:30 AM', value: 346 },
      { date: '12-11', time: '11:31 AM', value: 150 },
      { date: 'bad', time: 'bad', value: 100 }, // unparseable → issue, excluded
      { date: '07-15', time: '8:00 AM', value: 3330 }, // implausible → issue, excluded
    ],
  }

  it('sorts newest-first and pre-selects only clean rows', () => {
    const drafts = toVitalDrafts(response, NOW)
    expect(drafts).toHaveLength(6)
    // Newest first: 07-16 7:22 before 6:30 before 6:10, then 12-11 (last year), then issues last.
    expect(drafts[0].rawTime).toBe('7:22 AM')
    expect(drafts[1].rawTime).toBe('6:30 AM')
    expect(drafts[2].rawTime).toBe('6:10 AM')
    // Clean rows are included; problem rows are excluded and carry an issue.
    const included = drafts.filter(d => d.include)
    expect(included).toHaveLength(4)
    const excluded = drafts.filter(d => !d.include)
    expect(excluded).toHaveLength(2)
    expect(excluded.every(d => !!d.issue)).toBe(true)
  })

  it('the three same-morning readings all resolve to distinct minutes (no dedupe collision)', () => {
    const drafts = toVitalDrafts(response, NOW).filter(d => d.rawDate === '07-16')
    const minutes = new Set(drafts.map(d => d.recordedAt))
    expect(minutes.size).toBe(3)
  })
})
