import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { leadsDB } from '@/app/lib/leads-store'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const formId = searchParams.get('form_id')
    const pageId = searchParams.get('page_id')
    
    // Get filtered leads from the store
    const filteredLeads = leadsDB.getFiltered({
      status: status || undefined,
      source: source || undefined,
      formId: formId || undefined,
      pageId: pageId || undefined
    })
    
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
    
    // Create new lead using the store
    const newLead = leadsDB.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      source: body.source || 'manual',
      status: body.status || 'new',
      form_name: body.form_name || null,
      campaign_name: body.campaign_name || null,
      facebook_lead_id: body.facebook_lead_id || null,
      page_id: body.page_id || null,
      form_id: body.form_id || null,
      custom_fields: body.custom_fields || undefined
    })
    
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
    
    // Update lead using the store
    const updatedLead = leadsDB.update(body.id, body)
    
    if (!updatedLead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }
    
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
    
    // Delete lead using the store
    const deletedLead = leadsDB.delete(leadId)
    
    if (!deletedLead) {
      return NextResponse.json({
        error: 'Lead not found'
      }, { status: 404 })
    }
    
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