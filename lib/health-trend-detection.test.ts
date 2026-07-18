import { detectVitalTrend, linearRegression, type TrendPoint, type ThresholdBand } from './health-trend-detection'

const DAY = 1000 * 60 * 60 * 24
const BASE = new Date('2026-06-01T09:00:00Z').getTime()

/** Build readings: values[] spaced `stepDays` apart. */
function series(values: number[], stepDays = 2): TrendPoint[] {
  return values.map((value, i) => ({ value, at: new Date(BASE + i * stepDays * DAY) }))
}

const SYSTOLIC: ThresholdBand = { warnHigh: 140, critHigh: 180, unit: 'mmHg' }
const SPO2: ThresholdBand = { warnLow: 92, critLow: 88, unit: '%' }

describe('linearRegression', () => {
  it('fits a clean upward line with r²≈1', () => {
    const reg = linearRegression([0, 1, 2, 3].map(x => ({ x, y: 2 * x + 5 })))
    expect(reg).not.toBeNull()
    expect(reg!.slope).toBeCloseTo(2, 5)
    expect(reg!.intercept).toBeCloseTo(5, 5)
    expect(reg!.rSquared).toBeCloseTo(1, 5)
  })
  it('returns null for degenerate input', () => {
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull()
    expect(linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBeNull() // identical x
  })
})

describe('detectVitalTrend', () => {
  it('flags a rising systolic BP heading toward the warning threshold', () => {
    const f = detectVitalTrend(series([122, 126, 129, 132, 135, 138]), SYSTOLIC)
    expect(f).not.toBeNull()
    expect(f!.direction).toBe('rising')
    expect(f!.thresholdKind).toBe('warnHigh')
    expect(f!.threshold).toBe(140)
    expect(f!.confidence).not.toBe('low') // strong monotonic trend
    expect(f!.daysToThreshold).toBeGreaterThanOrEqual(0)
  })

  it('flags a falling SpO2 heading toward the low warning', () => {
    const f = detectVitalTrend(series([98, 97, 96, 95, 94, 93]), SPO2)
    expect(f).not.toBeNull()
    expect(f!.direction).toBe('falling')
    expect(f!.thresholdKind).toBe('warnLow')
  })

  it('returns null for a flat/noisy series (no real trend)', () => {
    const f = detectVitalTrend(series([120, 121, 119, 120, 121, 119]), SYSTOLIC)
    expect(f).toBeNull()
  })

  it('returns null with too few readings', () => {
    const f = detectVitalTrend(series([120, 128, 136]), SYSTOLIC)
    expect(f).toBeNull()
  })

  it('returns null when rising but no high-side threshold exists', () => {
    const f = detectVitalTrend(series([80, 84, 88, 92, 96, 100]), { warnLow: 60, unit: 'x' })
    expect(f).toBeNull() // rising, but only a low threshold configured
  })

  it('does not fire when the trend heads away from any threshold', () => {
    // Falling systolic (only high thresholds configured) → nothing to warn about.
    const f = detectVitalTrend(series([150, 146, 142, 138, 134, 130]), SYSTOLIC)
    expect(f).toBeNull()
  })
})
