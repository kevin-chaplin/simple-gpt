import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Create route matcher for protected routes
const isProtected = createRouteMatcher([
  // Protected routes that require authentication
  '/api/(.*)',
  '/trpc/(.*)',
  '/dashboard(.*)',
  // Changed to match any account route pattern without conflicting
  '/account(.*)',
  // Profile routes - ensure we specify the parent route only
  '/profile',
]);

export default clerkMiddleware({
  // Only run authentication on protected routes
  publicRoutes: (req) => !isProtected(req),
});

export const config = {
  matcher: [
    // Static files and Next.js internals are excluded
    '/((?!_next|api|trpc).*)',
    '/api/(.*)',
    '/trpc/(.*)',
    // Add profile to the matcher but not the catch-all routes
    '/profile',
  ],
};
