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
import { ArrowLeft } from "lucide-react"

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
      theme: "system",
    },
  })

  // Update form values when theme changes
  useEffect(() => {
    if (mounted) {
      form.setValue("theme", theme as "light" | "dark" | "system")
    }
  }, [theme, form, mounted])

  const onSubmit = async (data: SettingsFormValues) => {
    setIsLoading(true)

    try {
      // Update theme
      setTheme(data.theme)

      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)

      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {showSuccessMessage && (
        <div className="mt-4 mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-lg">
          <p className="font-medium">Payment successful! Your subscription has been updated.</p>
          <p className="mt-2">Thank you for your subscription. Your new plan is now active.</p>
        </div>
      )}

      <div className="bg-card border rounded-lg p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={field.value === "light" ? "default" : "outline"}
                      onClick={() => form.setValue("theme", "light")}
                    >
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "dark" ? "default" : "outline"}
                      onClick={() => form.setValue("theme", "dark")}
                    >
                      Dark
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "system" ? "default" : "outline"}
                      onClick={() => form.setValue("theme", "system")}
                    >
                      System
                    </Button>
                  </div>
                  <FormDescription>
                    Select your preferred theme for the dashboard.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
