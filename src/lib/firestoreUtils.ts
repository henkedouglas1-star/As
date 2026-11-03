/**
 * Firestore Utilities
 * Ensures all update and write payloads are sanitized to prevent:
 * "Function updateDoc() called with invalid data. Unsupported field value: undefined"
 */

/**
 * Recursively removes all `undefined` properties from an object or nested object.
 * Preserves `null`, `false`, `0`, `""`, Dates, Arrays, and valid values.
 */
export function cleanFirestorePayload<T extends Record<string, any>>(data: T): Partial<T> {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanFirestorePayload(item) : item)) as any;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Exclude undefined completely from payload
      continue;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      const nested = cleanFirestorePayload(value);
      // Keep object even if empty, or keep nested structure
      cleaned[key] = nested;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as Partial<T>;
}

/**
 * Friendly user-facing error message generator.
 * Hides raw Firestore internal exceptions and document IDs from end users.
 */
export function getFriendlyErrorMessage(err: unknown, defaultMessage = 'Couldn’t save your changes. Please try again.'): string {
  if (!err) return defaultMessage;
  const rawMsg = err instanceof Error ? err.message : String(err);

  // If it's already a clean user-intended message
  if (
    rawMsg.startsWith('Please ') ||
    rawMsg.startsWith('Username ') ||
    rawMsg.startsWith('Image ') ||
    rawMsg.includes('valid amount')
  ) {
    return rawMsg;
  }

  // Hide raw internal errors (e.g. FirebaseError, updateDoc, undefined, Firestore, etc.)
  if (
    rawMsg.includes('updateDoc') ||
    rawMsg.includes('setDoc') ||
    rawMsg.includes('Firestore') ||
    rawMsg.includes('Unsupported field value') ||
    rawMsg.includes('permission-denied') ||
    rawMsg.includes('projects/') ||
    rawMsg.includes('documents/')
  ) {
    return defaultMessage;
  }

  return defaultMessage;
}
