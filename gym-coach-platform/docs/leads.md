# Leads Management

The Gym Coach Platform provides comprehensive lead management capabilities including manual lead creation, CSV import for bulk operations, and flexible export options for data analysis and external system integration.

## Quick Start

### Adding Single Leads

1. Navigate to the Leads dashboard
2. Click the "+" button in the header
3. Select "Add Lead" from the dropdown
4. Fill out the required information (name, email)
5. Add optional information (phone, status, source, notes)
6. Click "Save" to create the lead

### Bulk Import from CSV

1. Navigate to the Leads dashboard
2. Click the "Import" button
3. Follow the three-step import process:
   - **Upload**: Select your CSV file or download our template
   - **Mapping**: Map CSV columns to lead fields
   - **Preview**: Review validation results and import

### Exporting Lead Data

1. Navigate to the Leads dashboard
2. Use one of these export methods:
   - **Export All**: Click "Export" to download all leads
   - **Export Filtered**: Use search/filters, then export
   - **Export Selected**: Select specific leads and export

## CSV Import Process

### Step 1: Upload CSV File

**Supported Format**: CSV files up to 10MB
**Record Limit**: Maximum 1,000 leads per import

#### CSV Template

Download the template from the import modal for the correct format:

```csv
Name,Email,Phone,Status,Source,Notes
John Doe,john@example.com,+1234567890,warm,Website,Interested in personal training
Jane Smith,jane@example.com,+0987654321,hot,Facebook Ad,Ready to join this week
```

#### File Requirements

- **Headers Required**: First row must contain column headers
- **UTF-8 Encoding**: Ensure proper character encoding
- **Comma Separated**: Standard CSV format with comma delimiters
- **Quoted Fields**: Fields containing commas must be quoted

### Step 2: Field Mapping

Map your CSV columns to lead fields:

#### Required Fields
- **Name**: Lead's full name (required)
- **Email**: Valid email address (required, must be unique)

#### Optional Fields
- **Phone**: Contact phone number
- **Status**: Lead status (cold, warm, hot, converted, lost)
- **Source**: Lead source identifier
- **Notes**: Qualification notes or additional information

#### Validation Rules

- **Email Format**: Must be valid email format (user@domain.com)
- **Duplicate Detection**: Email addresses must be unique within organization
- **Status Values**: Must be one of: cold, warm, hot, converted, lost
- **Field Length**: Name and email limited to reasonable lengths
- **Special Characters**: Properly handled in all fields

### Step 3: Preview and Import

Review the validation summary before importing:

- **Total Rows**: Number of records found in CSV
- **Valid Leads**: Records that passed validation
- **Invalid Leads**: Records with errors (will be skipped)
- **Duplicates**: Email addresses already in system

#### Error Handling

Common validation errors:
- Missing required fields (name or email)
- Invalid email format
- Duplicate email addresses
- Invalid status values
- Malformed CSV structure

**Resolution**: Fix errors in your CSV file and re-upload, or proceed with valid records only.

## Export Functionality

### Export Options

#### Format Options
- **CSV**: Structured data for spreadsheet applications
- **JSON**: Machine-readable format for integrations

#### Field Selection
Choose which lead fields to include:
- Name, Email, Phone (contact information)
- Status, Source, Lead Score (qualification data)
- Notes, Created Date, Updated Date (metadata)

### Export Methods

#### 1. Export All Leads
```
GET /api/leads/export?format=csv&fields=name,email,phone,status
```
Downloads all leads for your organization with optional filtering.

#### 2. Export with Filters
```
GET /api/leads/export?format=csv&status=warm&search=john&limit=500
```
**Supported Filters**:
- `status`: Filter by lead status
- `search`: Search in name, email, or phone
- `limit`: Maximum records (default: 1000, max: 10000)

#### 3. Export Selected Leads
```
POST /api/leads/export
Content-Type: application/json

{
  "leadIds": ["lead-id-1", "lead-id-2"],
  "format": "csv",
  "fields": ["name", "email", "status"]
}
```
Export specific leads by ID.

### Performance Limits

- **GET Exports**: Up to 10,000 leads per request
- **POST Exports**: Up to 10,000 leads per request
- **File Size**: Automatic chunking for large datasets
- **Rate Limiting**: Standard API rate limits apply

## Configuration Options

### Default Field Values

When importing leads, the system applies these defaults:

- **Status**: "cold" if not specified
- **Source**: "CSV Import" if not provided
- **Lead Score**: 0 if not provided
- **AI Analysis**: null (computed separately)

### Performance Characteristics

**Import Performance:**
- Processing speed: ~100 leads per second
- Memory usage: Minimal (streaming processing)
- Database validation: Real-time duplicate detection
- Error handling: Granular validation with detailed feedback

**Export Performance:**
- Large dataset handling: Automatic response streaming
- Memory efficiency: Row-by-row processing
- Custom field selection: Reduces payload size
- Filename generation: Automatic timestamping

### CSV Template Customization

The downloadable template includes:
- Sample data showing proper formatting
- All available field headers
- Example values for status and source fields
- Comments explaining field requirements

### Advanced Configuration

**Import Limits:**
- **File Size**: Maximum 10MB per upload
- **Record Count**: 1,000 leads per import batch
- **Concurrent Imports**: One active import per organization
- **Validation Timeout**: 30 seconds for large files

