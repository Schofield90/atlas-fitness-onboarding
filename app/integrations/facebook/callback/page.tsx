'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function FacebookCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  useEffect(() => {
    // Check URL parameters
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const userName = searchParams.get('user_name')
    const userId = searchParams.get('user_id')
    const storageWarning = searchParams.get('storage_warning')
    
    if (success === 'true') {
      setStatus('success')
      setMessage(`Successfully connected Facebook${userName ? ` as ${userName}` : ''}!`)
      
      // IMPORTANT: Set localStorage values to sync frontend state
      localStorage.setItem('facebook_connected', 'true')
      localStorage.setItem('facebook_connected_at', new Date().toISOString())
      if (userId) localStorage.setItem('facebook_user_id', userId)
      if (userName) localStorage.setItem('facebook_user_name', userName)
      
      // Dispatch storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'facebook_connected',
        newValue: 'true',
        oldValue: null
      }))
      
      if (storageWarning) {
        setDetails('Note: Some database tables may be missing. Contact support if issues persist.')
      } else {
        setDetails('You can now sync Facebook pages and leads.')
      }
      
      // Redirect to Facebook integration management page after 2 seconds
      // This gives time for the database to be updated
      setTimeout(() => {
        router.push('/integrations/facebook?just_connected=true')
      }, 2000)
    } else if (error) {
      setStatus('error')
      setMessage('Failed to connect Facebook')
      
      // Provide user-friendly error messages
      switch(error) {
        case 'access_denied':
          setDetails('You denied the permission request. Please try again and approve all permissions.')
          break
        case 'invalid_state':
          setDetails('Security verification failed. Please try connecting again.')
          break
        case 'no_code':
          setDetails('No authorization code received. Please try again.')
          break
        case 'configuration_error':
          setDetails('App configuration error. Please contact support.')
          break
        case 'authentication_required':
          setDetails('You need to be logged in. Please log in and try again.')
          break
        default:
          setDetails(errorDescription || `Error: ${error}`)
      }
    } else {
      // No parameters, something went wrong
      setStatus('error')
      setMessage('Invalid callback')
      setDetails('No response parameters received from Facebook.')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
            <h1 className="text-xl font-bold text-white text-center">
              Processing Facebook connection...
            </h1>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">
              {message}
            </h1>
            <p className="text-gray-400 text-center mb-6">
              {details}
            </p>
            <div className="text-center">
              <p className="text-sm text-gray-500">Redirecting to settings...</p>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">
              {message}
            </h1>
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
              <p className="text-red-400">
                {details}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/connect-facebook')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg"
              >
                Go to Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h1 className="text-xl font-bold text-white text-center">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <FacebookCallbackContent />
    </Suspense>
  )
}