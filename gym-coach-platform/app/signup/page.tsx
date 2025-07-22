'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignupRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the actual signup page
    router.push('/auth/signup')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Redirecting to Sign Up...
        </h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  )
}