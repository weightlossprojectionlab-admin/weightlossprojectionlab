import {
  detectVitalTrend,
  detectVitalTrendGrouped,
  mostConcerningTrend,
  linearRegression,
  type TrendPoint,
  type ThresholdBand,
  type GroupedTrendFinding,
} from './health-trend-detection'

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

/** Tag a value series with a fixed group label. */
function grouped(values: number[], group: string, stepDays = 2): Array<TrendPoint & { group: string }> {
  return series(values, stepDays).map(p => ({ ...p, group }))
}

const GLUCOSE: ThresholdBand = { warnLow: 70, critLow: 54, warnHigh: 180, critHigh: 250, unit: 'mg/dL' }

describe('detectVitalTrendGrouped', () => {
  it('isolates a rising fasting-morning glucose from flat evening readings (no pooling)', () => {
    // Morning readings climb toward the 180 high warning; evening readings are flat.
    // Pooled, the flat evenings would flatten the slope and mask the morning trend.
    const morning = grouped([120, 132, 144, 156, 168, 178], 'morning')
    const evening = grouped([110, 112, 109, 111, 110, 112], 'evening')
    const f = detectVitalTrendGrouped([...morning, ...evening], GLUCOSE)
    expect(f).not.toBeNull()
    expect(f!.direction).toBe('rising')
    expect(f!.thresholdKind).toBe('warnHigh')
    expect(f!.group).toBe('morning')
  })

  it('behaves like the pooled fit when readings have no group', () => {
    const points = series([122, 126, 129, 132, 135, 138]).map(p => ({ ...p })) // no group
    const groupedFinding = detectVitalTrendGrouped(points, SYSTOLIC)
    const pooledFinding = detectVitalTrend(series([122, 126, 129, 132, 135, 138]), SYSTOLIC)
    expect(groupedFinding).not.toBeNull()
    expect(groupedFinding!.group).toBeUndefined()
    expect(groupedFinding!.direction).toBe(pooledFinding!.direction)
    expect(groupedFinding!.thresholdKind).toBe(pooledFinding!.thresholdKind)
  })

  it('returns null when every group is individually too sparse (conservative by construction)', () => {
    // 6 rising readings split across 3 buckets = 2 each, below minReadings(4).
    const f = detectVitalTrendGrouped(
      [
        ...grouped([120, 140], 'morning'),
        ...grouped([130, 150], 'afternoon'),
        ...grouped([135, 160], 'evening'),
      ],
      GLUCOSE
    )
    expect(f).toBeNull()
  })
})

describe('mostConcerningTrend', () => {
  const base: GroupedTrendFinding = {
    direction: 'rising', currentValue: 100, projectedValue: 150, threshold: 140,
    thresholdKind: 'warnHigh', daysToThreshold: 10, severity: 'watch', confidence: 'moderate',
    slopePerDay: 1, rSquared: 0.7, sampleSize: 6, spanDays: 10,
  }
  it('prefers concern over watch', () => {
    const pick = mostConcerningTrend([base, { ...base, severity: 'concern', group: 'x' }])
    expect(pick!.group).toBe('x')
  })
  it('breaks ties on confidence, then soonest crossing', () => {
    const pick = mostConcerningTrend([
      { ...base, confidence: 'moderate', group: 'a' },
      { ...base, confidence: 'high', group: 'b' },
    ])
    expect(pick!.group).toBe('b')
    const pick2 = mostConcerningTrend([
      { ...base, daysToThreshold: 10, group: 'a' },
      { ...base, daysToThreshold: 3, group: 'b' },
    ])
    expect(pick2!.group).toBe('b')
  })
  it('returns null for no findings', () => {
    expect(mostConcerningTrend([])).toBeNull()
  })
})
