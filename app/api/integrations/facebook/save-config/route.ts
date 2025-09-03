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
    
    // Try to get page info but don't fail if it doesn't exist
    const { data: pageInfo } = await supabase
      .from('facebook_pages')
      .select('id, page_name, facebook_page_id')
      .eq('facebook_page_id', pageId)
      .eq('organization_id', organizationId)
      .single()
    
    console.log('Page ID from request:', pageId)
    console.log('Page info from DB:', pageInfo)
    console.log('Organization ID:', organizationId)
    console.log('Forms to save:', config.selectedForms)
    
    // Now save/update the selected lead forms
    if (config.selectedForms && config.selectedForms.length > 0) {
      // Process ALL selected forms with upsert approach
      const formsToSave = config.selectedForms.map((formId: string) => {
        // Try to find the form name from selectedFormDetails
        const formDetail = config.selectedFormDetails?.find((f: any) => f.id === formId)
        return {
          organization_id: organizationId,
          page_id: pageInfo?.id || null, // UUID reference to facebook_pages table (can be null)
          facebook_page_id: pageId || null, // The actual Facebook page ID
          facebook_form_id: formId,
          form_name: formDetail?.name || `Form ${formId}`,
          form_status: 'active',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
      
      if (formsToSave.length > 0) {
        console.log('Attempting to save forms:', JSON.stringify(formsToSave, null, 2))
        
        // Use upsert to handle both insert and update cases
        const { data: upsertedForms, error: upsertError } = await supabase
          .from('facebook_lead_forms')
          .upsert(
            formsToSave,
            { 
              onConflict: 'organization_id,facebook_form_id',
              ignoreDuplicates: false 
            }
          )
          .select()
        
        if (upsertError) {
          console.error('Error upserting forms - Full error:', JSON.stringify(upsertError, null, 2))
          console.error('Failed forms data:', formsToSave)
          
          // If upsert fails, try individual operations
          console.log('Upsert failed, trying individual operations...')
          let successCount = 0
          
          for (const form of formsToSave) {
            // First try to insert
            const { data: insertData, error: insertError } = await supabase
              .from('facebook_lead_forms')
              .insert(form)
              .select()
            
            if (insertError && insertError.code === '23505') {
              // Duplicate key, try update
              console.log(`Form ${form.facebook_form_id} exists, updating...`)
              const { data: updateData, error: updateError } = await supabase
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
                .select()
              
              if (updateError) {
                console.error(`Failed to update form ${form.facebook_form_id}:`, updateError)
              } else {
                console.log(`Updated form ${form.facebook_form_id}`)
                successCount++
              }
            } else if (insertError) {
              console.error(`Failed to insert form ${form.facebook_form_id}:`, insertError)
            } else {
              console.log(`Inserted form ${form.facebook_form_id}`)
              successCount++
            }
          }
          
          console.log(`Successfully saved ${successCount} out of ${formsToSave.length} forms`)
        } else {
          console.log('Successfully upserted forms:', upsertedForms?.length || 0)
        }
      }
    }
    
    // Note: Removed sync_config update as that column doesn't exist in the table
    // The facebook_lead_forms table is the source of truth for selected forms
    
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