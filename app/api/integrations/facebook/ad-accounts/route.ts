import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, we'll simulate the integration check
    const facebookConnected = request.headers.get('x-facebook-connected') || 'demo'
    
    if (!facebookConnected) {
      return NextResponse.json(
        { error: 'Facebook integration not connected' }, 
        { status: 401 }
      )
    }

    console.log('💰 Fetching Facebook Ad Accounts for connected account')
    
    // Demo data - in production, you'd use:
    // const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,balance&access_token=${storedAccessToken}`)
    
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