import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔌 Disconnecting Facebook integration')
    
    // Clear the Facebook token cookie
    const cookieStore = cookies()
    cookieStore.delete('fb_token_data')
    
    console.log('✅ Facebook token cookie cleared')
    
    return NextResponse.json({
      success: true,
      message: 'Facebook integration disconnected successfully'
    })
  } catch (error) {
    console.error('❌ Error disconnecting Facebook:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect Facebook integration', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}