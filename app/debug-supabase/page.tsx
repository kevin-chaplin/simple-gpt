'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase-provider'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugSupabasePage() {
  const { supabase, isLoaded } = useSupabase()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any | null>(null)
  const [jwtToken, setJwtToken] = useState<string | null>(null)

  // Get JWT token
  useEffect(() => {
    if (user) {
      const getToken = async () => {
        try {
          const token = await user.getToken({ template: 'supabase' })
          setJwtToken(token)
        } catch (err) {
          console.error('Error getting token:', err)
          setError('Failed to get JWT token')
        }
      }
      getToken()
    }
  }, [user])

  // Fetch conversations when supabase client is loaded
  useEffect(() => {
    if (isLoaded && supabase) {
      fetchConversations()
    }
  }, [isLoaded, supabase])

  const fetchConversations = async () => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching conversations...')
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching conversations:', error)
        throw error
      }
      
      console.log('Fetched conversations:', data)
      setConversations(data || [])
    } catch (err: any) {
      console.error('Error fetching conversations:', err)
      setError(err.message || 'Failed to fetch conversations')
    } finally {
      setLoading(false)
    }
  }

  const createTestConversation = async () => {
    if (!supabase || !user) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('Creating test conversation for user:', user.id)
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: user.id,
            title: 'Debug Test Conversation',
          },
        ])
        .select()
      
      if (error) {
        console.error('Error creating test conversation:', error)
        throw error
      }
      
      console.log('Created test conversation:', data)
      setTestResult(data)
      fetchConversations() // Refresh the list
    } catch (err: any) {
      console.error('Error creating test conversation:', err)
      setError(err.message || 'Failed to create test conversation')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || !isUserLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Debug Supabase Connection</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Info</CardTitle>
            <CardDescription>Current authenticated user</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}</p>
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p className="mt-4"><strong>JWT Token:</strong></p>
                <div className="bg-gray-100 p-2 rounded-md mt-1 overflow-auto max-h-32 text-xs">
                  {jwtToken ? jwtToken.substring(0, 20) + '...' : 'No token'}
                </div>
              </div>
            ) : (
              <p>Not signed in</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Test Supabase operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={createTestConversation} 
                disabled={loading || !user}
              >
                Create Test Conversation
              </Button>
              
              <Button 
                onClick={fetchConversations} 
                variant="outline" 
                disabled={loading}
              >
                Refresh Conversations
              </Button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            )}
            
            {testResult && (
              <div className="mt-4 p-4 bg-green-50 text-green-600 rounded-md">
                <p>Test successful!</p>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Fetched from Supabase using the provider</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="p-4 border rounded-md">
                    <p><strong>Title:</strong> {conversation.title}</p>
                    <p><strong>User ID:</strong> {conversation.user_id}</p>
                    <p><strong>Created:</strong> {new Date(conversation.created_at).toLocaleString()}</p>
                    <p><strong>ID:</strong> {conversation.id}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No conversations found</p>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              Total: {conversations.length} conversations
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
