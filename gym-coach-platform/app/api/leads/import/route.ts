import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadInsert } from '@/types/database'
import { authenticateRequest, createApiResponse, handleApiRoute, sanitizeErrorMessage } from '@/lib/api/middleware'

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
  return handleApiRoute(request, async (req) => {
    const supabase = await createClient()
    const user = req.user

    const body: BulkImportRequest = await request.json()

    // Enhanced input validation
    if (!body.leads || !Array.isArray(body.leads)) {
      throw new Error('Invalid request format')
    }

    if (body.leads.length === 0) {
      throw new Error('No leads provided for import')
    }

    if (body.leads.length > 1000) {
      throw new Error('Batch size exceeds maximum limit')
    }

    // Additional security: validate payload size
    const requestSize = JSON.stringify(body).length
    if (requestSize > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Request payload too large')
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
        .eq('organization_id', user.organization_id)
        .in('email', emails)

      existingEmails = existingLeads?.map(lead => lead.email.toLowerCase()) || []
    }

    // Process each lead with enhanced security
    for (let i = 0; i < body.leads.length; i++) {
      const leadData = body.leads[i]

      try {
        // Enhanced input sanitization
        if (!leadData.name || typeof leadData.name !== 'string' || leadData.name.trim().length === 0) {
          throw new Error('Valid name is required')
        }

        if (!leadData.email || typeof leadData.email !== 'string' || leadData.email.trim().length === 0) {
          throw new Error('Valid email is required')
        }

        // Sanitize inputs to prevent injection attacks
        const sanitizedName = leadData.name.trim().substring(0, 255)
        const sanitizedEmail = leadData.email.trim().toLowerCase().substring(0, 255)
        const sanitizedPhone = leadData.phone ? leadData.phone.trim().substring(0, 50) : null
        const sanitizedNotes = leadData.qualification_notes ? leadData.qualification_notes.trim().substring(0, 1000) : null

        // Validate email format with enhanced regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(sanitizedEmail)) {
          throw new Error('Invalid email format')
        }

        // Check for duplicate email
        if (existingEmails.includes(sanitizedEmail)) {
          throw new Error('Duplicate email detected')
        }

        // Validate status if provided
        const validStatuses = ['cold', 'warm', 'hot', 'converted', 'lost']
        const status = leadData.status && validStatuses.includes(leadData.status) ? leadData.status : 'cold'

        // Prepare lead for insertion with proper sanitization
        const lead: LeadInsert = {
          organization_id: user.organization_id,
          name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          status: status,
          source: leadData.source?.trim().substring(0, 100) || 'CSV Import',
          lead_score: typeof leadData.lead_score === 'number' && leadData.lead_score >= 0 && leadData.lead_score <= 100 ? leadData.lead_score : 0,
          qualification_notes: sanitizedNotes,
          assigned_to: leadData.assigned_to || null,
          campaign_id: leadData.campaign_id || null,
          metadata: {}, // Don't trust arbitrary metadata from CSV
          ai_analysis: null
        }

        // Insert lead with error handling
        const { error: insertError } = await supabase
          .from('leads')
          .insert([lead])

        if (insertError) {
          // Don't expose database error details
          throw new Error('Database operation failed')
        }

        results.imported++
        existingEmails.push(sanitizedEmail) // Add to tracking to prevent duplicates within this batch

      } catch (error) {
        results.failed++
        results.errors.push({
          index: i,
          lead: { name: leadData.name, email: leadData.email }, // Only include safe fields in error response
          error: sanitizeErrorMessage(error instanceof Error ? error.message : 'Processing error')
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

    return results
  }, { requireAuth: true, rateLimit: true })
}