import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ 
        error: 'You must be logged in to create a client' 
      }, { status: 401 })
    }

    // Get user's organization
    const { data: userOrg } = await adminSupabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    let organizationId = userOrg?.organization_id

    if (!organizationId) {
      // If no organization, get the first one (for local testing)
      const { data: org } = await adminSupabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()
      
      organizationId = org?.id
    }

    if (!organizationId) {
      return NextResponse.json({ 
        error: 'No organization found. Please create an organization first.' 
      }, { status: 400 })
    }

    // Check if Sam already exists
    const { data: existingClient } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('organization_id', organizationId)
      .single()

    if (existingClient) {
      return NextResponse.json({ 
        success: true,
        client: existingClient,
        message: 'Sam Schofield already exists' 
      })
    }

    // Create Sam Schofield client
    const { data: newClient, error } = await adminSupabase
      .from('clients')
      .insert({
        first_name: 'Sam',
        last_name: 'Schofield',
        name: 'Sam Schofield',
        email: 'samschofield90@hotmail.co.uk',
        organization_id: organizationId,
        status: 'active',
        phone: '+447490253471',
        client_type: 'gym_member',
        // Add some default values for other fields
        engagement_score: 85,
        lifetime_value: 0,
        monthly_revenue: 0,
        custom_fields: {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ 
        error: 'Failed to create client',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      client: newClient,
      message: 'Sam Schofield created successfully' 
    })
  } catch (error: any) {
    console.error('Error in create-sam-client:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}