# Dashboard API Documentation

This document outlines the API endpoints, data structures, and integration patterns used by the dashboard components.

## Data Structures

### Notification Interface

```typescript
interface Notification {
  id: number
  title: string        // Brief notification title
  message: string      // Detailed notification message  
  time: string        // Human-readable timestamp
  unread: boolean     // Determines notification badge count
}
```

**Example:**
```json
{
  "id": 1,
  "title": "New lead assigned",
  "message": "John Doe has been assigned to you", 
  "time": "2 minutes ago",
  "unread": true
}
```

### Integration Card Interface

```typescript
interface IntegrationCardProps {
  name: string                              // Integration service name
  status: 'connected' | 'disconnected'     // Connection status
  icon: React.ReactNode                     // Service icon component
  description?: string                      // Optional service description
}
```

**Example:**
```json
{
  "name": "WhatsApp",
  "status": "connected",
  "description": "Send automated messages and handle customer inquiries"
}
```

## API Endpoints

### Dashboard Metrics

**Endpoint:** `GET /api/dashboard/metrics`

**Description:** Retrieves dashboard overview metrics and statistics

**Response:**
```json
{
  "leads": {
    "total": 156,
    "new_today": 12,
    "conversion_rate": 23.5
  },
  "clients": {
    "active": 89,
    "new_this_month": 15
  },
  "revenue": {
    "monthly": 12450,
    "growth": 8.2
  }
}
```

### Notifications

**Endpoint:** `GET /api/notifications`

**Description:** Retrieves user notifications with pagination

**Query Parameters:**
- `limit` (optional): Number of notifications to retrieve (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `unread_only` (optional): Filter for unread notifications only

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "New lead assigned",
      "message": "John Doe has been assigned to you",
      "time": "2025-08-30T10:15:00Z",
      "unread": true
    }
  ],
  "total_count": 45,
  "unread_count": 3
}
```

**Endpoint:** `POST /api/notifications/mark-read`

**Description:** Marks notifications as read

**Request Body:**
```json
{
  "notification_ids": [1, 2, 3]  // Array of notification IDs, empty array for all
}
```

**Response:**
```json
{
  "success": true,
  "marked_count": 3
}
```

### Lead Management

**Endpoint:** `POST /api/leads`

**Description:** Creates a new lead (triggered by plus button)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "+44123456789",
  "source": "dashboard",
  "status": "new"
}
```

**Response:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+44123456789", 
  "source": "dashboard",
  "status": "new",
  "created_at": "2025-08-30T10:15:00Z"
}
```

### Lead Import/Export

#### Implementation Examples

**Client-Side Import Flow:**
```typescript
import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    index: number
    lead: Record<string, any>
    error: string
  }>
  message: string
}

const useLeadImport = () => {
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportResult | null>(null)

  const importLeads = async (leads: any[]): Promise<ImportResult> => {
    setIsImporting(true)
    setImportProgress(null)
    
    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ leads })
      })

      const result: ImportResult = await response.json()
      setImportProgress(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} leads`)
      } else if (result.imported > 0) {
        toast.success(`Imported ${result.imported} leads with ${result.failed} errors`)
      } else {
        toast.error('Import failed: ' + result.message)
      }
      
      return result
    } catch (error) {
      const errorResult: ImportResult = {
        success: false,
        imported: 0,
        failed: leads.length,
        errors: [],
        message: 'Network error occurred during import'
      }
      setImportProgress(errorResult)
      toast.error('Import failed due to network error')
      return errorResult
    } finally {
      setIsImporting(false)
    }
  }

  return { importLeads, isImporting, importProgress }
}
```

**Client-Side Export Flow:**
```typescript
const useLeadExport = () => {
  const [isExporting, setIsExporting] = useState(false)

  const exportLeads = async (options: {
    leadIds?: string[]
    filters?: {
      status?: string
      search?: string
      limit?: number
    }
    format?: 'csv' | 'json'
    fields?: string[]
  } = {}) => {
    setIsExporting(true)
    
    try {
      let url = '/api/leads/export'
      let requestOptions: RequestInit = {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      }
      
      if (options.leadIds && options.leadIds.length > 0) {
        // Export specific leads using POST
        requestOptions.method = 'POST'
        requestOptions.headers!['Content-Type'] = 'application/json'
        requestOptions.body = JSON.stringify({
          leadIds: options.leadIds,
          format: options.format || 'csv',
          fields: options.fields
        })
      } else {
        // Export with filters using GET
        const params = new URLSearchParams()
        if (options.format) params.append('format', options.format)
        if (options.fields) params.append('fields', options.fields.join(','))
        if (options.filters?.status) params.append('status', options.filters.status)
        if (options.filters?.search) params.append('search', options.filters.search)
        if (options.filters?.limit) params.append('limit', options.filters.limit.toString())
        
        url += '?' + params.toString()
        requestOptions.method = 'GET'
      }
      
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }
      
      if (options.format === 'json') {
        const data = await response.json()
        return data
      } else {
        // Handle CSV download
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename="')[1]?.split('"')[0]
          : 'leads-export.csv'
        
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
        
        toast.success('Export completed successfully')
      }
    } catch (error) {
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    } finally {
      setIsExporting(false)
    }
  }

  return { exportLeads, isExporting }
}
```

