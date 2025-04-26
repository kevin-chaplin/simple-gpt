"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Brain } from "lucide-react"

interface SignUpPromptProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
}

export function SignUpPrompt({ open = true, onOpenChange, onClose }: SignUpPromptProps) {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  console.log('SignUpPrompt rendered with open =', open)

  const handleSignUp = () => {
    console.log('SignUp button clicked')
    setIsRedirecting(true)
    router.push("/sign-up")
  }

  const handleSignIn = () => {
    console.log('SignIn button clicked')
    setIsRedirecting(true)
    router.push("/sign-in")
  }

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    console.log('Dialog open state changed to:', newOpen)
    if (!newOpen && onClose) {
      console.log('Calling onClose callback')
      onClose();
    }
    if (onOpenChange) {
      console.log('Calling onOpenChange callback with:', newOpen)
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md z-[100]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Ready for more?</DialogTitle>
          <DialogDescription className="text-center">
            You've used your free request. Sign up for free to continue using Sensible GPT and get more features.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-3 sm:justify-center">
          <Button
            onClick={handleSignUp}
            disabled={isRedirecting}
            className="flex-1"
          >
            {isRedirecting ? "Redirecting..." : "Sign up for free"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSignIn}
            disabled={isRedirecting}
            className="flex-1"
          >
            I already have an account
          </Button>
        </div>
        <DialogFooter className="sm:justify-center text-center text-sm text-muted-foreground">
          No credit card required. Cancel anytime.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
