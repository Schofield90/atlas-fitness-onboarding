import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, we'll simulate the integration check
    // In a real app, you'd check the database for the stored access token
    const facebookConnected = request.headers.get('x-facebook-connected') || 'demo'
    
    if (!facebookConnected) {
      return NextResponse.json(
        { error: 'Facebook integration not connected' }, 
        { status: 401 }
      )
    }

    // Simulate fetching pages from Facebook Graph API
    // In production, you'd use: 
    // const response = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,cover,emails,phone&access_token=${storedAccessToken}`)
    
    console.log('📄 Fetching Facebook Pages for connected account')
    
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

  } catch (error) {
    console.error('❌ Error fetching Facebook pages:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Facebook pages', 
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          endpoint: '/api/integrations/facebook/pages',
          timestamp: new Date().toISOString()
        }
      }, 
      { status: 500 }
    )
  }
}