import { NextResponse } from 'next/server'
import { emergencyAuth } from '@/app/lib/auth/emergency-auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    const result = await emergencyAuth(email, password)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        isEmergencyMode: result.isEmergencyMode,
        message: result.isEmergencyMode 
          ? 'Logged in via emergency authentication (Supabase is down)'
          : 'Logged in successfully'
      })
    }
    
    return NextResponse.json({
      success: false,
      error: result.error || 'Authentication failed'
    }, { status: 401 })
    
  } catch (error: any) {
    console.error('Emergency login error:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication service error'
    }, { status: 500 })
  }
}