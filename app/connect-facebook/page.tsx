'use client'

import { useEffect } from 'react'

export default function ConnectFacebookPage() {
  useEffect(() => {
    // Immediately redirect to Facebook OAuth
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    
    const permissions = [
      'pages_show_list',
      'pages_read_engagement', 
      'pages_manage_metadata',
      'leads_retrieval',
      'ads_read',
      'ads_management',
      'business_management',
      'email',
      'public_profile'
    ]

    const scope = permissions.join(',')
    const state = 'atlas_fitness_oauth'
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `response_type=code&` +
      `auth_type=rerequest` // Force re-authorization

    console.log('Redirecting to Facebook OAuth...')
    console.log('App ID:', appId)
    console.log('Redirect URI:', redirectUri)
    
    // Small delay to show the page briefly
    setTimeout(() => {
      window.location.href = oauthUrl
    }, 1000)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          Connecting to Facebook...
        </h1>
        
        <p className="text-gray-400 text-center mb-6">
          You will be redirected to Facebook to authorize the connection.
        </p>
        
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
        
        <div className="mt-8 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
          <p className="text-blue-400 text-sm text-center">
            Make sure to approve all requested permissions for the integration to work properly.
          </p>
        </div>
      </div>
    </div>
  )
}