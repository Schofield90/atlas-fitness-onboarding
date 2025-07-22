import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// Helper functions for account status
function getAccountStatus(status: number): string {
  switch (status) {
    case 1: return 'Active'
    case 2: return 'Disabled'
    case 3: return 'Unsettled'
    case 7: return 'Pending Review'
    case 9: return 'In Grace Period'
    case 101: return 'Pending Closure'
    case 201: return 'Closed'
    default: return 'Unknown'
  }
}

function getStatusColor(status: number): string {
  switch (status) {
    case 1: return 'green'
    case 2: return 'red'
    case 3: return 'yellow'
    case 7: return 'orange'
    default: return 'gray'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('fb_token_data')
    
    let storedAccessToken = null
    let facebookUserId = null
    
    if (tokenCookie?.value) {
      try {
        const tokenData = JSON.parse(tokenCookie.value)
        storedAccessToken = tokenData.access_token
        facebookUserId = tokenData.user_id
        console.log('🔑 Retrieved Facebook token from cookie for user:', facebookUserId)
      } catch (e) {
        console.error('Failed to parse token cookie:', e)
      }
    }

    console.log('💰 Fetching Facebook Ad Accounts...')
    
    // If we have a real token, use Facebook API
    if (storedAccessToken) {
      console.log('📊 Making real Facebook API call for ad accounts')
      console.log('🔑 Using token:', storedAccessToken.substring(0, 20) + '...')
      
      // Updated fields to include business and proper field names
      const apiUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,created_time,funding_source,business&access_token=${storedAccessToken}`
      console.log('🌐 API URL:', apiUrl.replace(storedAccessToken, 'TOKEN_HIDDEN'))
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      console.log('📥 Facebook Ad Accounts Response:', {
        status: response.status,
        hasError: !!data.error,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        rawData: data // Log full response for debugging
      })
      
      if (data.error) {
        console.error('❌ Facebook API error:', data.error)
        // Don't fall through to demo data - return the error
        return NextResponse.json({
          success: false,
          error: data.error.message,
          error_code: data.error.code,
          error_type: data.error.type,
          debug: {
            api_call: 'GET /me/adaccounts',
            permissions_required: ['ads_management', 'ads_read'],
            data_source: 'facebook_api_error',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 })
      }
      
      // Handle successful response - even if empty
      const adAccounts = (data.data || []).map((account: any) => ({
        id: account.id,
        name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name,
        amount_spent: parseFloat(account.amount_spent || '0') / 100, // Facebook returns in cents
        balance: parseFloat(account.balance || '0') / 100,
        spend_cap: parseFloat(account.spend_cap || '0') / 100,
        created_time: account.created_time,
        funding_source: account.funding_source || 'Unknown',
        business: account.business,
        status: getAccountStatus(account.account_status),
        status_code: account.account_status,
        status_color: getStatusColor(account.account_status),
        is_active: account.account_status === 1
      }))
      
      console.log(`✅ Returning ${adAccounts.length} real ad accounts`)
      
      return NextResponse.json({
        success: true,
        ad_accounts: adAccounts,
        pagination: {
          total: adAccounts.length,
          has_next: !!data.paging?.next,
          next: data.paging?.next
        },
        debug: {
          api_call: 'GET /me/adaccounts',
          permissions_required: ['ads_management', 'ads_read'],
          data_source: 'facebook_api',
          timestamp: new Date().toISOString(),
          raw_response_sample: data.data?.[0] // Include first account for debugging
        }
      })
    }
    
    // Fall back to demo data
    console.log('⚠️ Using demo ad accounts data')
    
    const demoAdAccounts = [
      {
        id: 'act_123456789',
        name: 'Atlas Fitness Marketing',
        account_status: 1, // 1 = ACTIVE
        currency: 'USD',
        timezone_name: 'America/New_York',
        amount_spent: '2847.32',
        balance: '500.00',
        spend_cap: '5000.00',
        created_time: '2023-01-15T10:30:00Z',
        funding_source_details: {
          type: 'CREDIT_CARD',
          display_string: 'Visa ****1234'
        }
      },
      {
        id: 'act_987654321',
        name: 'Atlas Fitness - Downtown Campaign',
        account_status: 1,
        currency: 'USD', 
        timezone_name: 'America/New_York',
        amount_spent: '1523.45',
        balance: '750.00',
        spend_cap: '3000.00',
        created_time: '2023-03-20T14:15:00Z',
        funding_source_details: {
          type: 'CREDIT_CARD',
          display_string: 'Visa ****5678'
        }
      },
      {
        id: 'act_456789123',
        name: 'Atlas Nutrition Ads',
        account_status: 2, // 2 = DISABLED
        currency: 'USD',
        timezone_name: 'America/New_York', 
        amount_spent: '345.67',
        balance: '0.00',
        spend_cap: '1000.00',
        created_time: '2023-06-10T09:45:00Z',
        funding_source_details: {
          type: 'CREDIT_CARD',
          display_string: 'Visa ****9012'
        }
      }
    ]

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const getAccountStatusText = (status: number) => {
      switch (status) {
        case 1: return 'Active'
        case 2: return 'Disabled'
        case 3: return 'Unsettled'
        case 7: return 'Pending Review'
        case 9: return 'In Grace Period'
        case 101: return 'Pending Closure'
        case 201: return 'Closed'
        default: return 'Unknown'
      }
    }

    const getAccountStatusColor = (status: number) => {
      switch (status) {
        case 1: return 'green'
        case 2: return 'red'
        case 3: return 'yellow'
        case 7: return 'orange'
        default: return 'gray'
      }
    }

    return NextResponse.json({
      success: true,
      ad_accounts: demoAdAccounts.map(account => ({
        id: account.id,
        name: account.name,
        status: getAccountStatusText(account.account_status),
        status_code: account.account_status,
        status_color: getAccountStatusColor(account.account_status),
        currency: account.currency,
        timezone: account.timezone_name,
        amount_spent: parseFloat(account.amount_spent),
        balance: parseFloat(account.balance),
        spend_cap: parseFloat(account.spend_cap),
        created_time: account.created_time,
        funding_source: account.funding_source_details.display_string,
        is_active: account.account_status === 1
      })),
      summary: {
        total_accounts: demoAdAccounts.length,
        active_accounts: demoAdAccounts.filter(acc => acc.account_status === 1).length,
        total_spent: demoAdAccounts.reduce((sum, acc) => sum + parseFloat(acc.amount_spent), 0),
        total_balance: demoAdAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)
      },
      debug: {
        api_call: 'GET /me/adaccounts',
        permissions_required: ['ads_management', 'ads_read'],
        note: 'Demo data - replace with real Facebook Graph API call'
      }
    })

  } catch (error) {
    console.error('❌ Error fetching Facebook ad accounts:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Facebook ad accounts', 
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          endpoint: '/api/integrations/facebook/ad-accounts',
          timestamp: new Date().toISOString()
        }
      }, 
      { status: 500 }
    )
  }
}