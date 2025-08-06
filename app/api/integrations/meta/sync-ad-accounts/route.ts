import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import MetaAdsClient from '@/app/lib/integrations/meta-ads-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get Meta client for this organization
    const metaClient = await MetaAdsClient.createFromIntegration(organizationId)
    if (!metaClient) {
      return NextResponse.json({ 
        error: 'Meta integration not found. Please connect your Facebook account first.' 
      }, { status: 400 })
    }

    // Get integration record
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Active integration not found' }, { status: 400 })
    }

    // Fetch ad accounts from Meta API
    const adAccounts = await metaClient.getAdAccounts()
    
    if (!adAccounts || adAccounts.length === 0) {
      return NextResponse.json({ 
        message: 'No ad accounts found or user has no ad account access permissions',
        adAccounts: []
      })
    }

    // Sync ad accounts to database
    const syncResults = []
    
    for (const account of adAccounts) {
      try {
        const { error: accountError } = await supabase
          .from('facebook_ad_accounts')
          .upsert({
            integration_id: integration.id,
            organization_id: organizationId,
            facebook_ad_account_id: account.account_id,
            account_name: account.name,
            account_status: account.account_status,
            currency: account.currency,
            timezone_name: account.timezone_name,
            is_active: account.account_status === 1, // 1 = ACTIVE
            permissions: [] // We can fetch detailed permissions separately if needed
          }, {
            onConflict: 'organization_id,facebook_ad_account_id'
          })

        if (accountError) {
          console.error(`Failed to sync ad account ${account.account_id}:`, accountError)
          syncResults.push({
            accountId: account.account_id,
            accountName: account.name,
            status: 'error',
            error: accountError.message
          })
        } else {
          syncResults.push({
            accountId: account.account_id,
            accountName: account.name,
            status: 'success',
            accountStatus: account.account_status
          })
        }
      } catch (error: any) {
        console.error(`Error syncing ad account ${account.account_id}:`, error)
        syncResults.push({
          accountId: account.account_id,
          accountName: account.name,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length
    const errorCount = syncResults.filter(r => r.status === 'error').length

    // Update integration last sync time
    await supabase
      .from('facebook_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        settings: { last_ad_accounts_sync: new Date().toISOString() }
      })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} ad accounts successfully, ${errorCount} errors`,
      results: syncResults,
      summary: {
        totalAccounts: adAccounts.length,
        successful: successCount,
        errors: errorCount
      }
    })

  } catch (error: any) {
    console.error('Ad accounts sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync ad accounts',
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get synced ad accounts from database
    const { data: accounts, error } = await supabase
      .from('facebook_ad_accounts')
      .select(`
        id,
        facebook_ad_account_id,
        account_name,
        account_status,
        currency,
        timezone_name,
        is_active,
        permissions,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch ad accounts' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || [],
      count: accounts?.length || 0
    })

  } catch (error: any) {
    console.error('Get ad accounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts' },
      { status: 500 }
    )
  }
}