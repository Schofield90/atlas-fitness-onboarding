'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating')
  const [message, setMessage] = useState('Validating your login link...')
  
  useEffect(() => {
    validateMagicLink()
  }, [])
  
  const validateMagicLink = async () => {
    try {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Invalid login link')
        return
      }
      
      // Call API to validate the token
      const response = await fetch('/api/auth/validate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        setStatus('error')
        setMessage(data.error || 'Invalid or expired login link')
        return
      }
      
      // Sign in the user
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.temporaryPassword // The API will generate a temporary password
      })
      
      if (signInError) {
        // If password sign in fails, try creating a session directly
        // This would require a custom auth solution
        setStatus('error')
        setMessage('Failed to sign in. Please try again.')
        return
      }
      
      setStatus('success')
      setMessage('Login successful! Redirecting...')
      
      // Redirect to member dashboard or booking page
      setTimeout(() => {
        router.push('/member/dashboard')
      }, 1000)
      
    } catch (error) {
      console.error('Magic link error:', error)
      setStatus('error')
      setMessage('An error occurred. Please try again.')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
        {status === 'validating' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Validating Login Link</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Login Successful!</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Login Failed</h2>
            <p className="text-gray-400 mb-4">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}