import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth } from '@/app/lib/api/auth-check'

export async function POST(request: NextRequest) {
  try {
    // Use requireAuth which has the improved organization lookup
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    const body = await request.json()
    
    // Create contact with the organization from requireAuth
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        organization_id: userWithOrg.organizationId,
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        email: body.email || '',
        phone: body.phone || '',
        company: body.company,
        position: body.position,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        country: body.country,
        website: body.website,
        source: body.source || 'manual',
        status: body.status || 'active',
        tags: body.tags || [],
        notes: body.notes,
        birthday: body.birthday,
        social_media: body.social_media,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating contact:', error)
      return NextResponse.json({ 
        error: 'Failed to create contact',
        details: error.message 
      }, { status: 500 })
    }
    
    // Also create a lead record for compatibility if email or phone provided
    if (body.email || body.phone) {
      const leadName = `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.email || 'Unknown'
      
      await supabase
        .from('leads')
        .insert({
          organization_id: userWithOrg.organizationId,
          name: leadName,
          email: body.email,
          phone: body.phone,
          source: body.source || 'manual',
          status: 'new',
          created_at: new Date().toISOString()
        })
    }
    
    return NextResponse.json({
      success: true,
      contact
    })
    
  } catch (error: any) {
    console.error('Contact creation error:', error)
    
    // Handle auth errors
    if (error.name === 'AuthenticationError' || error.name === 'MultiTenantError') {
      return NextResponse.json({ 
        error: error.message,
        code: error.code 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Use requireAuth which has the improved organization lookup
    const userWithOrg = await requireAuth()
    
    const supabase = await createClient()
    
    // Fetch contacts for the organization
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', userWithOrg.organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch contacts',
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      contacts: contacts || [],
      organizationId: userWithOrg.organizationId
    })
    
  } catch (error: any) {
    console.error('Contact fetch error:', error)
    
    // Handle auth errors
    if (error.name === 'AuthenticationError' || error.name === 'MultiTenantError') {
      return NextResponse.json({ 
        error: error.message,
        code: error.code 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}