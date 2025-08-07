'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import NutritionDashboard from '@/app/components/nutrition/NutritionDashboard'

export default function NutritionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/client-portal/login')
        return
      }

      // Get client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientError || !clientData) {
        // Try by email
        const { data: clientByEmail } = await supabase
          .from('clients')
          .select('*')
          .eq('email', user.email)
          .single()
        
        if (clientByEmail) {
          setClient(clientByEmail)
        }
      } else {
        setClient(clientData)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NutritionDashboard client={client} />
    </div>
  )
}