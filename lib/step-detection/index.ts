/**
 * Step Detection System - Main Export
 *
 * Central export point for all step detection functionality
 */

// Type exports
export type {
  AccelerometerData,
  StepDetectionConfig,
  StepCounterState,
  CalibrationData,
  StepValidationResult,
  SensorStatus,
  StepLogEntry
} from './types'

// Algorithm exports
export {
  calculateMagnitude,
  applySmoothingFilter,
  detectPeak,
  isValidStep,
  processSample,
  resetSession,
  resetAll,
  mergeConfig,
  DEFAULT_CONFIG,
  INITIAL_STATE
} from './algorithm'

// Sensor exports
export {
  isSensorAvailable,
  needsPermission,
  requestMotionPermission,
  getSensorStatus,
  getSampleRate,
  startSensor,
  stopSensor,
  initializeSensor,
  testSensor
} from './sensor'

// Calibration exports
export {
  startCalibration,
  processCalibrationSample,
  recordCalibrationStep,
  finishCalibration,
  getCalibrationProgress,
  isCalibrating,
  saveCalibration,
  loadCalibration,
  clearCalibration,
  resetCalibration
} from './calibration'
