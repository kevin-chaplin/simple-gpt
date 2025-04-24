// Define subscription plan limits (client-side copy)
export const PLAN_LIMITS = {
  free: {
    dailyMessageLimit: 5,
    historyDays: 7
  },
  pro: {
    dailyMessageLimit: Infinity, // Unlimited
    historyDays: 30
  },
  premium: {
    dailyMessageLimit: Infinity, // Unlimited
    historyDays: Infinity // Unlimited
  }
}

/**
 * Format the time until reset in a human-readable format
 * @param milliseconds Time until reset in milliseconds
 * @returns Formatted time string (e.g., "12 hours, 34 minutes")
 */
export function formatTimeUntilReset(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}, ${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}
