import { Timestamp, type FieldValue, serverTimestamp } from 'firebase/firestore';

/**
 * Server Timestamp Utilities
 *
 * Centralized timestamp management using Firebase serverTimestamp
 * to ensure consistency and avoid client-side clock skew issues.
 */

/**
 * Get a server-side timestamp for Firestore documents
 *
 * Use this instead of new Date().toISOString() to ensure:
 * - Consistent timestamps across different client time zones
 * - No clock skew issues
 * - Proper ordering in Firestore queries
 *
 * @example
 * await setDoc(docRef, {
 *   ...data,
 *   createdAt: timestamp(),
 *   updatedAt: timestamp()
 * })
 */
export function timestamp(): FieldValue {
  return serverTimestamp()
}

/**
 * Get current ISO timestamp (for non-Firestore use cases)
 * Use sparingly - prefer timestamp() for Firestore operations
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Create timestamps object for new documents
 */
export function createTimestamps() {
  const ts = timestamp()
  return {
    createdAt: ts,
    updatedAt: ts
  }
}

/**
 * Create update timestamp for existing documents
 */
export function updateTimestamp() {
  return {
    updatedAt: timestamp()
  }
}

/**
 * Convert Firestore Timestamp to JavaScript Date
 * Handles both Timestamp objects and objects with seconds/nanoseconds
 */
export function timestampToDate(timestamp: Timestamp | FieldValue | { seconds: number; nanoseconds: number } | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }

  // Handle plain objects with seconds and nanoseconds
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }

  throw new Error('Invalid timestamp format');
}

/**
 * Format Firestore Timestamp to localized date string
 */
export function formatTimestamp(timestamp: Timestamp | FieldValue | { seconds: number; nanoseconds: number } | Date | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }
  try {
    const date = timestampToDate(timestamp);
    return date.toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format Firestore Timestamp to localized date and time string
 */
export function formatTimestampWithTime(timestamp: Timestamp | FieldValue | { seconds: number; nanoseconds: number } | Date | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }
  try {
    const date = timestampToDate(timestamp);
    return date.toLocaleString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Check if a Firestore Timestamp is in the past
 */
export function isTimestampPast(timestamp: Timestamp | FieldValue | { seconds: number; nanoseconds: number } | Date): boolean {
  try {
    const date = timestampToDate(timestamp);
    return date < new Date();
  } catch {
    return false;
  }
}

/**
 * Check if a Firestore Timestamp is in the future
 */
export function isTimestampFuture(timestamp: Timestamp | FieldValue | { seconds: number; nanoseconds: number } | Date): boolean {
  try {
    const date = timestampToDate(timestamp);
    return date > new Date();
  } catch {
    return false;
  }
}
