"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

const settingsFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Check for success parameter from Stripe checkout
  useEffect(() => {
    if (searchParams.get("success")) {
      setShowSuccessMessage(true)
      toast({
        title: "Payment successful!",
        description: "Thank you for subscribing. Your plan has been upgraded.",
        duration: 5000,
      })

      // Remove the success parameter from the URL
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, toast])

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      theme: (mounted && (theme as "light" | "dark" | "system")) || "system",
    },
  })

  // Update form when theme changes
  useEffect(() => {
    if (mounted && theme) {
      form.setValue("theme", theme as "light" | "dark" | "system")
    }
  }, [mounted, theme, form])

  const onSubmit = async (values: SettingsFormValues) => {
    setIsLoading(true)

    try {
      // Apply theme change
      setTheme(values.theme)

      // Simulate saving other settings
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Account updated",
        description: "Your account settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save account settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and subscription</p>

        {showSuccessMessage && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg">
            <p className="font-medium">Payment successful! Your subscription has been updated.</p>
            <p className="mt-2">Thank you for your subscription. Your new plan is now active.</p>
          </div>
        )}
      </div>
      <div className="bg-card border rounded-lg p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <div className="flex flex-wrap items-center gap-4">
                    <FormControl>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={field.value === "light" ? "default" : "outline"}
                          onClick={() => {
                            field.onChange("light")
                            setTheme("light")
                          }}
                          className="w-24"
                        >
                          Light
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "dark" ? "default" : "outline"}
                          onClick={() => {
                            field.onChange("dark")
                            setTheme("dark")
                          }}
                          className="w-24"
                        >
                          Dark
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "system" ? "default" : "outline"}
                          onClick={() => {
                            field.onChange("system")
                            setTheme("system")
                          }}
                          className="w-24"
                        >
                          System
                        </Button>
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription>Select your preferred theme for the application.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Notifications toggle removed as per user request */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
