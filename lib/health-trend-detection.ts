/**
 * Health Trend Detection — pure, server-safe directional-trend analysis.
 *
 * Given a series of dated vital readings, fit a least-squares trend line and
 * decide whether the reading is drifting *toward* (or past) a concerning
 * threshold, with enough data + fit to be worth surfacing. Deliberately
 * conservative and INFORMATIONAL — this flags a direction to watch, it does
 * not diagnose. All thresholds are passed in (see lib/vital-thresholds.ts),
 * so this module stays pure: no Firebase, no 'use client', easily unit-tested.
 */

export interface TrendPoint {
  /** Reading value (for BP, pass systolic or diastolic separately). */
  value: number
  /** When the reading was taken. */
  at: Date
}

/** Warning/critical band for a single scalar metric. */
export interface ThresholdBand {
  /** Below this is a low-side warning. */
  warnLow?: number
  /** Above this is a high-side warning. */
  warnHigh?: number
  /** Below this is critical-low. */
  critLow?: number
  /** Above this is critical-high. */
  critHigh?: number
  unit?: string
}

export type TrendConfidence = 'low' | 'moderate' | 'high'

export interface TrendFinding {
  direction: 'rising' | 'falling'
  currentValue: number
  /** Projected value `horizonDays` out along the trend line. */
  projectedValue: number
  /** The nearer threshold the trend is heading toward. */
  threshold: number
  thresholdKind: 'warnHigh' | 'warnLow' | 'critHigh' | 'critLow'
  /** Estimated days until the trend line crosses that threshold (>=0). */
  daysToThreshold: number
  /** 'watch' = heading toward a warning band; 'concern' = already crossing / heading to critical. */
  severity: 'watch' | 'concern'
  confidence: TrendConfidence
  slopePerDay: number
  rSquared: number
  sampleSize: number
  spanDays: number
}

export interface TrendConfig {
  /** Minimum readings required to attempt a trend. */
  minReadings?: number
  /** Minimum days the readings must span. */
  minSpanDays?: number
  /** Minimum R² for the fit to be trustworthy enough to surface. */
  minRSquared?: number
  /** How many days ahead to project. */
  horizonDays?: number
  /** Only surface if the threshold crossing is within this many days. */
  maxDaysToThreshold?: number
}

const DEFAULTS: Required<TrendConfig> = {
  minReadings: 4,
  minSpanDays: 3,
  minRSquared: 0.5,
  horizonDays: 14,
  maxDaysToThreshold: 30,
}

interface Regression {
  slope: number
  intercept: number
  rSquared: number
}

