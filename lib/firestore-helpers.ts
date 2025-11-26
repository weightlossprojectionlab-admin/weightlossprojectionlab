/**
 * Firestore Helper Functions
 *
 * Utilities for working with Firestore data
 */

/**
 * Remove undefined values from an object
 * Firestore doesn't allow undefined values - they must be omitted entirely
 *
 * @param obj - Object that may contain undefined values
 * @returns New object with undefined values removed
 */
export function removeUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {}

  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  })

  return result
}

/**
 * Merge objects while filtering out undefined values
 * Useful for merging request data with default values
 *
 * @param base - Base object
 * @param updates - Updates to merge (undefined values will be filtered out)
 * @returns Merged object without undefined values
 */
export function mergeWithoutUndefined<T extends Record<string, any>>(
  base: T,
  updates: Partial<T>
): T {
  const filtered = removeUndefinedValues(updates)
  return { ...base, ...filtered }
}
