'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      setStatus('error')
      setMessage(`Facebook OAuth error: ${error}`)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No authorization code received from Facebook')
      return
    }

    if (state !== 'atlas_fitness_oauth') {
      setStatus('error')
      setMessage('Invalid OAuth state parameter')
      return
    }

    // Simulate successful connection (in a real app, you'd exchange the code for a token)
    setTimeout(() => {
      // Store connection status in localStorage for demo purposes
      localStorage.setItem('facebook_connected', 'true')
      localStorage.setItem('facebook_connected_at', new Date().toISOString())
      
      setStatus('success')
      setMessage('Successfully connected to Facebook!')
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    }, 2000)
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full text-center p-6">
        <Link href="/" className="text-2xl font-bold text-orange-500 mb-8 block">
          Atlas Fitness
        </Link>

        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Connecting to Facebook...</h2>
            <p className="text-gray-300">Please wait while we set up your integration.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✓</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-green-400">Connection Successful!</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✗</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-red-400">Connection Failed</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="space-y-3">
              <Link 
                href="/integrations/facebook"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors block"
              >
                Try Again
              </Link>
              <Link 
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors block"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}