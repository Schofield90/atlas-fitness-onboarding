import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { FacebookFieldMappingService } from '@/app/lib/services/facebook-field-mapping'

export const runtime = 'nodejs'

// GET field mappings for a form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get('formId')
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 })
    }
    
    // Get authenticated user and organization
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get field mappings
    const mappingService = new FacebookFieldMappingService()
    const mappings = await mappingService.getFieldMappings(formId, organizationId)
    
    // Also get form structure; if missing, try to refresh from Facebook
    let formRecord: { questions?: any[]; form_name?: string } | null = null
    try {
      const { data } = await supabase
        .from('facebook_lead_forms')
        .select('questions, form_name')
        .eq('facebook_form_id', formId)
        .eq('organization_id', organizationId)
        .single()
      formRecord = data as any
    } catch (e: any) {
      const message = e?.message || String(e)
      if (message.includes('column') && message.includes('questions')) {
        console.warn('FB_MAP migration guard: questions column missing on facebook_lead_forms')
        return NextResponse.json({
          error: 'Database migration missing. Please apply migration 20250904075315_facebook_field_mappings_complete.sql.'
        }, { status: 500 })
      }
      throw e
    }

    if (!formRecord?.questions || (Array.isArray(formRecord.questions) && formRecord.questions.length === 0)) {
      console.warn(`FB_MAP guard: questions missing for form ${formId}, attempting refresh`)
      try {
        const origin = new URL(request.url).origin
        await fetch(`${origin}/api/integrations/facebook/refresh-form-questions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ formId })
        })
        const { data: reloaded } = await supabase
          .from('facebook_lead_forms')
          .select('questions, form_name')
          .eq('facebook_form_id', formId)
          .eq('organization_id', organizationId)
          .single()
        formRecord = reloaded as any
      } catch (e) {
        console.warn(`FB_MAP guard: refresh failed for form ${formId}`)
      }
    }

    if (!formRecord?.questions || (Array.isArray(formRecord.questions) && formRecord.questions.length === 0)) {
      return NextResponse.json({
        error: "Form structure not available. Please click 'Load Form Fields from Facebook'."
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      mappings,
      form_structure: formRecord.questions || null,
      form_name: formRecord.form_name || null,
      has_saved_mappings: !!mappings
    })
    
  } catch (error) {
    console.error('Error fetching field mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch field mappings' },
      { status: 500 }
    )
  }
}

// POST/PUT save field mappings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId, mappings } = body
    
    if (!formId || !mappings) {
      return NextResponse.json(
        { error: 'Form ID and mappings required' },
        { status: 400 }
      )
    }
    
    // Get authenticated user and organization
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Validate mappings
    const mappingService = new FacebookFieldMappingService()
    const validation = mappingService.validateMappings(mappings)
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Invalid mappings',
          validation_errors: validation.errors,
          validation_warnings: validation.warnings
        },
        { status: 400 }
      )
    }
    
    // Save mappings
    await mappingService.saveFieldMappings(organizationId, formId, mappings)
    
    console.log(`✅ Saved field mappings for form ${formId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Field mappings saved successfully',
      warnings: validation.warnings
    })
    
  } catch (error) {
    console.error('Error saving field mappings:', error)
    return NextResponse.json(
      { error: 'Failed to save field mappings' },
      { status: 500 }
    )
  }
}

// DELETE field mappings (reset to auto-detect)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get('formId')
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 })
    }
    
    // Get authenticated user and organization
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Clear field mappings
    const { error: updateError } = await supabase
      .from('facebook_lead_forms')
      .update({ 
        field_mappings: null,
        custom_field_mappings: null,
        updated_at: new Date().toISOString()
      })
      .eq('facebook_form_id', formId)
      .eq('organization_id', organizationId)
    
    if (updateError) {
      throw updateError
    }
    
    console.log(`🗑️ Cleared field mappings for form ${formId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Field mappings cleared. Auto-detection will be used for new leads.'
    })
    
  } catch (error) {
    console.error('Error clearing field mappings:', error)
    return NextResponse.json(
      { error: 'Failed to clear field mappings' },
      { status: 500 }
    )
  }
}