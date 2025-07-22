import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the Facebook user ID from headers (sent by frontend)
    const facebookUserId = request.headers.get('x-facebook-user-id')
    
    // Retrieve the stored access token from our in-memory store
    // In production, you'd query this from a secure database
    const tokenData = global.facebookTokens?.[facebookUserId || '']
    const storedAccessToken = tokenData?.access_token
    
    if (!storedAccessToken || !facebookUserId) {
      console.log('⚠️ No real Facebook access token available, using demo data')
      
      // Return demo data when no real token
      return await returnDemoPages()
    }

    console.log('📄 Fetching real Facebook Pages from Graph API')
    
    // Real Facebook Graph API call
    const response = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,cover,category,fan_count,website,emails,phone&access_token=${storedAccessToken}`)
    const data = await response.json()
    
    if (data.error) {
      console.error('❌ Facebook API error:', data.error)
      
      // Fall back to demo data if API fails
      if (data.error.code === 190) { // Invalid access token
        console.log('🔄 Access token invalid, falling back to demo data')
        return await returnDemoPages()
      }
      
      return NextResponse.json(
        { 
          error: 'Facebook API error', 
          details: data.error.message,
          code: data.error.code 
        }, 
        { status: 400 }
      )
    }

    console.log(`✅ Retrieved ${data.data?.length || 0} real Facebook pages`)

    return NextResponse.json({
      success: true,
      pages: (data.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token, // Page-specific token for lead forms
        cover: page.cover?.source,
        category: page.category,
        hasLeadAccess: !!page.access_token, // If we have page token, we can access leads
        followers_count: page.fan_count || 0,
        website: page.website,
        emails: page.emails || [],
        phone: page.phone
      })),
      pagination: {
        total: data.data?.length || 0,
        has_next: !!data.paging?.next
      },
      debug: {
        api_call: 'GET /me/accounts',
        permissions_required: ['pages_show_list', 'pages_read_engagement'],
        data_source: 'facebook_api',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error fetching Facebook pages:', error)
    
    // Fall back to demo data on any error
    console.log('🔄 Falling back to demo data due to error')
    return await returnDemoPages()
  }
}

// Helper function to return demo data
async function returnDemoPages() {
    // Demo data - replace with real API call
    const demoPages = [
      {
        id: '123456789',
        name: 'Atlas Fitness Gym',
        access_token: 'page_token_123',
        cover: {
          source: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop'
        },
        category: 'Gym/Physical Fitness Center',
        hasLeadAccess: true,
        followers_count: 2847,
        website: 'https://atlas-fitness.com'
      },
      {
        id: '987654321', 
        name: 'Atlas Fitness Downtown',
        access_token: 'page_token_456',
        cover: {
          source: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=200&fit=crop'
        },
        category: 'Gym/Physical Fitness Center',
        hasLeadAccess: true,
        followers_count: 1523,
        website: 'https://atlas-fitness.com/downtown'
      },
      {
        id: '456789123',
        name: 'Atlas Nutrition Blog',
        access_token: 'page_token_789',
        cover: {
          source: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=200&fit=crop'
        },
        category: 'Health/Wellness Website',
        hasLeadAccess: false,
        followers_count: 985,
        website: 'https://blog.atlas-fitness.com'
      }
    ]

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      pages: demoPages.map(page => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token, // Page-specific token for lead forms
        cover: page.cover?.source,
        category: page.category,
        hasLeadAccess: page.hasLeadAccess,
        followers_count: page.followers_count,
        website: page.website
      })),
      pagination: {
        total: demoPages.length,
        has_next: false
      },
      debug: {
        api_call: 'GET /me/accounts',
        permissions_required: ['pages_show_list', 'pages_read_engagement'],
        note: 'Demo data - replace with real Facebook Graph API call'
      }
    })
}