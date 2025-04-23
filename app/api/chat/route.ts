import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { logDebug, logError } from "@/lib/debug"
import { auth } from "@clerk/nextjs/server"

// System prompt to ensure simple, non-technical responses with good formatting
const SYSTEM_PROMPT = `
You are Simple GPT, a friendly AI assistant designed to help people with everyday questions.

IMPORTANT INSTRUCTIONS:
- Always explain things in very simple terms, as if you're talking to a 5-year-old or an adult with no technical background
- Avoid all technical jargon and complex terminology
- Use short sentences and simple words
- Use everyday examples and analogies that anyone can understand
- If a concept is complex, break it down into very simple parts
- Be warm, friendly, and encouraging
- If you don't know something, say so in a simple way
- Never use programming code in your responses unless specifically asked

FORMATTING INSTRUCTIONS:
- Use proper paragraphs to separate different ideas or topics
- Use bullet points (•) for lists of items or steps
- Use numbered lists (1., 2., 3.) for sequences or instructions
- Use headings for different sections when appropriate
- Add a blank line between paragraphs for better readability
- Keep paragraphs short (3-4 sentences maximum)
- Use bold for important terms or concepts
- Use simple examples to illustrate points

Remember: Your goal is to make information accessible to everyone, regardless of their technical background.
`

export async function POST(req: Request) {
  try {
    // Log that we received a request
    logDebug("API", "Chat API route called")

    // Check if the user is authenticated
    const session = await auth()

    // For authenticated users, proceed normally
    if (session.userId) {
      logDebug("API", `Authenticated request from user: ${session.userId}`)
    } else {
      // For anonymous users, we'll allow the request to proceed
      // The client-side code will handle limiting the number of requests
      logDebug("API", "Anonymous request - client will handle usage limits")
    }

    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      logError("API", `Missing or invalid messages: ${JSON.stringify(messages)}`)
      return new Response(JSON.stringify({ error: "Missing or invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Log the messages we're sending to OpenAI
    logDebug("API", `Sending messages to OpenAI: ${JSON.stringify(messages)}`)

    // Verify we have the API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logError("API", "OPENAI_API_KEY is not set")
      return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Create a streaming response using the AI SDK
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      maxTokens: 1000,
    })

    logDebug("API", "Successfully created streaming response")

    // Return the streaming response
    return result.toDataStreamResponse()
  } catch (error) {
    logError("API", error)

    // Return a more detailed error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
