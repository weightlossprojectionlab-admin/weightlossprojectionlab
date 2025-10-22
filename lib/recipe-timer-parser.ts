/**
 * Recipe Timer Parser
 *
 * Extracts timer durations from recipe step text.
 * Handles various time formats: "5 minutes", "25-30 min", "2-3 hours", "30 seconds"
 */

export interface ParsedTimer {
  duration: number // Duration in seconds
  text: string // Original matched text
  unit: 'seconds' | 'minutes' | 'hours'
}

/**
 * Extract time duration from a recipe step
 * Returns duration in seconds, or null if no timer found
 */
export function extractTimerFromStep(stepText: string): number | null {
  const timer = parseTimer(stepText)
  return timer ? timer.duration : null
}

/**
 * Parse time duration from text
 * Returns full timer info, or null if no timer found
 */
export function parseTimer(text: string): ParsedTimer | null {
  const lowerText = text.toLowerCase()

  // Pattern 1: Range (e.g., "25-30 minutes", "2-3 hours")
  const rangePattern = /(\d+)\s*-\s*(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)/i
  const rangeMatch = lowerText.match(rangePattern)

  if (rangeMatch) {
    const min = parseInt(rangeMatch[1])
    const max = parseInt(rangeMatch[2])
    const avg = (min + max) / 2
    const unit = normalizeUnit(rangeMatch[3])
    const seconds = convertToSeconds(avg, unit)

    return {
      duration: seconds,
      text: rangeMatch[0],
      unit
    }
  }

  // Pattern 2: Single value (e.g., "5 minutes", "30 seconds", "1 hour")
  const singlePattern = /(\d+(?:\.\d+)?)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)/i
  const singleMatch = lowerText.match(singlePattern)

  if (singleMatch) {
    const value = parseFloat(singleMatch[1])
    const unit = normalizeUnit(singleMatch[2])
    const seconds = convertToSeconds(value, unit)

    return {
      duration: seconds,
      text: singleMatch[0],
      unit
    }
  }

  // Pattern 3: Combined format (e.g., "1 hour 30 minutes")
  const combinedPattern = /(\d+)\s*(?:hour|hours|hr|hrs)\s*(?:and)?\s*(\d+)\s*(?:minute|minutes|min|mins)?/i
  const combinedMatch = lowerText.match(combinedPattern)

  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1])
    const minutes = parseInt(combinedMatch[2] || '0')
    const seconds = (hours * 3600) + (minutes * 60)

    return {
      duration: seconds,
      text: combinedMatch[0],
      unit: 'hours'
    }
  }

  return null
}

/**
 * Normalize time unit to standard format
 */
function normalizeUnit(unit: string): 'seconds' | 'minutes' | 'hours' {
  const lower = unit.toLowerCase()

  if (lower.includes('sec')) return 'seconds'
  if (lower.includes('min')) return 'minutes'
  if (lower.includes('hour') || lower.includes('hr')) return 'hours'

  return 'minutes' // Default to minutes
}

/**
 * Convert time value to seconds
 */
function convertToSeconds(value: number, unit: 'seconds' | 'minutes' | 'hours'): number {
  switch (unit) {
    case 'seconds':
      return Math.round(value)
    case 'minutes':
      return Math.round(value * 60)
    case 'hours':
      return Math.round(value * 3600)
  }
}

/**
 * Format seconds into human-readable time
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (remainingSeconds === 0) {
      return `${minutes} min`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const hours = Math.floor(seconds / 3600)
  const remainingMinutes = Math.floor((seconds % 3600) / 60)

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Check if a step needs a timer
 * Returns true if the step contains time-related keywords
 */
export function stepNeedsTimer(stepText: string): boolean {
  const timer = parseTimer(stepText)
  return timer !== null
}

/**
 * Create step timers array from recipe steps
 */
export function createStepTimers(recipeSteps: string[]): {
  stepIndex: number
  stepText: string
  duration: number | null
  status: 'pending'
}[] {
  return recipeSteps.map((step, index) => ({
    stepIndex: index,
    stepText: step,
    duration: extractTimerFromStep(step),
    status: 'pending' as const
  }))
}
