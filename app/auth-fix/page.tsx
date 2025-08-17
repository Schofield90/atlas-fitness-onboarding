'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader, LogIn } from 'lucide-react'

export default function AuthFixPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Run the fix automatically on page load
    runFix()
  }, [])

  const runFix = async () => {
    setLoading(true)
    setStatus(null)
    
    try {
      const response = await fetch('/api/auth/emergency-fix')
      const data = await response.json()
      setStatus(data)
      
      if (data.success) {
        // Wait 2 seconds then redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error: any) {
      setStatus({
        success: false,
        error: error.message,
        action: 'Please try logging in manually'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    // Don't clear localStorage - just go to login
    window.location.href = '/login'
  }

  const handleDashboard = () => {
    window.location.href = '/dashboard'
  }

  const handleConnectFacebook = () => {
    window.location.href = '/connect-facebook'
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center">
            <LogIn className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Authentication Fix
        </h1>
        
        {loading && (
          <div className="text-center py-8">
            <Loader className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Fixing authentication...</p>
          </div>
        )}
        
        {status && !loading && (
          <div className={`p-4 rounded-lg mb-6 ${
            status.success 
              ? 'bg-green-900/30 border border-green-600' 
              : 'bg-red-900/30 border border-red-600'
          }`}>
            <div className="flex items-start gap-3">
              {status.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={status.success ? 'text-green-400' : 'text-red-400'}>
                  {status.message}
                </p>
                {status.action && (
                  <p className="text-gray-400 text-sm mt-2">
                    {status.action}
                  </p>
                )}
                {status.user_id && (
                  <div className="mt-3 text-xs text-gray-500">
                    <div>User ID: {status.user_id}</div>
                    <div>Org ID: {status.organization_id}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {!status?.success && (
            <>
              <button
                onClick={runFix}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Running Fix...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Try Fix Again
                  </>
                )}
              </button>
              
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Go to Login (Won't Log Out)
              </button>
            </>
          )}
          
          <button
            onClick={handleDashboard}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg"
          >
            Try Dashboard
          </button>
          
          <button
            onClick={handleConnectFacebook}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Connect Facebook (After Login)
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
          <h3 className="text-blue-400 font-semibold mb-2">Instructions:</h3>
          <ol className="text-blue-300 text-sm space-y-1 list-decimal list-inside">
            <li>This page fixes auth without logging you out</li>
            <li>If successful, you'll be redirected to dashboard</li>
            <li>If not, click "Go to Login" (won't clear session)</li>
            <li>Once logged in, use "Connect Facebook" to fix integration</li>
          </ol>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            DO NOT use the red "Clear All Data" button - it causes the logout loop
          </p>
        </div>
      </div>
    </div>
  )
}