import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Get all portal access records
    const { data: allAccess, error: accessError } = await supabase
      .from('client_portal_access')
      .select('*, clients(first_name, last_name, email)')
      .order('created_at', { ascending: false })
    
    // Find Sam's access specifically
    const { data: samClient } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .single()
    
    let samAccess = null
    if (samClient) {
      const { data } = await supabase
        .from('client_portal_access')
        .select('*')
        .eq('client_id', samClient.id)
        .single()
      samAccess = data
    }
    
    return NextResponse.json({
      totalAccessRecords: allAccess?.length || 0,
      samClient,
      samPortalAccess: samAccess,
      allAccessRecords: allAccess || [],
      instructions: {
        ifNoAccess: 'Go to /setup-sam-portal to create access',
        ifHasAccess: 'Use the access_code field to login',
        codeFormat: 'Should be in format XXXX-XXXX-XXXX'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check portal access',
      details: error.message
    }, { status: 500 })
  }
}