/** Least-squares linear fit of y over x. Returns null if degenerate. */
export function linearRegression(points: Array<{ x: number; y: number }>): Regression | null {
  const n = points.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0
  for (const { x, y } of points) {
    sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null // all x identical
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  // R² = 1 - SSres/SStot
  const meanY = sy / n
  let ssRes = 0, ssTot = 0
  for (const { x, y } of points) {
    const pred = slope * x + intercept
    ssRes += (y - pred) ** 2
    ssTot += (y - meanY) ** 2
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)
  return { slope, intercept, rSquared }
}

function confidenceFor(rSquared: number, n: number): TrendConfidence {
  if (n >= 8 && rSquared >= 0.8) return 'high'
  if (n >= 5 && rSquared >= 0.65) return 'moderate'
  return 'low'
}

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Analyze a single metric's readings for a concerning directional trend.
 * Returns null when there isn't enough data, the fit is too weak, the trend is
 * flat/away from any threshold, or the crossing is too far out.
 */
export function detectVitalTrend(
  readings: TrendPoint[],
  band: ThresholdBand,
  config: TrendConfig = {}
): TrendFinding | null {
  const cfg = { ...DEFAULTS, ...config }
  const valid = readings
    .filter(r => Number.isFinite(r.value) && r.at instanceof Date && !isNaN(r.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  if (valid.length < cfg.minReadings) return null

  const t0 = valid[0].at.getTime()
  const points = valid.map(r => ({ x: (r.at.getTime() - t0) / DAY_MS, y: r.value }))
  const spanDays = points[points.length - 1].x
  if (spanDays < cfg.minSpanDays) return null

  const reg = linearRegression(points)
  if (!reg || reg.rSquared < cfg.minRSquared) return null
  if (reg.slope === 0) return null

  const lastX = points[points.length - 1].x
  const currentValue = valid[valid.length - 1].value
  const projectedValue = reg.slope * (lastX + cfg.horizonDays) + reg.intercept
  const rising = reg.slope > 0

  // Pick the nearest threshold the trend is heading toward.
  type Candidate = { kind: TrendFinding['thresholdKind']; value: number; severity: 'watch' | 'concern' }
  const candidates: Candidate[] = []
  if (rising) {
    if (band.warnHigh != null) candidates.push({ kind: 'warnHigh', value: band.warnHigh, severity: 'watch' })
    if (band.critHigh != null) candidates.push({ kind: 'critHigh', value: band.critHigh, severity: 'concern' })
  } else {
    if (band.warnLow != null) candidates.push({ kind: 'warnLow', value: band.warnLow, severity: 'watch' })
    if (band.critLow != null) candidates.push({ kind: 'critLow', value: band.critLow, severity: 'concern' })
  }
  if (candidates.length === 0) return null

  // Days until the trend line reaches each threshold; keep the soonest future crossing.
  let best: { cand: Candidate; days: number } | null = null
  for (const cand of candidates) {
    const xAtThreshold = (cand.value - reg.intercept) / reg.slope
    const days = xAtThreshold - lastX
    // Heading toward it (future or already at/over it) and within the horizon window.
    if (days <= cfg.maxDaysToThreshold) {
      if (!best || days < best.days) best = { cand, days }
    }
  }
  if (!best) return null

  const daysToThreshold = Math.max(0, Math.round(best.days))
  // Escalate severity if the projected value already crosses the threshold.
  const crossesInHorizon = rising ? projectedValue >= best.cand.value : projectedValue <= best.cand.value
  const severity: 'watch' | 'concern' =
    best.cand.severity === 'concern' || (crossesInHorizon && daysToThreshold <= cfg.horizonDays)
      ? best.cand.severity === 'concern' ? 'concern' : 'watch'
      : best.cand.severity

  return {
    direction: rising ? 'rising' : 'falling',
    currentValue: Math.round(currentValue * 10) / 10,
    projectedValue: Math.round(projectedValue * 10) / 10,
    threshold: best.cand.value,
    thresholdKind: best.cand.kind,
    daysToThreshold,
    severity,
    confidence: confidenceFor(reg.rSquared, valid.length),
    slopePerDay: Math.round(reg.slope * 100) / 100,
    rSquared: Math.round(reg.rSquared * 100) / 100,
    sampleSize: valid.length,
    spanDays: Math.round(spanDays),
  }
}

/** A trend finding annotated with the reading group it came from (e.g. a time-of-day bucket). */
export interface GroupedTrendFinding extends TrendFinding {
  /** The group key this finding was fit within; undefined when readings weren't grouped. */
  group?: string
}

const SEVERITY_RANK: Record<TrendFinding['severity'], number> = { concern: 2, watch: 1 }
const CONFIDENCE_RANK: Record<TrendConfidence, number> = { high: 3, moderate: 2, low: 1 }

/**
 * Pick the single most clinically urgent finding: highest severity first, then
 * highest confidence, then the soonest projected threshold crossing.
 */
export function mostConcerningTrend(findings: GroupedTrendFinding[]): GroupedTrendFinding | null {
  if (findings.length === 0) return null
  return findings.reduce((best, f) => {
    if (SEVERITY_RANK[f.severity] !== SEVERITY_RANK[best.severity])
      return SEVERITY_RANK[f.severity] > SEVERITY_RANK[best.severity] ? f : best
    if (CONFIDENCE_RANK[f.confidence] !== CONFIDENCE_RANK[best.confidence])
      return CONFIDENCE_RANK[f.confidence] > CONFIDENCE_RANK[best.confidence] ? f : best
    return f.daysToThreshold < best.daysToThreshold ? f : best
  })
}

/**
 * Like detectVitalTrend, but first partitions readings by an optional `group`
 * key (e.g. a time-of-day bucket) and fits each group independently, then
 * returns the single most concerning finding across groups.
 *
 * This is the fix for pooling clinically distinct readings — a fasting-morning
 * glucose downtrend and post-dinner spikes must not average into one line. Each
 * group needs its own minReadings/span/fit to surface, so this is conservative
 * by construction: a series too sparse once split simply yields no alert.
 * Points with no `group` fall into a single shared bucket (== ungrouped).
 */
export function detectVitalTrendGrouped(
  readings: Array<TrendPoint & { group?: string }>,
  band: ThresholdBand,
  config: TrendConfig = {}
): GroupedTrendFinding | null {
  const groups = new Map<string, TrendPoint[]>()
  for (const r of readings) {
    const key = r.group ?? '_all'
    const pt = { value: r.value, at: r.at }
    const arr = groups.get(key)
    if (arr) arr.push(pt)
    else groups.set(key, [pt])
  }

  const findings: GroupedTrendFinding[] = []
  for (const [key, pts] of groups.entries()) {
    const f = detectVitalTrend(pts, band, config)
    if (f) findings.push(key === '_all' ? { ...f } : { ...f, group: key })
  }
  return mostConcerningTrend(findings)
}
