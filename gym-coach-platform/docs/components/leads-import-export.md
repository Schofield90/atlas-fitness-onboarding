# Leads Import/Export Components

Technical documentation for developers working with the leads import and export functionality.

## Quick Start

### Basic Import Implementation

```typescript
import { ImportModal } from '@/components/leads/import-modal'
import { useState } from 'react'

function MyComponent() {
  const [showImport, setShowImport] = useState(false)
  
  const handleImport = async (leads: any[]) => {
    // Your import logic here
    const response = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads })
    })
    return response.json()
  }
  
  return (
    <>
      <button onClick={() => setShowImport(true)}>Import Leads</button>
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    </>
  )
}
```

## Components

### ImportModal

Interactive modal for CSV import with three-step workflow.

**Props:**
```typescript
interface ImportModalProps {
  isOpen: boolean                      // Modal visibility state
  onClose: () => void                  // Close handler
  onImport: (leads: any[]) => Promise<void>  // Import handler
  isImporting?: boolean                // Loading state (optional)
}
```

**Usage:**
```typescript
const [importModal, setImportModal] = useState({
  isOpen: false,
  isImporting: false
})

const handleImport = async (leads: any[]) => {
  setImportModal(prev => ({ ...prev, isImporting: true }))
  try {
    await apiClient.importLeads(leads)
    toast.success('Import completed successfully')
    setImportModal({ isOpen: false, isImporting: false })
  } catch (error) {
    toast.error('Import failed')
    setImportModal(prev => ({ ...prev, isImporting: false }))
  }
}

return (
  <ImportModal
    isOpen={importModal.isOpen}
    onClose={() => setImportModal({ isOpen: false, isImporting: false })}
    onImport={handleImport}
    isImporting={importModal.isImporting}
  />
)
```

**Features:**
- Three-step workflow: Upload → Mapping → Preview
- Drag-and-drop file upload
- Real-time CSV validation
- Field mapping interface
- Error reporting and validation summary
- Template download functionality

### FileUpload

Reusable file upload component with drag-and-drop support.

**Props:**
```typescript
interface FileUploadProps {
  onFileSelect: (file: File) => void   // File selection handler
  accept?: string                      // File type filter
  maxSize?: number                     // Max size in MB
  className?: string                   // Additional CSS classes
}
```

**Usage:**
```typescript
<FileUpload 
  onFileSelect={(file) => console.log('File selected:', file.name)}
  accept=".csv"
  maxSize={10}
  className="my-custom-styles"
/>
```

## Utilities

### CSV Parser (`@/lib/utils/csv-parser`)

#### Core Functions

**parseCSV(csvContent: string): CSVParseResult**

Parses CSV content into structured data with error handling.

```typescript
import { parseCSV } from '@/lib/utils/csv-parser'

const handleFile = async (file: File) => {
  const content = await file.text()
  const result = parseCSV(content)
  
  if (result.errors.length > 0) {
    console.warn('Parsing errors:', result.errors)
  }
  
  console.log('Headers:', result.headers)
  console.log('Data:', result.data)
}
```

**mapCSVToLeads(csvData, mapping, organizationId): ParsedLead[]**

Maps CSV data to lead objects using field configuration.

```typescript
import { mapCSVToLeads } from '@/lib/utils/csv-parser'

const mapping = {
  name: 'Full Name',
  email: 'Email Address', 
  phone: 'Phone Number',
  status: 'Lead Status'
}

const parsedLeads = mapCSVToLeads(csvData.data, mapping, orgId)
```

**validateImportData(parsedLeads): ValidatedImportData**

Validates parsed leads and returns validation summary.

```typescript
import { validateImportData } from '@/lib/utils/csv-parser'

const validation = validateImportData(parsedLeads)

console.log('Valid leads:', validation.validLeads.length)
console.log('Invalid leads:', validation.invalidLeads.length)
console.log('Summary:', validation.summary)
```

**generateSampleCSV(): string**

Generates sample CSV content for template downloads.

```typescript
import { generateSampleCSV } from '@/lib/utils/csv-parser'
import { downloadCSV } from '@/lib/utils/csv-export'

const sampleContent = generateSampleCSV()
downloadCSV(sampleContent, 'leads-template.csv')
```

#### Type Definitions

```typescript
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
```

### CSV Export (`@/lib/utils/csv-export`)

#### Core Functions

**leadsToCSV(leads: Lead[], config?: ExportConfig): string**

Converts lead data to CSV format.

```typescript
import { leadsToCSV } from '@/lib/utils/csv-export'

const csvContent = leadsToCSV(leads, {
  fields: ['name', 'email', 'phone', 'status'],
  includeHeaders: true
})
```

**downloadCSV(csvContent: string, filename: string): void**

Triggers CSV file download in browser.

```typescript
import { downloadCSV, generateExportFilename } from '@/lib/utils/csv-export'

const filename = generateExportFilename('my-leads')
downloadCSV(csvContent, filename)
```

**generateExportFilename(prefix: string): string**

Generates timestamped filename for exports.

```typescript
const filename = generateExportFilename('leads-export')
// Returns: "leads-export-2025-08-30-14-30-25.csv"
```

**getExportFieldOptions(): { value: keyof Lead; label: string }[]**

Returns available fields for export configuration.

```typescript
import { getExportFieldOptions } from '@/lib/utils/csv-export'

const fieldOptions = getExportFieldOptions()
// Use in select dropdowns or configuration UIs
```

#### Type Definitions

