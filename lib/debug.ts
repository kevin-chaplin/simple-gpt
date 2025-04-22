// Debug utility functions

/**
 * Enhanced console logging with timestamps and labels
 */
export function logDebug(label: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${label}]`, ...args)
}

/**
 * Enhanced error logging with timestamps and labels
 */
export function logError(label: string, error: any) {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] [${label}] Error:`, error)

  // Log additional details if it's an Error object
  if (error instanceof Error) {
    console.error(`[${timestamp}] [${label}] Error name:`, error.name)
    console.error(`[${timestamp}] [${label}] Error message:`, error.message)
    console.error(`[${timestamp}] [${label}] Error stack:`, error.stack)
  }
}
