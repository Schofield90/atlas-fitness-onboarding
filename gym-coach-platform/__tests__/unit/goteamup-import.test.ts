import { GoTeamUpImporter, ImportResult, ImportProgress } from '@/lib/services/goteamup-import'

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null }),
  insert: jest.fn().mockResolvedValue({ error: null })
}

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock Papa parse
jest.mock('papaparse', () => ({
  parse: jest.fn()
}))

describe('GoTeamUpImporter', () => {
  let importer: GoTeamUpImporter
  let progressCallback: jest.Mock
  const organizationId = 'test-org-123'

  beforeEach(() => {
    progressCallback = jest.fn()
    importer = new GoTeamUpImporter(organizationId, progressCallback)
    jest.clearAllMocks()
  })

  describe('File Type Detection', () => {
    test('detects payments CSV correctly', () => {
      const paymentsCSV = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,01/01/2025,50.00,Card,Paid'
      const result = GoTeamUpImporter.detectFileType(paymentsCSV)
      expect(result).toBe('payments')
    })

    test('detects attendance CSV correctly', () => {
      const attendanceCSV = 'Client Name,Email,Date,Time,Class Name,Instructor\nJohn,john@test.com,01/01/2025,09:00,HIIT,Jane'
      const result = GoTeamUpImporter.detectFileType(attendanceCSV)
      expect(result).toBe('attendance')
    })

    test('returns unknown for unrecognized format', () => {
      const unknownCSV = 'Name,Phone,Address\nJohn,123456,123 Main St'
      const result = GoTeamUpImporter.detectFileType(unknownCSV)
      expect(result).toBe('unknown')
    })

    test('handles empty or malformed CSV', () => {
      expect(GoTeamUpImporter.detectFileType('')).toBe('unknown')
      expect(GoTeamUpImporter.detectFileType('\n\n')).toBe('unknown')
      expect(GoTeamUpImporter.detectFileType('no headers')).toBe('unknown')
    })

    test('is case insensitive', () => {
      const upperCaseCSV = 'CLIENT NAME,EMAIL,DATE,AMOUNT,PAYMENT METHOD,STATUS'
      expect(GoTeamUpImporter.detectFileType(upperCaseCSV)).toBe('payments')

      const mixedCaseCSV = 'Client Name,Email,Date,Time,CLASS NAME,instructor'
      expect(GoTeamUpImporter.detectFileType(mixedCaseCSV)).toBe('attendance')
    })
  })

  describe('Payments Import', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    beforeEach(() => {
      // Reset mock before each test
      mockSupabase.from.mockReturnThis()
      mockSupabase.select.mockReturnThis()
      mockSupabase.eq.mockReturnThis()
    })

    test('successfully imports valid payment data', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid,Monthly membership'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Monthly membership'
        }],
        errors: []
      })

      // Mock client lookup
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'client-123' } })
      // Mock existing payment lookup (none found)
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      // Mock successful insert
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(1)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(0)
      expect(progressCallback).toHaveBeenCalled()
    })

    test('skips payments for non-existent clients', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid,Monthly membership'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Monthly membership'
        }],
        errors: []
      })

      // Mock client lookup - no client found
      mockSupabase.single.mockResolvedValue({ data: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(0)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(1)
    })

    test('skips duplicate payments', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid,Monthly membership'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Monthly membership'
        }],
        errors: []
      })

      // Mock client lookup
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'client-123' } })
      // Mock existing payment found
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'payment-456' } })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(0)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(1)
    })

    test('handles database errors during payment insert', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid,Monthly membership'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Monthly membership'
        }],
        errors: []
      })

      // Mock client lookup
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'client-123' } })
      // Mock existing payment lookup (none found)
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      // Mock failed insert
      mockSupabase.insert.mockResolvedValue({ error: { message: 'Database constraint violation' } })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(0)
      expect(result.stats.errors).toBe(1)
      expect(result.stats.skipped).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].error).toBe('Database constraint violation')
    })

    test('handles CSV parsing errors', async () => {
      const csvContent = 'invalid csv content'

      mockPapaParse.mockReturnValue({
        data: [],
        errors: [{ message: 'Parsing error' }]
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.message).toBe('CSV parsing failed')
      expect(result.errors).toHaveLength(1)
    })

    test('reports progress updates during import', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn,john@test.com,15/01/2025,50.00,Card,Paid,Test\nJane,jane@test.com,16/01/2025,75.00,Cash,Paid,Test2'

      mockPapaParse.mockReturnValue({
        data: [
          {
            'Client Name': 'John',
            'Email': 'john@test.com',
            'Date': '15/01/2025',
            'Amount': '50.00',
            'Payment Method': 'Card',
            'Status': 'Paid',
            'Description': 'Test'
          },
          {
            'Client Name': 'Jane',
            'Email': 'jane@test.com',
            'Date': '16/01/2025',
            'Amount': '75.00',
            'Payment Method': 'Cash',
            'Status': 'Paid',
            'Description': 'Test2'
          }
        ],
        errors: []
      })

      // Mock successful lookups and inserts
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: { id: 'client-456' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      await importer.importPayments(csvContent)

      // Check progress callback was called with correct values
      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 0,
        success: 0,
        errors: 0,
        skipped: 0
      })

      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 0,
        success: 0,
        errors: 0,
        skipped: 0,
        currentItem: 'John - £50.00'
      })

      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 2,
        success: 2,
        errors: 0,
        skipped: 0
      })
    })
  })

  describe('Attendance Import', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('successfully imports valid attendance data', async () => {
      const csvContent = 'Client Name,Email,Date,Time,Class Name,Instructor\nJohn Doe,john@test.com,15/01/2025,09:00,HIIT,Jane Smith'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Time': '09:00',
          'Class Name': 'HIIT',
          'Instructor': 'Jane Smith'
        }],
        errors: []
      })

      // Mock client lookup
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'client-123' } })
      // Mock existing booking lookup (none found)
      mockSupabase.single.mockResolvedValueOnce({ data: null })
      // Mock successful insert
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importAttendance(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(1)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(0)
    })

    test('skips attendance for non-existent clients', async () => {
      const csvContent = 'Client Name,Email,Date,Time,Class Name,Instructor\nJohn Doe,john@test.com,15/01/2025,09:00,HIIT,Jane Smith'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Time': '09:00',
          'Class Name': 'HIIT',
          'Instructor': 'Jane Smith'
        }],
        errors: []
      })

      // Mock client lookup - no client found
      mockSupabase.single.mockResolvedValue({ data: null })

      const result = await importer.importAttendance(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(0)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(1)
    })

    test('skips duplicate attendance records', async () => {
      const csvContent = 'Client Name,Email,Date,Time,Class Name,Instructor\nJohn Doe,john@test.com,15/01/2025,09:00,HIIT,Jane Smith'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Time': '09:00',
          'Class Name': 'HIIT',
          'Instructor': 'Jane Smith'
        }],
        errors: []
      })

      // Mock client lookup
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'client-123' } })
      // Mock existing booking found
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'booking-456' } })

      const result = await importer.importAttendance(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(1)
      expect(result.stats.success).toBe(0)
      expect(result.stats.errors).toBe(0)
      expect(result.stats.skipped).toBe(1)
    })
  })

  describe('Date and Amount Parsing', () => {
    test('correctly parses UK date format', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn,john@test.com,28/02/2025,50.00,Card,Paid,Test'

      const mockPapaParse = require('papaparse').parse as jest.Mock
      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '28/02/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Test'
        }],
        errors: []
      })

      // Mock successful client and payment lookups
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })

      // Capture the insert call to verify date format
      let insertedData: any
      mockSupabase.insert.mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      })

      await importer.importPayments(csvContent)

      expect(insertedData.payment_date).toBe('2025-02-28')
    })

    test('correctly parses amount with currency symbols and commas', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn,john@test.com,15/01/2025,"£1,234.56",Card,Paid,Test'

      const mockPapaParse = require('papaparse').parse as jest.Mock
      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '£1,234.56',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Test'
        }],
        errors: []
      })

      // Mock successful client and payment lookups
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })

      // Capture the insert call to verify amount in pennies
      let insertedData: any
      mockSupabase.insert.mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      })

      await importer.importPayments(csvContent)

      expect(insertedData.amount).toBe(123456) // £1,234.56 = 123456 pennies
    })
  })

  describe('Error Handling', () => {
    test('handles unexpected errors gracefully', async () => {
      const csvContent = 'valid,csv,content\ntest,data,here'

      const mockPapaParse = require('papaparse').parse as jest.Mock
      mockPapaParse.mockImplementation(() => {
        throw new Error('Unexpected parsing error')
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Import failed: Unexpected parsing error')
      expect(result.stats.total).toBe(0)
      expect(result.stats.errors).toBe(1)
    })

    test('handles database connection errors', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn,john@test.com,15/01/2025,50.00,Card,Paid,Test'

      const mockPapaParse = require('papaparse').parse as jest.Mock
      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': 'Test'
        }],
        errors: []
      })

      // Mock database error
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.total).toBe(1)
      expect(result.stats.errors).toBe(1)
      expect(result.errors![0].error).toBe('Database connection failed')
    })
  })

  describe('Progress Callback', () => {
    test('works without progress callback', () => {
      const importerWithoutCallback = new GoTeamUpImporter(organizationId)
      expect(() => {
        (importerWithoutCallback as any).updateProgress({ total: 1, processed: 0, success: 0, errors: 0, skipped: 0 })
      }).not.toThrow()
    })

    test('calls progress callback with correct structure', () => {
      const progress: ImportProgress = {
        total: 10,
        processed: 5,
        success: 4,
        errors: 1,
        skipped: 0,
        currentItem: 'Test Item'
      };

      (importer as any).updateProgress(progress)

      expect(progressCallback).toHaveBeenCalledWith(progress)
    })
  })
})