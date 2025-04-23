"use client"

/**
 * Utility functions to track anonymous user requests
 * This allows new users to try Simple GPT with a limited number of requests
 * before requiring sign-up
 */

// The maximum number of requests allowed for anonymous users
export const ANONYMOUS_REQUEST_LIMIT = 1

/**
 * Check if an anonymous user has exceeded their request limit
 * @returns boolean - true if the user has exceeded their limit
 */
export function hasExceededAnonymousLimit(): boolean {
  // Don't run this check on the server
  if (typeof window === 'undefined') return false
  
  const count = getAnonymousRequestCount()
  return count >= ANONYMOUS_REQUEST_LIMIT
}

/**
 * Get the current number of requests made by an anonymous user
 * @returns number - the number of requests made
 */
export function getAnonymousRequestCount(): number {
  // Don't run this on the server
  if (typeof window === 'undefined') return 0
  
  try {
    const count = localStorage.getItem('anonymousRequestCount')
    return count ? parseInt(count, 10) : 0
  } catch (error) {
    // If localStorage is not available, assume no requests have been made
    console.error('Error accessing localStorage:', error)
    return 0
  }
}

/**
 * Increment the anonymous request count
 * @returns number - the new request count
 */
export function incrementAnonymousRequestCount(): number {
  // Don't run this on the server
  if (typeof window === 'undefined') return 0
  
  try {
    const currentCount = getAnonymousRequestCount()
    const newCount = currentCount + 1
    localStorage.setItem('anonymousRequestCount', newCount.toString())
    return newCount
  } catch (error) {
    console.error('Error updating localStorage:', error)
    return 0
  }
}

/**
 * Reset the anonymous request count
 */
export function resetAnonymousRequestCount(): void {
  // Don't run this on the server
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('anonymousRequestCount')
  } catch (error) {
    console.error('Error clearing localStorage:', error)
  }
}
