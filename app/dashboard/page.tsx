"use client"

import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Redirect to the home page since we've moved the chat interface there
  redirect('/')
  
  // This part will never be executed due to the redirect
  return null
}
