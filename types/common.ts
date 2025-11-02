/**
 * Common type utilities for the application
 *
 * This file contains shared types used across the codebase
 * to maintain type safety and reduce `any` usage.
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Firebase timestamp that can be a Firestore Timestamp, Date, or ISO string
 * Used for fields that come from Firestore and may be in different formats
 */
export type FirebaseTimestamp = Timestamp | Date | string

/**
 * JSON-serializable value types
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export type JsonArray = JsonValue[]

/**
 * Unknown record type for dynamic objects with unknown structure
 * Prefer this over `any` for objects that need runtime validation
 */
export type UnknownRecord = Record<string, unknown>

/**
 * Type guard to check if value is a Firestore Timestamp
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return value != null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
}

/**
 * Convert Firebase timestamp to Date
 */
export function toDate(timestamp: FirebaseTimestamp): Date {
  if (isTimestamp(timestamp)) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  return new Date(timestamp)
}

/**
 * Error type for unknown errors (use in catch blocks instead of `any`)
 */
export type UnknownError = unknown

/**
 * Type guard to check if value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: UnknownError): string {
  if (isError(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'An unknown error occurred'
}