**Export Limits:**
- **GET Requests**: 10,000 leads maximum
- **POST Requests**: 10,000 leads maximum
- **File Generation**: Automatic chunking for large datasets
- **API Rate Limits**: 60 requests per minute per organization

## Troubleshooting

### Common Import Issues

**Problem**: "CSV parsing errors"
**Solution**: Ensure file is properly formatted CSV with consistent column counts

**Problem**: "Email already exists"
**Solution**: Remove duplicate emails from CSV or update existing records separately

**Problem**: "Invalid email format"
**Solution**: Verify email addresses match format: user@domain.com

**Problem**: "Import limit exceeded"
**Solution**: Split large files into smaller batches (max 1,000 per import)

**Problem**: "CSV file too large"
**Solution**: Ensure file is under 10MB; compress or split large datasets

**Problem**: "Field mapping validation failed"
**Solution**: Ensure Name and Email fields are mapped to valid CSV columns

### Export Issues

**Problem**: "No leads found matching criteria"
**Solution**: Verify filter parameters and ensure leads exist in your organization

**Problem**: "Export limit exceeded"
**Solution**: Use more specific filters or export in smaller batches

**Problem**: "Invalid field selection"
**Solution**: Ensure field names match available options: name, email, phone, status, source, lead_score, qualification_notes, created_at, updated_at

**Problem**: "Export request timeout"
**Solution**: Use more specific filters or reduce the number of exported records

**Problem**: "File download not starting"
**Solution**: Check browser pop-up blockers and ensure JavaScript is enabled

### CSV Format Issues

**Problem**: Commas in data break columns
**Solution**: Quote fields containing commas: "Smith, John"

**Problem**: Special characters not displaying correctly
**Solution**: Save CSV with UTF-8 encoding

**Problem**: Date fields not formatting correctly
**Solution**: Use ISO format (YYYY-MM-DD) or let system auto-generate timestamps

## API Integration

For developers integrating with external systems:

### Import Endpoint
```
POST /api/leads/import
Content-Type: application/json
Authorization: Bearer <token>

{
  "leads": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "warm",
      "source": "API Import",
      "qualification_notes": "Interested in personal training"
    }
  ]
}
```

### Export Endpoints
```
GET /api/leads/export?format=json&limit=100
POST /api/leads/export (for selected leads)
```

### Authentication
All API endpoints require valid authentication token with appropriate organization permissions.

## Migration from Other Systems

### CRM Integration
When migrating from other CRM systems:

1. Export data from existing system
2. Map fields to our schema
3. Clean and validate data
4. Import in batches if large dataset
5. Verify imported data accuracy

### Field Mapping Guide

Common CRM field mappings:
- **Full Name** → Name
- **Email Address** → Email  
- **Phone Number** → Phone
- **Lead Status/Stage** → Status
- **Lead Source/Campaign** → Source
- **Notes/Description** → Qualification Notes

## Component Integration

### ImportModal Component Usage

```typescript
import { ImportModal } from '@/components/leads/import-modal'

function LeadsPage() {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async (leads: any[]) => {
    setIsImporting(true)
    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} leads`)
      } else {
        toast.error(`Import completed with ${result.failed} errors`)
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div>
      <button onClick={() => setIsImportOpen(true)}>
        Import Leads
      </button>
      
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        isImporting={isImporting}
      />
    </div>
  )
}
```

### CSV Utility Functions

```typescript
import { 
  parseCSV, 
  mapCSVToLeads, 
  validateImportData 
} from '@/lib/utils/csv-parser'
import { 
  leadsToCSV, 
  downloadCSV, 
  generateExportFilename 
} from '@/lib/utils/csv-export'

// Parse uploaded CSV file
const handleFileUpload = async (file: File) => {
  const content = await file.text()
  const parsed = parseCSV(content)
  
  if (parsed.errors.length > 0) {
    console.warn('CSV parsing issues:', parsed.errors)
  }
  
  return parsed
}

// Export leads to CSV
const exportLeads = (leads: Lead[]) => {
  const csvContent = leadsToCSV(leads, {
    fields: ['name', 'email', 'phone', 'status'],
    includeHeaders: true
  })
  
  const filename = generateExportFilename('leads-export')
  downloadCSV(csvContent, filename)
}
```

## Security Considerations

### Data Validation
- **Input Sanitization**: All CSV input is sanitized before processing
- **SQL Injection Prevention**: Parameterized queries for all database operations
- **XSS Protection**: CSV content is escaped during display and processing
- **File Type Validation**: Only .csv files accepted, with content verification

### Access Control
- **Organization Isolation**: Users can only import/export leads from their organization
- **Authentication Required**: All API endpoints require valid JWT tokens
- **Permission Validation**: Import/export permissions checked per organization
- **Audit Logging**: All import/export operations are logged for compliance

### Data Privacy
- **PII Handling**: Email addresses and personal data handled according to GDPR
- **Data Retention**: Exported files not stored server-side
- **Secure Transport**: All API calls use HTTPS encryption
- **Access Logging**: Import/export activities tracked for security audits

## Future Enhancements

Planned features for upcoming releases:
- Automated duplicate merging with configurable merge rules
- Advanced field mapping with custom data transformation functions
- Scheduled exports and imports with cron-like scheduling
- Integration with external CRM systems (HubSpot, Salesforce)
- Bulk edit capabilities for imported leads with validation
- Advanced validation rules and custom field support
- Real-time import progress tracking with WebSocket updates
- Export templates for different use cases (sales, marketing, analysis)