import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/import/goteamup/route'
import { GoTeamUpImporter } from '@/lib/services/goteamup-import'

// Mock the GoTeamUpImporter
jest.mock('@/lib/services/goteamup-import', () => ({
  GoTeamUpImporter: jest.fn().mockImplementation(() => ({
    importPayments: jest.fn(),
    importAttendance: jest.fn()
  }))
}))

// Mock the API middleware
jest.mock('@/lib/api/middleware', () => ({
  handleApiRoute: jest.fn((request, handler, options) => handler(request)),
  AuthenticatedRequest: class {
    user = { organization_id: 'test-org-123' }
    formData = jest.fn()
    url = 'http://localhost:3000/api/import/goteamup'
  }
}))

describe('/api/import/goteamup', () => {
  let mockImporter: any
  let mockRequest: any

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Setup mock importer
    mockImporter = {
      importPayments: jest.fn(),
      importAttendance: jest.fn()
    }

    ;(GoTeamUpImporter as jest.Mock).mockImplementation(() => mockImporter)

    // Setup mock request
    mockRequest = {
      user: { organization_id: 'test-org-123' },
      formData: jest.fn(),
      url: 'http://localhost:3000/api/import/goteamup'
    }
  })

  describe('POST /api/import/goteamup', () => {
    test('successfully processes payments CSV file', async () => {
      // Mock file data
      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      // Mock successful import result
      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      // Mock detectFileType
      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('payments')
      expect(data.result).toEqual(mockResult)
      expect(mockImporter.importPayments).toHaveBeenCalledWith(expect.any(String))
    })

    test('successfully processes attendance CSV file', async () => {
      // Mock file data
      const mockFile = {
        name: 'attendance.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Time,Class Name,Instructor\nJohn,john@test.com,15/01/2025,09:00,HIIT,Jane')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'attendance'],
        ['connectionId', 'test-connection-456']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      // Mock successful import result
      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importAttendance.mockResolvedValue(mockResult)

      // Mock detectFileType
      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('attendance')

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('attendance')
      expect(data.result).toEqual(mockResult)
      expect(mockImporter.importAttendance).toHaveBeenCalledWith(expect.any(String))
    })

    test('auto-detects file type when not provided', async () => {
      // Mock file data with payment headers
      const mockFile = {
        name: 'export.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', ''], // Empty type to trigger auto-detection
        ['connectionId', 'test-connection-789']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      // Mock auto-detection
      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      // Mock successful import
      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(GoTeamUpImporter.detectFileType).toHaveBeenCalled()
      expect(data.type).toBe('payments')
      expect(mockImporter.importPayments).toHaveBeenCalled()
    })

    test('returns error when no file provided', async () => {
      const mockFormData = new Map([
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })

    test('returns error when file is not CSV', async () => {
      const mockFile = {
        name: 'data.xlsx',
        text: jest.fn().mockResolvedValue('some content')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })

    test('returns error when file type cannot be detected', async () => {
      const mockFile = {
        name: 'unknown.csv',
        text: jest.fn().mockResolvedValue('Name,Phone,Address\nJohn,123456,123 Main St')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', ''], // Empty type to trigger auto-detection
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      // Mock unknown file type detection
      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('unknown')

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })

    test('returns error for unsupported import type', async () => {
      const mockFile = {
        name: 'test.csv',
        text: jest.fn().mockResolvedValue('some,csv,content')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'unsupported'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })

    test('handles import errors gracefully', async () => {
      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue('valid,csv,content')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      // Mock import failure
      mockImporter.importPayments.mockRejectedValue(new Error('Database connection failed'))

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })

    test('works without connection ID for SSE', async () => {
      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments']
        // No connectionId
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      const response = await POST(mockRequest as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/import/goteamup (SSE)', () => {
    test('establishes SSE connection with valid connection ID', async () => {
      const mockRequest = {
        user: { organization_id: 'test-org-123' },
        url: 'http://localhost:3000/api/import/goteamup?connectionId=test-connection-123'
      }

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    test('returns error when connection ID is missing', async () => {
      const mockRequest = {
        user: { organization_id: 'test-org-123' },
        url: 'http://localhost:3000/api/import/goteamup'
      }

      const response = await GET(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })
  })

  describe('Progress Updates via SSE', () => {
    test('sends progress updates through SSE connection', async () => {
      // This is more of an integration test concept since testing SSE requires
      // more complex setup. We're testing that the importer is created with
      // a progress callback that would send SSE updates.

      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      await POST(mockRequest as NextRequest)

      // Verify that GoTeamUpImporter was created with a progress callback
      expect(GoTeamUpImporter).toHaveBeenCalledWith(
        'test-org-123',
        expect.any(Function) // Progress callback function
      )
    })
  })

  describe('File Content Validation', () => {
    test('processes file content correctly', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid'

      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue(csvContent)
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      await POST(mockRequest as NextRequest)

      // Verify the CSV content was passed correctly to the importer
      expect(mockImporter.importPayments).toHaveBeenCalledWith(csvContent)
      expect(mockFile.text).toHaveBeenCalled()
    })

    test('handles file read errors', async () => {
      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockRejectedValue(new Error('File read error'))
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      mockRequest.formData.mockResolvedValue(mockFormData)

      const response = await POST(mockRequest as NextRequest)

      expect(response.status).toBe(500)
    })
  })

  describe('Organization Context', () => {
    test('passes correct organization ID to importer', async () => {
      const testOrgId = 'custom-org-456'

      const mockFile = {
        name: 'payments.csv',
        text: jest.fn().mockResolvedValue('Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid')
      }

      const mockFormData = new Map([
        ['file', mockFile],
        ['type', 'payments'],
        ['connectionId', 'test-connection-123']
      ])

      // Use custom organization ID
      mockRequest.user.organization_id = testOrgId
      mockRequest.formData.mockResolvedValue(mockFormData)

      const mockResult = {
        success: true,
        message: 'Import completed successfully',
        stats: { total: 1, success: 1, errors: 0, skipped: 0 }
      }
      mockImporter.importPayments.mockResolvedValue(mockResult)

      GoTeamUpImporter.detectFileType = jest.fn().mockReturnValue('payments')

      await POST(mockRequest as NextRequest)

      // Verify the correct organization ID was passed to the importer
      expect(GoTeamUpImporter).toHaveBeenCalledWith(
        testOrgId,
        expect.any(Function)
      )
    })
  })
})