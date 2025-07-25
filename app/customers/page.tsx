'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CustomersPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the leads page which manages customers
    router.push('/leads')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-400">Redirecting to customer management...</p>
      </div>
    </div>
  )
}