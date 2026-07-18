/**
 * Human vital-sign thresholds — canonical, dependency-free source.
 *
 * Standard clinical warning/critical bands for adult human vitals, expressed as
 * ThresholdBand (warnLow/warnHigh/critLow/critHigh). Kept pure (no imports beyond
 * a type) so server code (the trend-alert cron) can use it without dragging in
 * client modules.
 *
 * These mirror lib/illness-detection-engine.ts VITAL_THRESHOLDS.human. TODO
 * (DRY consolidation): migrate that engine to import these bands so the numbers
 * live in exactly one place — deferred here to avoid reshaping its
 * checkAbnormality logic in the same change.
 *
 * NOTE: general adult reference values for INFORMATIONAL trend alerts only —
 * not per-patient clinical targets and not medical advice.
 */

import type { ThresholdBand } from '@/lib/health-trend-detection'

/** Scalar human vitals keyed by VitalType. Blood pressure is handled separately (two components). */
export const HUMAN_VITAL_BANDS: Record<string, ThresholdBand> = {
  temperature: { warnHigh: 100.4, critHigh: 103.0, warnLow: 95.0, unit: '°F' },
  blood_sugar: { warnLow: 70, critLow: 54, warnHigh: 180, critHigh: 250, unit: 'mg/dL' },
  pulse_oximeter: { warnLow: 92, critLow: 88, unit: '%' },
  heart_rate: { warnLow: 50, critLow: 40, warnHigh: 120, critHigh: 150, unit: 'bpm' },
}

/** Blood pressure warning/critical bands, per component (mmHg). */
export const BP_BANDS: { systolic: ThresholdBand; diastolic: ThresholdBand } = {
  systolic: { warnHigh: 140, critHigh: 180, unit: 'mmHg' },
  diastolic: { warnHigh: 90, critHigh: 120, unit: 'mmHg' },
}

/** Human-readable label for a vital type (e.g. 'blood_pressure' -> 'blood pressure'). */
export function vitalLabel(type: string): string {
  return type.replace(/_/g, ' ')
}

/** Returns the scalar band for a human vital type, or null if unsupported/handled elsewhere. */
export function getHumanVitalBand(vitalType: string): ThresholdBand | null {
  return HUMAN_VITAL_BANDS[vitalType] ?? null
}
