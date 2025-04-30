import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "@clerk/nextjs/dist/types/server"
import { UserIcon } from "lucide-react"

interface UserAvatarProps {
  user?: any  // Using any here as Clerk's client-side user type is different from server
  className?: string
  size?: "default" | "sm" | "lg"
}

export function UserAvatar({ user, className = "", size = "default" }: UserAvatarProps) {
  // Size classes mapping
  const sizeClasses = {
    default: "h-10 w-10",
    sm: "h-8 w-8",
    lg: "h-14 w-14"
  }
  
  const sizeClass = sizeClasses[size]

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user) return "U"
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    } else if (user.firstName) {
      return user.firstName[0]
    } else if (user.username) {
      return user.username[0]
    } else {
      return "U"
    }
  }
  
  return (
    <Avatar className={`${sizeClass} ${className}`}>
      <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
      <AvatarFallback className="bg-muted">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  )
}
