import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { formId } = await request.json()
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get the Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (intError || !integration || !integration.access_token) {
      return NextResponse.json({ error: 'Facebook not connected' }, { status: 401 })
    }
    
    // Get the form's page info
    const { data: formInfo } = await supabase
      .from('facebook_lead_forms')
      .select('facebook_page_id, form_name')
      .eq('facebook_form_id', formId)
      .eq('organization_id', organizationId)
      .single()
    
    if (!formInfo) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    
    // Get page access token
    const { data: pageInfo } = await supabase
      .from('facebook_pages')
      .select('access_token')
      .eq('facebook_page_id', formInfo.facebook_page_id)
      .eq('organization_id', organizationId)
      .single()
    
    const accessToken = pageInfo?.access_token || integration.access_token
    
    console.log(`Fetching questions for form ${formId} (${formInfo.form_name})`)
    
    // Fetch form details from Facebook including questions
    const formResponse = await fetch(
      `https://graph.facebook.com/v18.0/${formId}?fields=id,name,status,questions&access_token=${accessToken}`
    )
    
    const formData = await formResponse.json()
    
    if (formData.error) {
      console.error('Facebook API error:', formData.error)
      return NextResponse.json({ 
        error: 'Failed to fetch form from Facebook', 
        details: formData.error.message 
      }, { status: 500 })
    }
    
    // Update the form with questions
    const { error: updateError } = await supabase
      .from('facebook_lead_forms')
      .update({
        questions: formData.questions || [],
        form_name: formData.name || formInfo.form_name,
        updated_at: new Date().toISOString()
      })
      .eq('facebook_form_id', formId)
      .eq('organization_id', organizationId)
    
    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update form questions',
        details: updateError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Updated questions for form ${formId}:`, {
      form_name: formData.name,
      questions_count: formData.questions?.length || 0
    })
    
    return NextResponse.json({
      success: true,
      form_name: formData.name,
      questions: formData.questions || [],
      questions_count: formData.questions?.length || 0
    })
    
  } catch (error) {
    console.error('Error refreshing form questions:', error)
    return NextResponse.json(
      { error: 'Failed to refresh form questions' },
      { status: 500 }
    )
  }
}