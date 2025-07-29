import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get leadId from query params
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('leadId')
    
    if (!leadId) {
      return NextResponse.json({
        error: 'Please provide leadId in query params',
        example: '?leadId=YOUR_LEAD_ID'
      })
    }
    
    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, phone, email, first_name, last_name')
      .eq('id', leadId)
      .single()
    
    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found', leadError })
    }
    
    // Test different phone formats
    const phoneVariations = [
      lead.phone,
      lead.phone?.startsWith('+') ? lead.phone : `+${lead.phone}`,
      lead.phone?.replace(/^\+/, ''),
      lead.phone?.replace(/^0/, '44'),
      lead.phone?.startsWith('0') ? `+44${lead.phone.substring(1)}` : lead.phone
    ].filter(Boolean)
    
    const results: Record<string, { found: number; error: any; messages: any[] }> = {}
    
    for (const phoneFormat of phoneVariations) {
      const { data: smsLogs, error: smsError } = await adminSupabase
        .from('sms_logs')
        .select('id, to, from_number, message, status, created_at')
        .or(`to.eq.${phoneFormat},from_number.eq.${phoneFormat}`)
        .order('created_at', { ascending: false })
        .limit(5)
      
      results[phoneFormat] = {
        found: smsLogs?.length || 0,
        error: smsError,
        messages: smsLogs || []
      }
    }
    
    // Find the best format
    const bestFormat = Object.entries(results)
      .sort((a, b) => b[1].found - a[1].found)
      .find(([_, result]) => result.found > 0)?.[0]
    
    return NextResponse.json({
      lead: {
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        phoneStored: lead.phone,
        email: lead.email
      },
      phoneFormatTests: results,
      recommendation: {
        bestFormat,
        hasMessages: !!bestFormat,
        suggestion: !bestFormat 
          ? 'No messages found. The lead phone format might not match Twilio format.'
          : `Use format: ${bestFormat} for queries`,
        fix: !lead.phone?.startsWith('+') 
          ? 'Lead phone should be updated to include country code with + prefix'
          : null
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Check failed',
      details: error.message
    }, { status: 500 })
  }
}