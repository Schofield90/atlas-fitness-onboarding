import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Since we're using localStorage for demo purposes, we need to simulate
    // what a real integration check would look like
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      integration_type: 'facebook',
      storage_method: 'localStorage (demo)',
      note: 'In production, this would check database records and validate tokens',
      connection_flow: {
        step1: 'User clicks Connect Facebook',
        step2: 'Redirects to Facebook OAuth',
        step3: 'Facebook redirects to /api/auth/facebook/callback',
        step4: 'API validates and redirects to /integrations/facebook/callback',
        step5: 'Frontend callback page sets localStorage and redirects to dashboard'
      },
      potential_issues: [
        'localStorage not set if user closed page before callback completion',
        'Different pages checking localStorage at different times',
        'Browser localStorage cleared or privacy settings',
        'User directly navigated without completing OAuth flow'
      ],
      recommended_checks: [
        'Check if localStorage.getItem("facebook_connected") === "true"',
        'Check if localStorage.getItem("facebook_connected_at") exists',
        'Verify timestamp is recent',
        'In production: validate token with Facebook API'
      ]
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get debug info', details: error }, 
      { status: 500 }
    )
  }
}