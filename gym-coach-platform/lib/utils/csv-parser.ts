import { LeadInsert, LeadStatus } from '@/types/database'

export interface CSVParseResult {
  headers: string[]
  data: Record<string, string>[]
  errors: string[]
}

export interface LeadMappingConfig {
  name?: string
  email?: string
  phone?: string
  status?: string
  source?: string
  qualification_notes?: string
}

export interface ParsedLead {
  data: Partial<LeadInsert>
  errors: string[]
  rowIndex: number
}

export interface ValidatedImportData {
  validLeads: ParsedLead[]
  invalidLeads: ParsedLead[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateEmails: number
  }
}

/**
 * Parse CSV file content into structured data
 */
export function parseCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.trim().split('\n')
  const errors: string[] = []

  if (lines.length < 2) {
    return {
      headers: [],
      data: [],
      errors: ['CSV file must contain at least a header row and one data row']
    }
  }

  // Parse headers
  const headers = parseCSVLine(lines[0])
  
  if (headers.length === 0) {
    return {
      headers: [],
      data: [],
      errors: ['CSV file must contain headers']
    }
  }

  // Parse data rows
  const data: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const line = lines[i].trim()
    
    if (!line) continue // Skip empty lines
    
    const values = parseCSVLine(line)
    
    if (values.length !== headers.length) {
      errors.push(`Line ${lineNumber}: Expected ${headers.length} columns, got ${values.length}`)
      continue
    }
    
    const rowData: Record<string, string> = {}
    headers.forEach((header, index) => {
      rowData[header] = values[index] || ''
    })
    
    data.push(rowData)
  }

  return { headers, data, errors }
}

/**
 * Parse a single CSV line, handling quoted values and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  // Add final field
  result.push(current.trim())
  
  return result
}

/**
 * Map CSV data to Lead objects based on field mapping
 */
export function mapCSVToLeads(
  csvData: Record<string, string>[],
  mapping: LeadMappingConfig,
  organizationId: string
): ParsedLead[] {
  return csvData.map((row, index) => {
    const errors: string[] = []
    const leadData: Partial<LeadInsert> = {
      organization_id: organizationId
    }

    // Map required fields
    if (mapping.name) {
      const name = row[mapping.name]?.trim()
      if (name) {
        leadData.name = name
      } else {
        errors.push('Name is required')
      }
    } else {
      errors.push('Name field mapping is required')
    }

    if (mapping.email) {
      const email = row[mapping.email]?.trim()
      if (email && isValidEmail(email)) {
        leadData.email = email
      } else if (email) {
        errors.push('Invalid email format')
      } else {
        errors.push('Email is required')
      }
    } else {
      errors.push('Email field mapping is required')
    }

    // Map optional fields
    if (mapping.phone) {
      const phone = row[mapping.phone]?.trim()
      if (phone) {
        leadData.phone = phone
      }
    }

    if (mapping.status) {
      const status = row[mapping.status]?.trim().toLowerCase()
      if (status && isValidLeadStatus(status)) {
        leadData.status = status as LeadStatus
      } else if (status) {
        errors.push(`Invalid status: ${status}. Must be one of: cold, warm, hot, converted, lost`)
      }
    }

    if (mapping.source) {
      const source = row[mapping.source]?.trim()
      if (source) {
        leadData.source = source
      } else {
        leadData.source = 'CSV Import'
      }
    } else {
      leadData.source = 'CSV Import'
    }

    if (mapping.qualification_notes) {
      const notes = row[mapping.qualification_notes]?.trim()
      if (notes) {
        leadData.qualification_notes = notes
      }
    }

    return {
      data: leadData,
      errors,
      rowIndex: index
    }
  })
}

/**
 * Validate parsed leads and return summary
 */
export function validateImportData(parsedLeads: ParsedLead[]): ValidatedImportData {
  const validLeads: ParsedLead[] = []
  const invalidLeads: ParsedLead[] = []
  const seenEmails = new Set<string>()
  let duplicateEmails = 0

  parsedLeads.forEach(lead => {
    const hasErrors = lead.errors.length > 0
    
    // Check for duplicate emails within the CSV
    if (lead.data.email && seenEmails.has(lead.data.email)) {
      lead.errors.push('Duplicate email in CSV')
      duplicateEmails++
    } else if (lead.data.email) {
      seenEmails.add(lead.data.email)
    }

    if (hasErrors || lead.errors.length > 0) {
      invalidLeads.push(lead)
    } else {
      validLeads.push(lead)
    }
  })

  return {
    validLeads,
    invalidLeads,
    summary: {
      totalRows: parsedLeads.length,
      validRows: validLeads.length,
      invalidRows: invalidLeads.length,
      duplicateEmails
    }
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if status is a valid LeadStatus
 */
function isValidLeadStatus(status: string): boolean {
  const validStatuses: LeadStatus[] = ['cold', 'warm', 'hot', 'converted', 'lost']
  return validStatuses.includes(status as LeadStatus)
}

/**
 * Generate a sample CSV content for download template
 */
export function generateSampleCSV(): string {
  const headers = ['Name', 'Email', 'Phone', 'Status', 'Source', 'Notes']
  const sampleData = [
    ['John Doe', 'john@example.com', '+1234567890', 'warm', 'Website', 'Interested in personal training'],
    ['Jane Smith', 'jane@example.com', '+0987654321', 'hot', 'Facebook Ad', 'Ready to join this week']
  ]

  const csvLines = [headers, ...sampleData]
  return csvLines.map(line => 
    line.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}