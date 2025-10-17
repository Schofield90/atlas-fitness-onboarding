'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function WorkflowTestPage() {
  const [status, setStatus] = useState<string>('Checking...')
  const [authInfo, setAuthInfo] = useState<any>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkEverything()
  }, [])

  const checkEverything = async () => {
    const info: any = {}
    
    try {
      // 1. Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      info.session = { exists: !!session, error: sessionError?.message }
      
      if (!session) {
        setStatus('No session found. Please login.')
        setAuthInfo(info)
        return
      }
      
      // 2. Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      info.user = { 
        exists: !!user, 
        email: user?.email,
        id: user?.id,
        error: userError?.message 
      }
      
      if (!user) {
        setStatus('No user found. Session might be invalid.')
        setAuthInfo(info)
        return
      }
      
      // 3. Check organization
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
        .single()
        
      info.organization = {
        exists: !!orgData,
        data: orgData,
        error: orgError?.message
      }
      
      if (!orgData) {
        setStatus('No organization found. You may need to create one.')
        setAuthInfo(info)
        return
      }
      
      setStatus('✅ All checks passed! You can access workflows.')
      info.summary = {
        authenticated: true,
        organizationId: orgData.organization_id,
        organizationName: orgData.organizations?.name
      }
      
    } catch (error: any) {
      info.error = error.message
      setStatus('Error: ' + error.message)
    }
    
    setAuthInfo(info)
  }

  const login = async () => {
    setStatus('Logging in...')
    const { error } = await supabase.auth.signInWithPassword({
      email: 'sam@atlasfitness.com',
      password: 'password123'
    })
    
    if (error) {
      setStatus('Login failed: ' + error.message)
    } else {
      setStatus('Login successful! Rechecking...')
      setTimeout(() => checkEverything(), 1000)
    }
  }

  const createOrganization = async () => {
    setStatus('Creating organization...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setStatus('No user found')
      return
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Atlas Fitness' })
      .select()
      .single()
      
    if (orgError) {
      setStatus('Failed to create organization: ' + orgError.message)
      return
    }
    
    // Link user to organization
    const { error: linkError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'owner'
      })
      
    if (linkError) {
      setStatus('Failed to link organization: ' + linkError.message)
      return
    }
    
    setStatus('Organization created! Rechecking...')
    setTimeout(() => checkEverything(), 1000)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Workflow Authentication Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>
          
          <div className="space-y-2">
            <button
              onClick={checkEverything}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-2"
            >
              Recheck Status
            </button>
            
            {!authInfo.session?.exists && (
              <button
                onClick={login}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-2"
              >
                Quick Login
              </button>
            )}
            
            {authInfo.user?.exists && !authInfo.organization?.exists && (
              <button
                onClick={createOrganization}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded mr-2"
              >
                Create Organization
              </button>
            )}
            
            {authInfo.summary?.authenticated && (
              <button
                onClick={() => router.push('/automations/builder/new')}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
              >
                Go to Workflow Builder
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="text-xs overflow-auto bg-gray-900 p-4 rounded">
            {JSON.stringify(authInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}