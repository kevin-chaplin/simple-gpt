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

const settingsFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  notifications: z.boolean(),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

export default function SettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      theme: (mounted && (theme as "light" | "dark" | "system")) || "system",
      notifications: true,
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
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
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
            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Notifications</FormLabel>
                    <FormDescription>Receive notifications about your conversations and updates.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
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
