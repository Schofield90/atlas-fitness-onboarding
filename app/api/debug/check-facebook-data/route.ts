import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if Facebook tables exist and have data
    const { data: pages, error: pagesError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', organizationId)
    
    const { data: forms, error: formsError } = await supabase
      .from('facebook_lead_forms')
      .select('*')
      .eq('organization_id', organizationId)
    
    const { data: allPages } = await supabase
      .from('facebook_pages')
      .select('count')
    
    const { data: allForms } = await supabase
      .from('facebook_lead_forms')
      .select('count')

    return NextResponse.json({
      organizationId,
      facebook_pages: {
        count: pages?.length || 0,
        data: pages || [],
        error: pagesError?.message
      },
      facebook_lead_forms: {
        count: forms?.length || 0,
        data: forms || [],
        error: formsError?.message
      },
      total_pages_in_db: allPages?.[0]?.count || 0,
      total_forms_in_db: allForms?.[0]?.count || 0
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Failed to check Facebook data' }, { status: 500 })
  }
}