#### Bulk Import

**Endpoint:** `POST /api/leads/import`

**Description:** Imports leads in bulk from CSV data with validation and duplicate detection

**Authentication:** Required - Bearer token with organization access

**Request Limits:**
- Maximum 1,000 leads per request
- Request body size limit: 10MB

**Request Body:**
```json
{
  "leads": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "warm", 
      "source": "CSV Import",
      "qualification_notes": "Interested in personal training",
      "lead_score": 75
    },
    {
      "name": "Jane Smith", 
      "email": "jane@example.com",
      "phone": "+0987654321",
      "status": "hot",
      "source": "Facebook Ad",
      "qualification_notes": "Ready to join this week"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "imported": 2,
  "failed": 0,
  "errors": [],
  "message": "Successfully imported all 2 leads"
}
```

**Error Response (Partial Import):**
```json
{
  "success": false,
  "imported": 1,
  "failed": 1,
  "errors": [
    {
      "index": 1,
      "lead": {"name": "Invalid", "email": "invalid-email"},
      "error": "Invalid email format"
    }
  ],
  "message": "Imported 1 leads with 1 failures"
}
```

**Comprehensive Error Response Example:**
```json
{
  "success": false,
  "imported": 2,
  "failed": 3,
  "errors": [
    {
      "index": 1,
      "lead": {"name": "John Doe", "email": "john@existing.com"},
      "error": "Email already exists in the system"
    },
    {
      "index": 3,
      "lead": {"name": "Jane", "email": "invalid-format"},
      "error": "Invalid email format"
    },
    {
      "index": 4,
      "lead": {"name": "", "email": "test@example.com"},
      "error": "Name is required and must be a string"
    }
  ],
  "message": "Imported 2 leads with 3 failures"
}
```

**Validation Rules:**
- `name`: Required string, trimmed, max 255 characters
- `email`: Required, valid format (RFC 5322), unique per organization, max 255 characters
- `phone`: Optional string, max 20 characters, international format recommended
- `status`: Optional, one of: cold, warm, hot, converted, lost (default: cold)
- `source`: Optional string, max 100 characters (default: "CSV Import")
- `lead_score`: Optional number, 0-100 range (default: 0)
- `qualification_notes`: Optional string, max 1000 characters
- `assigned_to`: Optional string (user ID)
- `campaign_id`: Optional string
- `metadata`: Optional JSON object, max 5KB

**Error Codes:**
- `400` - Invalid request body or validation errors
- `401` - Authentication required
- `403` - Insufficient permissions
- `500` - Internal server error

#### Export All Leads

**Endpoint:** `GET /api/leads/export`

**Description:** Exports leads with filtering and field selection

**Authentication:** Required - Bearer token with organization access

**Query Parameters:**
- `format` (optional): Output format - 'csv' or 'json' (default: csv)
- `fields` (optional): Comma-separated field list (default: name,email,phone,status,source,lead_score,qualification_notes,created_at)
- `status` (optional): Filter by lead status
- `search` (optional): Search in name, email, or phone fields
- `limit` (optional): Maximum records 1-10000 (default: 1000)
- `includeHeaders` (optional): Include CSV headers - 'true' or 'false' (default: true)

**Available Fields:**
- `name`, `email`, `phone` - Contact information
- `status`, `source`, `lead_score` - Qualification data  
- `qualification_notes`, `assigned_to` - Additional data
- `created_at`, `updated_at` - Timestamp fields
- `campaign_id`, `metadata`, `ai_analysis` - Extended fields

**Examples:**

*Export all leads as CSV:*
```
GET /api/leads/export
```

*Export warm leads only:*
```
GET /api/leads/export?status=warm&format=csv
```

*Export specific fields as JSON:*
```
GET /api/leads/export?format=json&fields=name,email,status&limit=500
```

*Search and export:*
```
GET /api/leads/export?search=john&format=csv&fields=name,email,phone
```

**CSV Response:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="leads-2025-08-30-14-30-25.csv"
X-Total-Records: 156
X-Export-Date: 2025-08-30T14:30:25Z

