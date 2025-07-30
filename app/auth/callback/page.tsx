'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      // Check if we have a pending organization from signup
      const pendingOrg = sessionStorage.getItem('pending_organization')
      
      if (pendingOrg) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check if user already has an organization
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .single()
            
          if (!existingOrg) {
            // Create organization
            const { error } = await supabase
              .from('organizations')
              .insert({
                name: pendingOrg,
                owner_id: user.id
              })
              
            if (error) {
              console.error('Error creating organization:', error)
            }
          }
          
          // Clear the pending organization
          sessionStorage.removeItem('pending_organization')
        }
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
    }
    
    handleCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="text-white mt-4">Setting up your account...</p>
      </div>
    </div>
  )
}