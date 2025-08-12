import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e'

    // First, ensure the facebook_integrations table exists by trying to create it
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS facebook_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        facebook_user_id TEXT NOT NULL,
        facebook_user_name TEXT NOT NULL,
        facebook_user_email TEXT,
        access_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ,
        refresh_token TEXT,
        long_lived_token TEXT,
        granted_scopes TEXT[] DEFAULT '{}',
        required_scopes TEXT[] DEFAULT '{leads_retrieval,pages_read_engagement,pages_manage_metadata}',
        is_active BOOLEAN DEFAULT true,
        connection_status TEXT DEFAULT 'active',
        last_sync_at TIMESTAMPTZ,
        sync_frequency_hours INTEGER DEFAULT 1,
        settings JSONB DEFAULT '{}',
        webhook_config JSONB DEFAULT '{}',
        error_details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, facebook_user_id)
      );

      CREATE TABLE IF NOT EXISTS facebook_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_id UUID,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        facebook_page_id TEXT NOT NULL,
        page_name TEXT NOT NULL,
        page_username TEXT,
        page_category TEXT,
        page_category_list JSONB DEFAULT '[]',
        access_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT false,
        is_primary BOOLEAN DEFAULT false,
        webhook_subscribed BOOLEAN DEFAULT false,
        page_info JSONB DEFAULT '{}',
        permissions TEXT[] DEFAULT '{}',
        page_insights JSONB DEFAULT '{}',
        lead_sync_enabled BOOLEAN DEFAULT true,
        auto_assign_leads BOOLEAN DEFAULT true,
        default_lead_status TEXT DEFAULT 'new',
        lead_assignment_rules JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_sync_at TIMESTAMPTZ,
        UNIQUE(organization_id, facebook_page_id)
      );

      CREATE TABLE IF NOT EXISTS facebook_ad_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        integration_id UUID,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        facebook_account_id TEXT NOT NULL,
        account_name TEXT,
        account_status INTEGER,
        currency TEXT,
        timezone TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, facebook_account_id)
      );
    `
    
    // Try to create tables (will do nothing if they exist)
    await supabase.rpc('exec_sql', { sql: createTableSQL }).catch(err => {
      console.log('Table creation skipped (might already exist):', err.message)
    })

    // Get Facebook data from localStorage (passed via headers)
    const fbUserId = 'temp_' + Date.now() // Temporary ID if not available
    const fbUserName = 'Facebook User'
    
    // Create a mock integration for testing
    const mockIntegration = {
      organization_id: organizationId,
      user_id: user.id,
      facebook_user_id: fbUserId,
      facebook_user_name: fbUserName,
      facebook_user_email: user.email,
      access_token: 'mock_token_' + Date.now(), // This will need to be replaced with real token
      is_active: true,
      connection_status: 'active',
      settings: {},
      granted_scopes: ['pages_show_list', 'pages_read_engagement', 'leads_retrieval']
    }

    // Try to insert or update the integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .upsert(mockIntegration, {
        onConflict: 'organization_id,facebook_user_id'
      })
      .select()
      .single()

    if (intError) {
      // If the table doesn't exist, return instructions
      if (intError.message.includes('relation') && intError.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Database tables not found',
          solution: 'Please run the Facebook integration migration in Supabase',
          migration: '/supabase/migrations/20250806_facebook_integration_comprehensive.sql',
          details: intError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({
        error: 'Failed to create integration',
        details: intError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Integration record created',
      integration: {
        id: integration?.id,
        organization_id: integration?.organization_id,
        user_id: integration?.user_id
      },
      next_steps: [
        '1. Disconnect Facebook if currently connected',
        '2. Connect Facebook again to get real access token',
        '3. The integration will now save properly'
      ]
    })

  } catch (error) {
    console.error('Force setup error:', error)
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}