Name,Email,Phone,Status,Source,Lead Score,Notes,Created Date
John Doe,john@example.com,+1234567890,Warm,Website,75,"Interested in personal training",2025-08-30 14:15:30
Jane Smith,jane@example.com,+0987654321,Hot,Facebook Ad,85,"Ready to join this week",2025-08-30 13:45:12
```

**JSON Response:**
```json
{
  "data": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "warm",
      "source": "Website",
      "lead_score": 75,
      "qualification_notes": "Interested in personal training",
      "created_at": "2025-08-30T14:15:30Z",
      "updated_at": "2025-08-30T14:15:30Z"
    }
  ],
  "meta": {
    "total": 156,
    "exported_at": "2025-08-30T14:30:25Z",
    "organization_id": "org_123"
  }
}
```

#### Export Selected Leads

**Endpoint:** `POST /api/leads/export`

**Description:** Exports specific leads by ID

**Authentication:** Required - Bearer token with organization access

**Request Limits:**
- Maximum 10,000 lead IDs per request

**Request Body:**
```json
{
  "leadIds": ["lead_123", "lead_124", "lead_125"],
  "format": "csv",
  "fields": ["name", "email", "phone", "status"]
}
```

**Response:** Same format as GET export endpoint

**Error Responses:**

*No leads found:*
```json
{
  "error": "No leads found matching the criteria"
}
```

*Export limit exceeded:*
```json
{
  "error": "Cannot export more than 10000 leads at once"
}
```

*Invalid field selection:*
```json
{
  "error": "Invalid field: invalid_field_name"
}
```

*Rate limit exceeded:*
```json
{
  "error": "Rate limit exceeded. Try again in 60 seconds",
  "retry_after": 60
}
```

*File too large:*
```json
{
  "error": "Import file exceeds maximum size limit of 10MB"
}
```

### Integration Management

**Endpoint:** `GET /api/integrations`

**Description:** Retrieves all available integrations and their status

**Response:**
```json
{
  "integrations": [
    {
      "id": "whatsapp",
      "name": "WhatsApp", 
      "status": "connected",
      "description": "Send automated messages and handle customer inquiries",
      "config": {
        "phone_number": "+44123456789",
        "api_version": "v16.0"
      }
    },
    {
      "id": "facebook",
      "name": "Facebook",
      "status": "connected", 
      "description": "Sync leads from Facebook advertising campaigns"
    }
  ]
}
```

**Endpoint:** `POST /api/integrations/{id}/disconnect`

**Description:** Disconnects an integration service

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

**Endpoint:** `POST /api/integrations/{id}/test`

**Description:** Sends a test message through the integration

**Request Body:**
```json
{
  "recipient": "+44123456789",  // For WhatsApp
  "message": "Test message from Gym Coach Platform"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test message sent successfully",
  "message_id": "msg_123456789"
}
```

## Toast Notification System

### Usage Patterns

```typescript
import { toast } from 'react-hot-toast'

// Success notifications
toast.success('Action completed successfully')

// Info notifications  
toast('Redirecting to settings...')

// Error notifications
toast.error('Failed to complete action')

// Loading with promise
toast.promise(apiCall(), {
  loading: 'Processing...',
  success: 'Completed!',
  error: 'Failed to complete'
})
```

### Configuration

Toast notifications are configured in the app layout:

```typescript
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  )
}
```

## Error Handling

### Standard Error Responses

All API endpoints return consistent error formats:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format", 
    "details": {
      "field": "phone",
      "expected": "E.164 format"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `INTEGRATION_ERROR` - Third-party service error

### Client-Side Error Handling

```typescript
const handleApiCall = async () => {
  setIsLoading(true)
  try {
    const response = await fetch('/api/endpoint')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    toast.success('Operation completed successfully')
    return data
  } catch (error) {
    console.error('API Error:', error)
    toast.error('Failed to complete operation')
    throw error
  } finally {
    setIsLoading(false)
  }
}
```

## Real-time Updates

### WebSocket Connection

Future implementation will include WebSocket connections for real-time notifications:

```typescript
// Planned WebSocket integration
const ws = new WebSocket('wss://api.gymcoach.com/ws/notifications')

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data)
  // Update notification state
  setNotifications(prev => [notification, ...prev])
  // Show toast for new notifications  
  toast(notification.title)
}
```

## Authentication

### JWT Token Handling

All API requests include authentication headers:

```typescript
const apiClient = {
  get: (url: string) => fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  }),
  
  post: (url: string, data: any) => fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'  
    },
    body: JSON.stringify(data)
  })
}
```

### Token Refresh

Automatic token refresh on 401 responses:

```typescript
const handleApiRequest = async (request: () => Promise<Response>) => {
  let response = await request()
  
  if (response.status === 401) {
    await refreshAuthToken()
    response = await request() // Retry with new token
  }
  
  return response
}
```

## Rate Limiting

### Client-Side Throttling  

Dashboard components implement request throttling:

```typescript
import { throttle } from 'lodash'

const throttledSearch = throttle((query: string) => {
  // API search call
}, 300) // 300ms delay
```

### Server Response Headers

Rate limiting information is provided in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95  
X-RateLimit-Reset: 1640995200
```

## Environment Configuration

### API Base URL

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
```

### Integration Keys

Integration services require environment configuration:

```bash
# WhatsApp Integration
WHATSAPP_API_URL=https://graph.facebook.com/v16.0
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Facebook Integration  
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Google Calendar
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Development vs Production

### Mock Data

Development mode uses mock data for notifications and integrations:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development'

const getNotifications = () => {
  if (isDevelopment) {
    return mockNotifications
  }
  return apiClient.get('/api/notifications')
}
```

### API Stubbing

Integration card actions are stubbed in development:

```typescript
const handleDisconnect = async () => {
  if (isDevelopment) {
    // Simulate API call with timeout
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true }
  }
  
  return apiClient.post(`/api/integrations/${id}/disconnect`)
}
```