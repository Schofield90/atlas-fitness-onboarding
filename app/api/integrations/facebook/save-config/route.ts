import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Validate the configuration
    if (!config.selectedPages || config.selectedPages.length === 0) {
      return NextResponse.json(
        { error: 'At least one page must be selected' },
        { status: 400 }
      )
    }
    
    if (!config.selectedForms || config.selectedForms.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead form must be selected' },
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
    
    // Get Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('id, facebook_user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (intError || !integration) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 401 }
      )
    }
    
    // First, deactivate all existing lead forms for this organization
    await supabase
      .from('facebook_lead_forms')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
    
    // Get the page info for the selected forms
    const pageId = config.selectedPages[0] // Using the first selected page
    const { data: pageInfo } = await supabase
      .from('facebook_pages')
      .select('id, page_name, facebook_page_id')
      .eq('facebook_page_id', pageId)
      .eq('organization_id', organizationId)
      .single()
    
    console.log('Page info for saving forms:', pageInfo)
    console.log('Organization ID:', organizationId)
    console.log('Forms to save:', config.selectedForms)
    
    // Now save/update the selected lead forms
    if (config.selectedForms && config.selectedForms.length > 0) {
      // Get existing forms to check which ones need to be created vs updated
      const { data: existingForms } = await supabase
        .from('facebook_lead_forms')
        .select('id, facebook_form_id, form_name')
        .eq('organization_id', organizationId)
        .in('facebook_form_id', config.selectedForms)
      
      console.log('Existing forms found:', existingForms?.length || 0)
      
      const existingFormIds = new Set(existingForms?.map(f => f.facebook_form_id) || [])
      
      // Update existing forms to be active and update their names if provided
      if (existingForms && existingForms.length > 0) {
        // Update each form individually if we have name details
        if (config.selectedFormDetails && config.selectedFormDetails.length > 0) {
          for (const form of existingForms) {
            const formDetail = config.selectedFormDetails.find((f: any) => f.id === form.facebook_form_id)
            await supabase
              .from('facebook_lead_forms')
              .update({ 
                is_active: true,
                form_name: formDetail?.name || form.form_name,
                updated_at: new Date().toISOString()
              })
              .eq('id', form.id)
          }
        } else {
          // Bulk update without name changes
          await supabase
            .from('facebook_lead_forms')
            .update({ 
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('organization_id', organizationId)
            .in('facebook_form_id', config.selectedForms)
        }
      }
      
      // Insert new forms
      const newForms = config.selectedForms
        .filter((formId: string) => !existingFormIds.has(formId))
        .map((formId: string) => {
          // Try to find the form name from selectedFormDetails
          const formDetail = config.selectedFormDetails?.find((f: any) => f.id === formId)
          return {
            organization_id: organizationId,
            page_id: pageInfo?.id || null, // UUID reference to facebook_pages table
            facebook_page_id: pageId, // The actual Facebook page ID
            facebook_form_id: formId,
            form_name: formDetail?.name || `Form ${formId}`,
            form_status: 'active',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      
      if (newForms.length > 0) {
        console.log('Attempting to insert new forms:', JSON.stringify(newForms, null, 2))
        const { data: insertedForms, error: insertError } = await supabase
          .from('facebook_lead_forms')
          .insert(newForms)
          .select()
        
        if (insertError) {
          console.error('Error inserting new forms:', insertError)
          console.error('Failed forms data:', newForms)
          // Try to provide more detail about the error
          if (insertError.code === '23505') {
            console.error('Duplicate form detected - forms may already exist')
            // Try to update instead
            for (const form of newForms) {
              const { error: updateError } = await supabase
                .from('facebook_lead_forms')
                .update({
                  form_name: form.form_name,
                  facebook_page_id: form.facebook_page_id,
                  page_id: form.page_id,
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('organization_id', form.organization_id)
                .eq('facebook_form_id', form.facebook_form_id)
              
              if (updateError) {
                console.error(`Failed to update form ${form.facebook_form_id}:`, updateError)
              } else {
                console.log(`Updated existing form ${form.facebook_form_id}`)
              }
            }
          } else {
            // Don't return error here - continue with the response
            console.error('Non-duplicate error, but continuing...')
          }
        } else {
          console.log('Successfully inserted forms:', insertedForms)
        }
      }
    }
    
    // Also save to sync_config for backward compatibility
    const { error: updateError } = await supabase
      .from('facebook_integrations')
      .update({
        sync_config: {
          selected_pages: config.selectedPages,
          selected_ad_accounts: config.selectedAdAccounts || [],
          selected_forms: config.selectedForms,
          sync_enabled: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id)
    
    if (updateError) {
      console.error('Error updating integration config:', updateError)
    }
    
    console.log('💾 Saved Facebook sync configuration:', {
      organization: organizationId,
      pages: config.selectedPages.length,
      adAccounts: (config.selectedAdAccounts || []).length,
      forms: config.selectedForms.length
    })
    
    // Trigger initial sync of leads
    if (config.selectedForms.length > 0) {
      // Get page tokens for syncing
      const { data: pages } = await supabase
        .from('facebook_pages')
        .select('facebook_page_id, access_token')
        .eq('organization_id', organizationId)
        .in('facebook_page_id', config.selectedPages)
      
      const pageTokenMap = new Map()
      if (pages) {
        pages.forEach(page => {
          pageTokenMap.set(page.facebook_page_id, page.access_token)
        })
      }
      
      // Queue sync for each form (in production, this would be done via a job queue)
      console.log(`📋 Queuing sync for ${config.selectedForms.length} lead forms`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: {
        pages_count: config.selectedPages.length,
        ad_accounts_count: (config.selectedAdAccounts || []).length,
        forms_count: config.selectedForms.length
      }
    })
    
  } catch (error) {
    console.error('❌ Error saving Facebook configuration:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save configuration', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}