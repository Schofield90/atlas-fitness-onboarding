import { Lead } from '@/types/database'

export interface ExportConfig {
  fields: (keyof Lead)[]
  filename?: string
  includeHeaders?: boolean
}

/**
 * Convert leads data to CSV format
 */
export function leadsToCSV(leads: Lead[], config?: Partial<ExportConfig>): string {
  const defaultConfig: ExportConfig = {
    fields: ['name', 'email', 'phone', 'status', 'source', 'lead_score', 'qualification_notes', 'created_at'],
    includeHeaders: true
  }

  const finalConfig = { ...defaultConfig, ...config }

  // Create headers
  const headers = finalConfig.fields.map(field => formatFieldName(field))
  const csvLines: string[] = []

  if (finalConfig.includeHeaders) {
    csvLines.push(headers.map(header => escapeCSVField(header)).join(','))
  }

  // Add data rows
  leads.forEach(lead => {
    const row = finalConfig.fields.map(field => {
      const value = lead[field]
      return escapeCSVField(formatFieldValue(field, value))
    })
    csvLines.push(row.join(','))
  })

  return csvLines.join('\n')
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent: string, filename: string = 'leads-export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string = 'leads'): string {
  const now = new Date()
  const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD format
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS format
  return `${prefix}-${timestamp}-${time}.csv`
}

/**
 * Escape CSV field values to handle commas, quotes, and newlines
 */
function escapeCSVField(value: string): string {
  // Convert to string if not already
  const stringValue = String(value || '')
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Format field names for CSV headers
 */
function formatFieldName(field: keyof Lead): string {
  const fieldNames: Record<keyof Lead, string> = {
    id: 'ID',
    organization_id: 'Organization ID',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    status: 'Status',
    lead_score: 'Lead Score',
    source: 'Source',
    campaign_id: 'Campaign ID',
    metadata: 'Metadata',
    ai_analysis: 'AI Analysis',
    qualification_notes: 'Notes',
    assigned_to: 'Assigned To',
    created_at: 'Created Date',
    updated_at: 'Updated Date'
  }

  return fieldNames[field] || field
}

/**
 * Format field values for CSV export
 */
function formatFieldValue(field: keyof Lead, value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (field) {
    case 'status':
      return String(value).charAt(0).toUpperCase() + String(value).slice(1)
    
    case 'created_at':
    case 'updated_at':
      return new Date(value).toLocaleString()
    
    case 'lead_score':
      return String(value || 0)
    
    case 'metadata':
    case 'ai_analysis':
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
    
    default:
      return String(value)
  }
}

/**
 * Get available field options for export configuration
 */
export function getExportFieldOptions(): { value: keyof Lead; label: string }[] {
  return [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'status', label: 'Status' },
    { value: 'source', label: 'Source' },
    { value: 'lead_score', label: 'Lead Score' },
    { value: 'qualification_notes', label: 'Notes' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Updated Date' }
  ]
}