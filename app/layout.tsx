import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from "@clerk/nextjs"
import SupabaseProvider from "@/lib/supabase-provider"
import { LoadingProvider } from "@/components/loading-provider"
import { Favicon } from "@/components/favicon"
import GoogleAnalytics from "@/components/google-analytics"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Sensible GPT - Your Friendly AI Helper",
  description: "A sensible and intuitive AI assistant for everyone",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <Favicon />
          <GoogleAnalytics />
        </head>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <SupabaseProvider>
              <LoadingProvider>
                {children}
                <Toaster />
              </LoadingProvider>
            </SupabaseProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
