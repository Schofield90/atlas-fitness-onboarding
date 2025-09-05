import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadInsert } from '@/types/database'
import { handleApiRoute } from '@/lib/api/middleware'

interface BulkImportRequest {
  leads: Partial<LeadInsert>[]
}

interface BulkImportResponse {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    index: number
    lead: Partial<LeadInsert>
    error: string
  }>
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiRequest(request)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    const { user, organization } = validation

    const body: BulkImportRequest = await request.json()

    if (!body.leads || !Array.isArray(body.leads)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected array of leads.' },
        { status: 400 }
      )
    }

    if (body.leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided for import' },
        { status: 400 }
      )
    }

    if (body.leads.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot import more than 1000 leads at once' },
        { status: 400 }
      )
    }

    const results: BulkImportResponse = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
      message: ''
    }

    // Check for existing emails to prevent duplicates
    const emails = body.leads
      .map(lead => lead.email)
      .filter(email => email && typeof email === 'string')
      .map(email => email.toLowerCase())

    let existingEmails: string[] = []
    
    if (emails.length > 0) {
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('email')
        .eq('organization_id', organization.id)
        .in('email', emails)

      existingEmails = existingLeads?.map(lead => lead.email.toLowerCase()) || []
    }

    // Process each lead
    for (let i = 0; i < body.leads.length; i++) {
      const leadData = body.leads[i]

      try {
        // Validate required fields
        if (!leadData.name || typeof leadData.name !== 'string') {
          throw new Error('Name is required and must be a string')
        }

        if (!leadData.email || typeof leadData.email !== 'string') {
          throw new Error('Email is required and must be a string')
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(leadData.email)) {
          throw new Error('Invalid email format')
        }

        // Check for duplicate email
        const emailLower = leadData.email.toLowerCase()
        if (existingEmails.includes(emailLower)) {
          throw new Error('Email already exists in the system')
        }

        // Prepare lead for insertion
        const lead: LeadInsert = {
          organization_id: organization.id,
          name: leadData.name.trim(),
          email: emailLower,
          phone: leadData.phone || null,
          status: leadData.status || 'cold',
          source: leadData.source || 'CSV Import',
          lead_score: leadData.lead_score || 0,
          qualification_notes: leadData.qualification_notes || null,
          assigned_to: leadData.assigned_to || null,
          campaign_id: leadData.campaign_id || null,
          metadata: leadData.metadata || {},
          ai_analysis: null
        }

        // Insert lead
        const { error: insertError } = await supabase
          .from('leads')
          .insert([lead])

        if (insertError) {
          throw new Error(insertError.message)
        }

        results.imported++
        existingEmails.push(emailLower) // Add to tracking to prevent duplicates within this batch

      } catch (error) {
        results.failed++
        results.errors.push({
          index: i,
          lead: leadData,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update success status based on results
    if (results.imported === 0) {
      results.success = false
      results.message = 'No leads were imported successfully'
    } else if (results.failed === 0) {
      results.message = `Successfully imported all ${results.imported} leads`
    } else {
      results.message = `Imported ${results.imported} leads with ${results.failed} failures`
    }

    const statusCode = results.success ? 200 : 207 // 207 Multi-Status for partial success

    return NextResponse.json(results, { status: statusCode })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}