```typescript
export interface ExportConfig {
  fields: (keyof Lead)[]
  filename?: string
  includeHeaders?: boolean
}
```

## API Integration

### Import Endpoint Usage

```typescript
const importLeads = async (leads: any[]) => {
  try {
    const response = await fetch('/api/leads/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ leads })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Import failed:', error)
    throw error
  }
}
```

### Export Endpoint Usage

```typescript
// Export with filters
const exportWithFilters = async (filters: {
  status?: string
  search?: string
  format?: 'csv' | 'json'
}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value)
  })
  
  const response = await fetch(`/api/leads/export?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (filters.format === 'json') {
    return response.json()
  } else {
    const blob = await response.blob()
    // Handle CSV download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Export specific leads
const exportSelectedLeads = async (leadIds: string[]) => {
  const response = await fetch('/api/leads/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      leadIds,
      format: 'csv',
      fields: ['name', 'email', 'status']
    })
  })
  
  const blob = await response.blob()
  // Handle download...
}
```

## Error Handling

### Common Error Patterns

```typescript
// Import error handling
const handleImportError = (error: any) => {
  if (error.message.includes('duplicate')) {
    toast.error('Some leads already exist in the system')
  } else if (error.message.includes('validation')) {
    toast.error('Please check the CSV format and required fields')
  } else if (error.message.includes('limit')) {
    toast.error('Too many leads. Maximum 1,000 per import')
  } else {
    toast.error('Import failed. Please try again')
  }
}

// Export error handling
const handleExportError = (error: any) => {
  if (error.message.includes('no leads found')) {
    toast.error('No leads match your export criteria')
  } else if (error.message.includes('limit exceeded')) {
    toast.error('Too many leads to export. Please use filters')
  } else {
    toast.error('Export failed. Please try again')
  }
}
```

### Validation Error Display

```typescript
const displayValidationErrors = (validation: ValidatedImportData) => {
  if (validation.invalidLeads.length > 0) {
    const errorSummary = validation.invalidLeads
      .slice(0, 5) // Show first 5 errors
      .map(lead => `Row ${lead.rowIndex + 1}: ${lead.errors.join(', ')}`)
      .join('\n')
    
    toast.error(`Validation errors:\n${errorSummary}`)
  }
}
```

## Performance Considerations

### Memory Management

- **Large CSV Files**: Parser processes files in chunks to avoid memory issues
- **Export Operations**: Uses streaming for large datasets
- **Component Cleanup**: ImportModal cleans up file references on unmount

### Best Practices

1. **File Size Validation**: Always check file size before processing
```typescript
const validateFileSize = (file: File, maxSizeMB: number = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }
}
```

2. **Batch Processing**: Process large imports in batches
```typescript
const batchImport = async (leads: any[], batchSize = 100) => {
  const batches = []
  for (let i = 0; i < leads.length; i += batchSize) {
    batches.push(leads.slice(i, i + batchSize))
  }
  
  for (const batch of batches) {
    await importLeads(batch)
    // Add delay between batches if needed
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
```

3. **Loading States**: Always show loading indicators
```typescript
const [loading, setLoading] = useState({
  importing: false,
  exporting: false,
  parsing: false
})
```

## Testing

### Unit Test Examples

```typescript
import { parseCSV, validateImportData } from '@/lib/utils/csv-parser'

describe('CSV Parser', () => {
  test('should parse valid CSV', () => {
    const csvContent = 'Name,Email\nJohn,john@test.com'
    const result = parseCSV(csvContent)
    
    expect(result.headers).toEqual(['Name', 'Email'])
    expect(result.data).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
  
  test('should handle validation errors', () => {
    const parsedLeads = [{
      data: { name: 'John', email: 'invalid-email' },
      errors: ['Invalid email format'],
      rowIndex: 0
    }]
    
    const validation = validateImportData(parsedLeads)
    expect(validation.invalidLeads).toHaveLength(1)
  })
})
```

### Integration Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportModal } from '@/components/leads/import-modal'

describe('ImportModal', () => {
  test('should handle file upload', async () => {
    const onImport = jest.fn()
    const onClose = jest.fn()
    
    render(
      <ImportModal
        isOpen={true}
        onClose={onClose}
        onImport={onImport}
      />
    )
    
    const fileInput = screen.getByRole('button', { name: /upload/i })
    const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', {
      type: 'text/csv'
    })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    // Test continues...
  })
})
```

## Troubleshooting

### Common Issues

1. **CSV Parsing Fails**: Check for proper encoding (UTF-8) and valid CSV structure
2. **Import Timeout**: Large files may need to be split into smaller batches
3. **Validation Errors**: Ensure required fields (name, email) are present and valid
4. **Export Not Downloading**: Check browser pop-up blockers and JavaScript settings
5. **Memory Issues**: Use chunked processing for large datasets

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const DEBUG_IMPORT_EXPORT = process.env.NODE_ENV === 'development'

if (DEBUG_IMPORT_EXPORT) {
  console.log('CSV parsing result:', parseResult)
  console.log('Field mapping:', mapping)
  console.log('Validation summary:', validation.summary)
}
```

## Migration Guide

### From Manual Lead Creation

If migrating from individual lead creation to bulk import:

1. Export existing leads using the export functionality
2. Use the exported CSV as a template for new imports
3. Map additional fields as needed
4. Test with small batches first

### Integration with External Systems

For integrating with CRM systems:

1. Map external field names to internal schema
2. Implement custom validation rules if needed
3. Use the API endpoints for programmatic import/export
4. Handle rate limiting and error responses appropriately