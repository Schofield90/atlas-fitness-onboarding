'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Immediately check if user is logged in and redirect to dashboard
    const checkAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has an organization
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        if (!userOrg) {
          // Try to create default organization association
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single()
          
          if (orgs) {
            await supabase
              .from('user_organizations')
              .insert({
                user_id: user.id,
                organization_id: orgs.id,
                role: 'member'
              })
          }
        }
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        // Not logged in, go to login
        router.push('/login')
      }
    }
    
    checkAndRedirect()
  }, [router, supabase])

  // Show loading spinner while checking
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Setting up your account...</p>
      </div>
    </div>
  )
}