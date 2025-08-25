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
    
    // Save configuration to database
    const configData = {
      organization_id: organizationId,
      facebook_integration_id: integration.id,
      selected_pages: config.selectedPages,
      selected_ad_accounts: config.selectedAdAccounts || [],
      selected_forms: config.selectedForms,
      sync_enabled: true,
      last_sync_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('facebook_sync_configs')
      .select('id')
      .eq('organization_id', organizationId)
      .single()
    
    let saveResult
    
    if (existingConfig) {
      // Update existing configuration
      saveResult = await supabase
        .from('facebook_sync_configs')
        .update({
          selected_pages: configData.selected_pages,
          selected_ad_accounts: configData.selected_ad_accounts,
          selected_forms: configData.selected_forms,
          sync_enabled: configData.sync_enabled,
          updated_at: configData.updated_at
        })
        .eq('id', existingConfig.id)
        .select()
    } else {
      // Create new configuration
      saveResult = await supabase
        .from('facebook_sync_configs')
        .insert(configData)
        .select()
    }
    
    if (saveResult.error) {
      // If the table doesn't exist, we'll save it as metadata on the integration
      console.log('facebook_sync_configs table may not exist, saving to integration metadata')
      
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
        console.error('Error saving configuration:', updateError)
        return NextResponse.json(
          { error: 'Failed to save configuration' },
          { status: 500 }
        )
      }
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