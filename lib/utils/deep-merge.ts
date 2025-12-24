/**
 * Deep Merge Utility
 *
 * Safely merges nested objects without losing data.
 * Prevents prototype pollution and handles edge cases.
 */

/**
 * Deep merge two objects, preserving nested structures
 *
 * @param target - Base object
 * @param source - Object to merge into target
 * @returns New merged object (does not mutate inputs)
 *
 * @example
 * const target = { a: { b: 1 }, c: 2 }
 * const source = { a: { d: 3 } }
 * deepMerge(target, source) // { a: { b: 1, d: 3 }, c: 2 }
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  // Prevent prototype pollution
  const output = Object.create(null)

  // Copy all properties from target
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      output[key] = target[key]
    }
  }

  // Merge properties from source
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue

    const sourceValue = source[key]
    const targetValue = output[key]

    // Skip null/undefined
    if (sourceValue === null || sourceValue === undefined) {
      continue
    }

    // Replace arrays (don't merge array elements)
    if (Array.isArray(sourceValue)) {
      output[key] = [...sourceValue]
    }
    // Recursively merge objects
    else if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      output[key] = deepMerge(targetValue || {}, sourceValue)
    }
    // Overwrite primitives
    else {
      output[key] = sourceValue
    }
  }

  return output as T
}
