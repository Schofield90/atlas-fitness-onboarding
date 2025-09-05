import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiRoute } from '@/lib/api/middleware'
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
  try {
    // For now, create a mock validation response to make it build
    const supabase = await createClient()
    // TODO: Implement proper authentication
    const user = { organization_id: 'mock-org-id' }
    
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

    // Validate limit
    const limit = parseInt(query.limit || '1000', 10)
    if (isNaN(limit) || limit <= 0 || limit > 10000) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 10000' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found matching the criteria' },
        { status: 404 }
      )
    }

    // Handle JSON export
    if (query.format === 'json') {
      return NextResponse.json({
        data: leads,
        meta: {
          total: leads.length,
          exported_at: new Date().toISOString(),
          organization_id: organization.id
        }
      })
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

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Records': leads.length.toString(),
        'X-Export-Date': new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiRequest(request)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    const { user, organization } = validation
    const body = await request.json()

    // Extract lead IDs from request body
    const { leadIds, format = 'csv', fields } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs are required' },
        { status: 400 }
      )
    }

    if (leadIds.length > 10000) {
      return NextResponse.json(
        { error: 'Cannot export more than 10000 leads at once' },
        { status: 400 }
      )
    }

    // Fetch specific leads
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organization.id)
      .in('id', leadIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found with the provided IDs' },
        { status: 404 }
      )
    }

    // Handle JSON export
    if (format === 'json') {
      return NextResponse.json({
        data: leads,
        meta: {
          total: leads.length,
          requested: leadIds.length,
          exported_at: new Date().toISOString(),
          organization_id: organization.id
        }
      })
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

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Records': leads.length.toString(),
        'X-Requested-Records': leadIds.length.toString(),
        'X-Export-Date': new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}