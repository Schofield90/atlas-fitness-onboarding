import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const params = Object.fromEntries(formData)
    
    console.log('Call completion status:', {
      callSid: params.CallSid,
      callStatus: params.CallStatus,
      duration: params.CallDuration,
      dialCallStatus: params.DialCallStatus,
      dialCallDuration: params.DialCallDuration
    })
    
    // Here you could:
    // - Log the call to your database
    // - Update call records
    // - Send notifications
    
    // Return empty response (Twilio doesn't need TwiML here)
    return new NextResponse('', { status: 200 })
    
  } catch (error) {
    console.error('Call status webhook error:', error)
    return new NextResponse('', { status: 200 })
  }
}