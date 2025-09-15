import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateRequest, createApiResponse, handleApiRoute, sanitizeErrorMessage } from '@/lib/api/middleware'
import { leadsToCSV, generateExportFilename } from '@/lib/utils/csv-export'
import { Lead } from '@/types/database'

interface ExportQuery {
  format?: 'csv' | 'json'
  fields?: string
  status?: string
  search?: string
  limit?: string
  includeHeaders?: string
}

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const supabase = await createClient()
    const user = req.user
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const query: ExportQuery = {
      format: (searchParams.get('format') || 'csv') as 'csv' | 'json',
      fields: searchParams.get('fields') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || '1000',
      includeHeaders: searchParams.get('includeHeaders') || 'true'
    }

    // Enhanced input validation and sanitization
    const limit = parseInt(query.limit || '1000', 10)
    if (isNaN(limit) || limit <= 0 || limit > 10000) {
      throw new Error('Export limit exceeds allowed range')
    }

    // Sanitize search parameter to prevent injection
    if (query.search) {
      query.search = query.search.trim().substring(0, 100)
      if (!/^[a-zA-Z0-9@._\-\s]*$/.test(query.search)) {
        throw new Error('Invalid search parameters')
      }
    }

    // Build Supabase query
    let supabaseQuery = supabase
      .from('leads')
      .select('*')
      .eq('organization_id', user.organization_id)
      .limit(limit)
      .order('created_at', { ascending: false })

    // Apply filters
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status)
    }

    if (query.search) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query.search}%,email.ilike.%${query.search}%,phone.ilike.%${query.search}%`
      )
    }

    // Execute query
    const { data: leads, error } = await supabaseQuery

    if (error) {
      console.error('Database error:', error)
      throw new Error('Data export failed')
    }

    if (!leads || leads.length === 0) {
      throw new Error('No data found for export')
    }

    // Handle JSON export with sanitized data
    if (query.format === 'json') {
      return {
        data: leads.map(lead => ({
          ...lead,
          // Remove any potential sensitive fields
          metadata: undefined,
          ai_analysis: lead.ai_analysis ? { status: lead.ai_analysis.status || 'processed' } : null
        })),
        meta: {
          total: leads.length,
          exported_at: new Date().toISOString()
          // Don't expose organization_id in response
        }
      }
    }

    // Handle CSV export
    let fieldsToExport: (keyof Lead)[]

    if (query.fields) {
      // Parse custom field selection
      const requestedFields = query.fields.split(',').map(f => f.trim()) as (keyof Lead)[]
      const validFields: (keyof Lead)[] = [
        'name', 'email', 'phone', 'status', 'source', 'lead_score', 
        'qualification_notes', 'created_at', 'updated_at'
      ]
      fieldsToExport = requestedFields.filter(field => validFields.includes(field))
      
      if (fieldsToExport.length === 0) {
        fieldsToExport = validFields
      }
    } else {
      // Default fields for CSV export
      fieldsToExport = [
        'name', 'email', 'phone', 'status', 'source', 'lead_score', 
        'qualification_notes', 'created_at'
      ]
    }

    // Generate CSV content
    const csvContent = leadsToCSV(leads as Lead[], {
      fields: fieldsToExport,
      includeHeaders: query.includeHeaders === 'true'
    })

    // Generate filename
    const filename = generateExportFilename('leads')

    // Return CSV response with security headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Records': leads.length.toString(),
        'X-Export-Date': new Date().toISOString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }, { requireAuth: true, rateLimit: true })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const supabase = await createClient()
    const user = req.user
    const body = await request.json()

    // Enhanced input validation
    const { leadIds, format = 'csv', fields } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('Valid lead identifiers required')
    }

    if (leadIds.length > 10000) {
      throw new Error('Export batch size exceeds limit')
    }

    // Validate lead IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!leadIds.every(id => typeof id === 'string' && uuidRegex.test(id))) {
      throw new Error('Invalid identifier format')
    }

    // Fetch specific leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', user.organization_id)
      .in('id', leadIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      throw new Error('Data retrieval failed')
    }

    if (!leads || leads.length === 0) {
      throw new Error('No data found for the specified selection')
    }

    // Handle JSON export with sanitized data
    if (format === 'json') {
      return {
        data: leads.map(lead => ({
          ...lead,
          // Remove sensitive fields
          metadata: undefined,
          ai_analysis: lead.ai_analysis ? { status: lead.ai_analysis.status || 'processed' } : null
        })),
        meta: {
          total: leads.length,
          requested: leadIds.length,
          exported_at: new Date().toISOString()
        }
      }
    }

    // Handle CSV export
    let fieldsToExport: (keyof Lead)[]

    if (fields && Array.isArray(fields)) {
      const validFields: (keyof Lead)[] = [
        'name', 'email', 'phone', 'status', 'source', 'lead_score', 
        'qualification_notes', 'created_at', 'updated_at'
      ]
      fieldsToExport = fields.filter(field => validFields.includes(field))
      
      if (fieldsToExport.length === 0) {
        fieldsToExport = validFields
      }
    } else {
      fieldsToExport = [
        'name', 'email', 'phone', 'status', 'source', 'lead_score', 
        'qualification_notes', 'created_at'
      ]
    }

    // Generate CSV content
    const csvContent = leadsToCSV(leads as Lead[], {
      fields: fieldsToExport,
      includeHeaders: true
    })

    // Generate filename
    const filename = generateExportFilename('leads-selected')

    // Return CSV response with security headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Records': leads.length.toString(),
        'X-Requested-Records': leadIds.length.toString(),
        'X-Export-Date': new Date().toISOString(),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }, { requireAuth: true, rateLimit: true })
}