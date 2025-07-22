import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// Mock data for development - replace with database queries
const mockLeads = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    source: 'facebook',
    status: 'new',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    form_name: 'Free Trial Sign Up',
    campaign_name: 'Summer Special 2024',
    facebook_lead_id: 'fb_lead_123',
    page_id: '123456789',
    form_id: 'form_123'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 (555) 234-5678',
    source: 'facebook',
    status: 'contacted',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    form_name: 'Membership Inquiry',
    campaign_name: 'New Year Campaign',
    facebook_lead_id: 'fb_lead_124',
    page_id: '123456789',
    form_id: 'form_124'
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike.wilson@email.com',
    phone: '+1 (555) 345-6789',
    source: 'website',
    status: 'qualified',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    form_name: 'Contact Form',
    campaign_name: null,
    facebook_lead_id: null,
    page_id: null,
    form_id: null
  },
  {
    id: '4',
    name: 'Emma Davis',
    email: 'emma.d@email.com',
    phone: '+1 (555) 456-7890',
    source: 'facebook',
    status: 'converted',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    form_name: 'Premium Membership',
    campaign_name: 'VIP Offer',
    facebook_lead_id: 'fb_lead_125',
    page_id: '123456789',
    form_id: 'form_125'
  },
  {
    id: '5',
    name: 'Chris Brown',
    email: 'chris.b@email.com',
    phone: '+1 (555) 567-8901',
    source: 'facebook',
    status: 'new',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    form_name: 'Free Trial Sign Up',
    campaign_name: 'Summer Special 2024',
    facebook_lead_id: 'fb_lead_126',
    page_id: '123456789',
    form_id: 'form_123'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const formId = searchParams.get('form_id')
    const pageId = searchParams.get('page_id')
    
    // Filter leads based on query parameters
    let filteredLeads = [...mockLeads]
    
    if (status && status !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.status === status)
    }
    
    if (source) {
      filteredLeads = filteredLeads.filter(lead => lead.source === source)
    }
    
    if (formId) {
      filteredLeads = filteredLeads.filter(lead => lead.form_id === formId)
    }
    
    if (pageId) {
      filteredLeads = filteredLeads.filter(lead => lead.page_id === pageId)
    }
    
    // Sort by created_at descending (newest first)
    filteredLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    return NextResponse.json({
      success: true,
      leads: filteredLeads,
      total: filteredLeads.length,
      filters: {
        status: status || 'all',
        source: source || null,
        formId: formId || null,
        pageId: pageId || null
      }
    })
    
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({
      error: 'Failed to fetch leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['name', 'email', 'phone']
      }, { status: 400 })
    }
    
    // Create new lead
    const newLead = {
      id: Date.now().toString(),
      name: body.name,
      email: body.email,
      phone: body.phone,
      source: body.source || 'manual',
      status: body.status || 'new',
      created_at: new Date().toISOString(),
      form_name: body.form_name || null,
      campaign_name: body.campaign_name || null,
      facebook_lead_id: body.facebook_lead_id || null,
      page_id: body.page_id || null,
      form_id: body.form_id || null
    }
    
    // In a real implementation, save to database
    mockLeads.unshift(newLead)
    
    return NextResponse.json({
      success: true,
      lead: newLead
    })
    
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({
      error: 'Failed to create lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({
        error: 'Lead ID is required'
      }, { status: 400 })
    }
    
    // Find and update lead
    const leadIndex = mockLeads.findIndex(lead => lead.id === body.id)
    if (leadIndex === -1) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }
    
    // Update lead fields
    const updatedLead = {
      ...mockLeads[leadIndex],
      ...body,
      updated_at: new Date().toISOString()
    }
    
    mockLeads[leadIndex] = updatedLead
    
    return NextResponse.json({
      success: true,
      lead: updatedLead
    })
    
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({
      error: 'Failed to update lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('id')
    
    if (!leadId) {
      return NextResponse.json({
        error: 'Lead ID is required'
      }, { status: 400 })
    }
    
    // Find and remove lead
    const leadIndex = mockLeads.findIndex(lead => lead.id === leadId)
    if (leadIndex === -1) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }
    
    const deletedLead = mockLeads.splice(leadIndex, 1)[0]
    
    return NextResponse.json({
      success: true,
      deleted: deletedLead
    })
    
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({
      error: 'Failed to delete lead',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}