import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // In a real app, this would check the database for integration records
    // For demo purposes, we'll simulate what the status should look like
    
    const status = {
      connected: false,
      connection_method: 'localStorage_demo',
      last_check: new Date().toISOString(),
      message: 'Use client-side localStorage check for demo',
      debug_instructions: {
        client_check: 'localStorage.getItem("facebook_connected") === "true"',
        connected_at: 'localStorage.getItem("facebook_connected_at")',
        reset_connection: 'localStorage.removeItem("facebook_connected")'
      }
    }

    return NextResponse.json(status, { status: 200 })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status', details: error }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // This would reset the connection in a real app
    // For demo, we return instructions for client-side reset
    
    const resetInfo = {
      message: 'Connection reset endpoint called',
      instructions: 'Client should call: localStorage.removeItem("facebook_connected") and localStorage.removeItem("facebook_connected_at")',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(resetInfo, { status: 200 })
  } catch (error) {
    console.error('Reset connection error:', error)
    return NextResponse.json(
      { error: 'Failed to reset connection', details: error }, 
      { status: 500 }
    )
  }
}