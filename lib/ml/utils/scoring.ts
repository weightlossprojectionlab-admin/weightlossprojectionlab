/**
 * ML Scoring Utilities
 * Helper functions for ML scoring and normalization
 */

/**
 * Normalize score to 0-1 range
 */
export function normalizeScore(score: number, min: number = 0, max: number = 100): number {
  if (max === min) return 0
  return Math.max(0, Math.min(1, (score - min) / (max - min)))
}

/**
 * Calculate weighted average
 */
export function weightedAverage(scores: number[], weights: number[]): number {
  if (scores.length !== weights.length) {
    throw new Error('Scores and weights must have same length')
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return 0

  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0)
  return weightedSum / totalWeight
}

/**
 * Apply sigmoid function for smooth scoring
 */
export function sigmoid(x: number, midpoint: number = 0, steepness: number = 1): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)))
}

/**
 * Calculate confidence interval
 */
export function confidenceInterval(
  score: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  // Simple approximation using normal distribution
  const z = confidenceLevel === 0.95 ? 1.96 : 2.576 // 95% or 99%
  const stderr = Math.sqrt((score * (1 - score)) / sampleSize)
  const margin = z * stderr

  return {
    lower: Math.max(0, score - margin),
    upper: Math.min(1, score + margin),
  }
}

/**
 * Combine multiple scores using different strategies
 */
export function combineScores(
  scores: number[],
  strategy: 'average' | 'max' | 'min' | 'product' = 'average'
): number {
  if (scores.length === 0) return 0

  switch (strategy) {
    case 'average':
      return scores.reduce((sum, s) => sum + s, 0) / scores.length
    case 'max':
      return Math.max(...scores)
    case 'min':
      return Math.min(...scores)
    case 'product':
      return scores.reduce((product, s) => product * s, 1)
    default:
      return scores.reduce((sum, s) => sum + s, 0) / scores.length
  }
}

/**
 * Apply threshold to score
 */
export function applyThreshold(
  score: number,
  threshold: number,
  hardThreshold: boolean = false
): number {
  if (hardThreshold) {
    return score >= threshold ? 1 : 0
  }
  return score >= threshold ? score : 0
}

/**
 * Calculate percentile rank
 */
export function percentileRank(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = sorted.findIndex(v => v >= value)

  if (index === -1) return 1 // Value is greater than all
  if (index === 0) return 0 // Value is less than or equal to all

  return index / sorted.length
}

/**
 * Smooth score using moving average
 */
export function smoothScore(scores: number[], windowSize: number = 3): number[] {
  if (windowSize <= 1) return scores

  const smoothed: number[] = []

  for (let i = 0; i < scores.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(scores.length, i + Math.ceil(windowSize / 2))
    const window = scores.slice(start, end)
    const avg = window.reduce((sum, s) => sum + s, 0) / window.length
    smoothed.push(avg)
  }

  return smoothed
}

/**
 * Calculate score buckets/bins
 */
export function scoreToBucket(
  score: number,
  buckets: Array<{ min: number; max: number; label: string }>
): string {
  const bucket = buckets.find(b => score >= b.min && score <= b.max)
  return bucket?.label || 'unknown'
}

/**
 * Standard score buckets for confidence
 */
export const CONFIDENCE_BUCKETS = [
  { min: 0, max: 0.3, label: 'low' },
  { min: 0.3, max: 0.6, label: 'medium' },
  { min: 0.6, max: 0.8, label: 'high' },
  { min: 0.8, max: 1.0, label: 'very_high' },
]

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  return scoreToBucket(score, CONFIDENCE_BUCKETS) as any
}
