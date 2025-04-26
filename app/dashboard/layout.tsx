import type React from "react"
import Link from "next/link"
import { MessageSquare, Settings, CreditCard } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
            Sensible GPT
          </Link>
          <nav className="flex items-center gap-4 md:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline">Chat</span>
            </Link>
            <Link href="/dashboard/subscription" className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">Subscription</span>
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Account</span>
            </Link>
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium">
              Sign Out
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
