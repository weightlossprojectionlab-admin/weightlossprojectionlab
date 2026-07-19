/**
 * Time-of-day bucketing — the single source for "which part of the day was
 * this reading taken?" Used to segment clinically distinct vitals (fasting
 * vs post-meal glucose, morning vs evening blood pressure) so they aren't
 * pooled into one misleading trend line.
 *
 * When an IANA `timezone` is supplied (e.g. from a patient's vital schedule,
 * types/vital-schedules.ts), the bucket reflects the patient's LOCAL wall-clock
 * hour. Without it we fall back to the UTC hour — which still SEPARATES a given
 * patient's morning vs evening readings (their offset is constant), so grouping
 * stays correct even though the label may be shifted. Callers that surface the
 * label to a human should pass a timezone.
 *
 * Dependency-free (uses the built-in Intl API, which reliably throws on an
 * invalid IANA string) so both server crons and client components can share
 * it — DRY: no surface should re-derive time-of-day inline.
 */

export type TimeOfDayBucket = 'overnight' | 'morning' | 'afternoon' | 'evening'

/**
 * Map a 0–23 hour to a bucket. Boundaries are chosen to separate a typical
 * fasting/early-morning reading from afternoon and evening (post-meal) ones.
 */
export function bucketForHour(hour: number): TimeOfDayBucket {
  if (hour < 5) return 'overnight' // 00:00–04:59
  if (hour < 12) return 'morning' // 05:00–11:59
  if (hour < 17) return 'afternoon' // 12:00–16:59
  return 'evening' // 17:00–23:59
}

/** The bucket a reading falls into, in the patient's local time when `timezone` is given. */
export function timeOfDayBucket(at: Date | string, timezone?: string): TimeOfDayBucket {
  const d = typeof at === 'string' ? new Date(at) : at
  if (isNaN(d.getTime())) return 'overnight' // safe default; callers filter invalid dates upstream
  if (timezone) {
    try {
      // Intl throws RangeError on an invalid IANA zone; h23 gives a 00–23 hour.
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hourCycle: 'h23',
        hour: '2-digit',
      }).formatToParts(d)
      const hour = Number(parts.find(p => p.type === 'hour')?.value)
      if (Number.isFinite(hour)) return bucketForHour(hour % 24) // %24 guards the midnight '24' edge case
    } catch {
      // Unknown/invalid IANA string — fall through to UTC.
    }
  }
  return bucketForHour(d.getUTCHours())
}

/** Human phrase for a bucket, for caregiver-facing copy. */
export function timeOfDayLabel(bucket: TimeOfDayBucket): string {
  return bucket // labels already read naturally ('morning', 'evening', …)
}
