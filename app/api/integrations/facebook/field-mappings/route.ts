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
    
    // Also get form structure from database
    const { data: formRecord } = await supabase
      .from('facebook_lead_forms')
      .select('questions, form_name, facebook_form_id, facebook_page_id, page_id')
      .eq('facebook_form_id', formId)
      .eq('organization_id', organizationId)
      .single()

    // If no questions present, attempt to refresh from Facebook automatically
    if (!formRecord?.questions || (Array.isArray(formRecord.questions) && formRecord.questions.length === 0)) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/integrations/facebook/refresh-form-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId })
        })
        // Re-fetch after refresh
        const { data: refreshedForm } = await supabase
          .from('facebook_lead_forms')
          .select('questions, form_name')
          .eq('facebook_form_id', formId)
          .eq('organization_id', organizationId)
          .single()
        return NextResponse.json({
          success: true,
          mappings,
          form_structure: refreshedForm?.questions || null,
          form_name: refreshedForm?.form_name || null,
          has_saved_mappings: !!mappings
        })
      } catch (e) {
        console.error('Auto-refresh of form questions failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      mappings,
      form_structure: formRecord?.questions || null,
      form_name: formRecord?.form_name || null,
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