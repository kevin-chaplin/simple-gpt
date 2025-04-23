"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserProfile } from "@/components/user-profile"

interface HeaderProps {
  onLogoClick?: () => void;
}

export function Header({ onLogoClick }: HeaderProps) {
  const { isSignedIn, isLoaded } = useAuth()

  // Force a re-render when the component mounts to ensure auth state is current
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render the full header once the component has mounted
  // This ensures we have the correct auth state
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center font-bold text-xl text-primary cursor-pointer"
          onClick={(e) => {
            if (onLogoClick) {
              e.preventDefault()
              onLogoClick()
            }
          }}
        >
          Simple GPT
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex gap-4 sm:gap-6">
            {!isSignedIn && (
              <Link href="/pricing" className="text-sm font-medium hover:underline underline-offset-4">
                Pricing
              </Link>
            )}
          </nav>

          {(isLoaded && mounted) && (
            <>
              {isSignedIn ? (
                <UserProfile />
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/sign-in">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
