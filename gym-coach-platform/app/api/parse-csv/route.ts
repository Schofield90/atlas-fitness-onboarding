import { NextRequest } from 'next/server'
import { handleApiRoute, createServerStorageClient } from '@/lib/api/middleware'
import { parseCSV, mapCSVToLeads, validateImportData } from '@/lib/utils/csv-parser'

interface ParseCSVRequest {
  fileContent?: string
  mapping?: {
    name?: string
    email?: string
    phone?: string
    status?: string
    source?: string
    qualification_notes?: string
  }
}

interface ParseCSVResponse {
  success: boolean
  headers?: string[]
  previewData?: Array<Record<string, string>>
  mappedData?: {
    validLeads: number
    invalidLeads: number
    totalRows: number
    duplicateEmails: number
  }
  errors?: string[]
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const user = req.user

    // Validate request size (10MB limit)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('File size exceeds maximum limit')
    }

    const body: ParseCSVRequest = await request.json()

    if (!body.fileContent) {
      throw new Error('CSV content is required')
    }

    // Validate file content is reasonable size for processing
    if (body.fileContent.length > 5 * 1024 * 1024) { // 5MB content limit
      throw new Error('CSV content too large for processing')
    }

    // Basic CSV content validation
    if (typeof body.fileContent !== 'string' || body.fileContent.trim().length === 0) {
      throw new Error('Valid CSV content required')
    }

    // Parse CSV content
    const parseResult = parseCSV(body.fileContent)

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        errors: parseResult.errors.slice(0, 10) // Limit error count in response
      }
    }

    // If no mapping provided, return headers and preview data
    if (!body.mapping) {
      return {
        success: true,
        headers: parseResult.headers,
        previewData: parseResult.data.slice(0, 5), // Only return first 5 rows for preview
        errors: []
      }
    }

    // Validate mapping configuration
    const validMappingKeys = ['name', 'email', 'phone', 'status', 'source', 'qualification_notes']
    const mapping = body.mapping

    if (!mapping.name || !mapping.email) {
      throw new Error('Name and email field mappings are required')
    }

    // Validate mapping values against available headers
    for (const [key, value] of Object.entries(mapping)) {
      if (value && !parseResult.headers.includes(value)) {
        throw new Error(`Mapped field '${value}' not found in CSV headers`)
      }

      if (!validMappingKeys.includes(key)) {
        throw new Error(`Invalid mapping field: ${key}`)
      }
    }

    // Map CSV data to leads with the provided mapping
    const parsedLeads = mapCSVToLeads(parseResult.data, mapping, user.organization_id)

    // Validate the mapped data
    const validatedData = validateImportData(parsedLeads)

    const response: ParseCSVResponse = {
      success: true,
      headers: parseResult.headers,
      mappedData: {
        validLeads: validatedData.summary.validRows,
        invalidLeads: validatedData.summary.invalidRows,
        totalRows: validatedData.summary.totalRows,
        duplicateEmails: validatedData.summary.duplicateEmails
      },
      errors: validatedData.invalidLeads.slice(0, 10).map(lead =>
        `Row ${lead.rowIndex + 1}: ${lead.errors.join(', ')}`
      )
    }

    return response

  }, {
    requireAuth: true,
    rateLimit: true // Apply rate limiting for CSV parsing operations
  })
}

// Only allow POST method for this endpoint
export async function GET() {
  return new Response('Method not allowed', { status: 405 })
}

export async function PUT() {
  return new Response('Method not allowed', { status: 405 })
}

export async function DELETE() {
  return new Response('Method not allowed', { status: 405 })
}