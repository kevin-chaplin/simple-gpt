# Simple GPT

A simple and intuitive AI assistant for everyone. This application provides a user-friendly interface to interact with AI, getting answers in simple, easy-to-understand language without technical jargon.

## Features

- User-friendly chat interface
- Simple, jargon-free AI responses
- Light/dark mode support
- Authentication with Clerk
- Data storage with Supabase
- Responsive design for all devices

## Prerequisites

- Node.js 18+ (21+ recommended)
- pnpm package manager

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

## Getting Started

1. Make sure you have Node.js and pnpm installed
2. Clone the repository
3. Install dependencies:
   ```
   pnpm install
   ```
4. Start the development server:
   ```
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

Alternatively, you can use the provided script:
```
./run-dev.sh
```

## Project Structure

- `app/` - Next.js application routes and pages
- `components/` - Reusable UI components
- `lib/` - Utility functions and shared code
- `public/` - Static assets
- `styles/` - Global CSS and styling

## Technologies Used

- Next.js 15
- React 19
- Tailwind CSS
- Clerk Authentication
- Supabase
- OpenAI API
- Shadcn UI Components
