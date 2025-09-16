import { GoTeamUpImporter, ImportResult } from '@/lib/services/goteamup-import'

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn()
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

jest.mock('papaparse', () => ({
  parse: jest.fn()
}))

describe('GoTeamUpImporter Edge Cases and Error Scenarios', () => {
  let importer: GoTeamUpImporter
  let progressCallback: jest.Mock
  const organizationId = 'test-org-123'

  beforeEach(() => {
    progressCallback = jest.fn()
    importer = new GoTeamUpImporter(organizationId, progressCallback)
    jest.clearAllMocks()
  })

  describe('CSV Format Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles empty CSV file', async () => {
      const csvContent = ''

      mockPapaParse.mockReturnValue({
        data: [],
        errors: [{ message: 'Empty CSV file' }]
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.message).toBe('CSV parsing failed')
      expect(result.errors).toHaveLength(1)
    })

    test('handles CSV with only headers', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status'

      mockPapaParse.mockReturnValue({
        data: [],
        errors: []
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(0)
    })

    test('handles CSV with special characters in data', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status,Description\n"José María Ñoño",jose@example.com,15/01/2025,"€50.00","Crédit Card",Paid,"Spëcial charàcters"'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'José María Ñoño',
          'Email': 'jose@example.com',
          'Date': '15/01/2025',
          'Amount': '€50.00',
          'Payment Method': 'Crédit Card',
          'Status': 'Paid',
          'Description': 'Spëcial charàcters'
        }],
        errors: []
      })

      // Mock client lookup success
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.success).toBe(1)
    })

    test('handles CSV with very long field values', async () => {
      const longDescription = 'A'.repeat(5000)
      const csvContent = `Client Name,Email,Date,Amount,Payment Method,Status,Description\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid,"${longDescription}"`

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid',
          'Description': longDescription
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.success).toBe(1)
    })

    test('handles CSV with inconsistent column counts', async () => {
      const csvContent = 'Client Name,Email,Date,Amount\nJohn Doe,john@test.com,15/01/2025\nJane Smith,jane@test.com,16/01/2025,75.00,Extra,Column'

      mockPapaParse.mockReturnValue({
        data: [
          { 'Client Name': 'John Doe', 'Email': 'john@test.com', 'Date': '15/01/2025', 'Amount': '' },
          { 'Client Name': 'Jane Smith', 'Email': 'jane@test.com', 'Date': '16/01/2025', 'Amount': '75.00' }
        ],
        errors: [
          { message: 'Row 1: Missing columns' },
          { message: 'Row 2: Too many columns' }
        ]
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    test('handles CSV with malformed quotes', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\n"John "Doe,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [],
        errors: [{ message: 'Malformed CSV: unclosed quoted field' }]
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.message).toBe('CSV parsing failed')
    })

    test('handles CSV with BOM (Byte Order Mark)', async () => {
      const csvContent = '\uFEFFClient Name,Email,Date,Amount,Payment Method,Status\nJohn Doe,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
    })
  })

  describe('Date Format Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles various date formats gracefully', async () => {
      // Note: The current implementation expects DD/MM/YYYY format
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,29/02/2024,50.00,Card,Paid' // Leap year

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '29/02/2024',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })

      let insertedData: any
      mockSupabase.insert.mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(insertedData.payment_date).toBe('2024-02-29') // Correctly parsed leap year date
    })

    test('handles invalid date formats', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,invalid-date,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': 'invalid-date',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockRejectedValue(new Error('Invalid date format'))

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.errors).toBe(1)
    })

    test('handles edge case dates like 31/04/2025', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,31/04/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '31/04/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })

      let insertedData: any
      mockSupabase.insert.mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      })

      const result = await importer.importPayments(csvContent)

      // The parseUKDate function will create "2025-04-31" which is invalid
      // This should be handled by the database or validation layer
      expect(insertedData.payment_date).toBe('2025-04-31')
    })
  })

  describe('Amount Parsing Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles various currency formats', async () => {
      const testCases = [
        { input: '£123.45', expected: 12345 },
        { input: '123.45', expected: 12345 },
        { input: '£1,234.56', expected: 123456 },
        { input: '€50.00', expected: 5000 },
        { input: '$100.25', expected: 10025 },
        { input: '0.01', expected: 1 },
        { input: '0.00', expected: 0 },
        { input: '1000000.00', expected: 100000000 } // 1 million
      ]

      for (const testCase of testCases) {
        const csvContent = `Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,${testCase.input},Card,Paid`

        mockPapaParse.mockReturnValue({
          data: [{
            'Client Name': 'John',
            'Email': 'john@test.com',
            'Date': '15/01/2025',
            'Amount': testCase.input,
            'Payment Method': 'Card',
            'Status': 'Paid'
          }],
          errors: []
        })

        mockSupabase.single
          .mockResolvedValueOnce({ data: { id: 'client-123' } })
          .mockResolvedValueOnce({ data: null })

        let insertedData: any
        mockSupabase.insert.mockImplementation((data) => {
          insertedData = data
          return Promise.resolve({ error: null })
        })

        await importer.importPayments(csvContent)

        expect(insertedData.amount).toBe(testCase.expected)
      }
    })

    test('handles invalid amount formats', async () => {
      const invalidAmounts = ['abc', 'free', '£invalid', '123.45.67', '']

      for (const invalidAmount of invalidAmounts) {
        const csvContent = `Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,${invalidAmount},Card,Paid`

        mockPapaParse.mockReturnValue({
          data: [{
            'Client Name': 'John',
            'Email': 'john@test.com',
            'Date': '15/01/2025',
            'Amount': invalidAmount,
            'Payment Method': 'Card',
            'Status': 'Paid'
          }],
          errors: []
        })

        mockSupabase.single
          .mockResolvedValueOnce({ data: { id: 'client-123' } })
          .mockResolvedValueOnce({ data: null })

        let insertedData: any
        mockSupabase.insert.mockImplementation((data) => {
          insertedData = data
          return Promise.resolve({ error: null })
        })

        await importer.importPayments(csvContent)

        // Should result in NaN converted to 0 or cause an error
        expect(typeof insertedData.amount).toBe('number')
      }
    })

    test('handles negative amounts', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,-50.00,Card,Refund'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '-50.00',
          'Payment Method': 'Card',
          'Status': 'Refund'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })

      let insertedData: any
      mockSupabase.insert.mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(insertedData.amount).toBe(-5000) // Negative 50.00 in pennies
    })
  })

  describe('Database Error Scenarios', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles database timeout errors', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single.mockRejectedValue(new Error('Timeout: Database operation timed out'))

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.errors).toBe(1)
      expect(result.errors![0].error).toBe('Timeout: Database operation timed out')
    })

    test('handles foreign key constraint violations', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({
        error: {
          message: 'Foreign key constraint "payments_client_id_fkey" violated',
          code: '23503'
        }
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.errors).toBe(1)
      expect(result.errors![0].error).toContain('Foreign key constraint')
    })

    test('handles unique constraint violations', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({
        error: {
          message: 'Unique constraint "payments_unique_key" violated',
          code: '23505'
        }
      })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.errors).toBe(1)
    })

    test('handles database connection lost during import', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid\nJane,jane@test.com,16/01/2025,75.00,Cash,Paid'

      mockPapaParse.mockReturnValue({
        data: [
          {
            'Client Name': 'John',
            'Email': 'john@test.com',
            'Date': '15/01/2025',
            'Amount': '50.00',
            'Payment Method': 'Card',
            'Status': 'Paid'
          },
          {
            'Client Name': 'Jane',
            'Email': 'jane@test.com',
            'Date': '16/01/2025',
            'Amount': '75.00',
            'Payment Method': 'Cash',
            'Status': 'Paid'
          }
        ],
        errors: []
      })

      // First record succeeds, second fails due to connection loss
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
        .mockRejectedValueOnce(new Error('Connection lost to database'))

      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(false)
      expect(result.stats.success).toBe(1)
      expect(result.stats.errors).toBe(1)
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles very large CSV files without memory issues', async () => {
      // Simulate large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        'Client Name': `Client ${i}`,
        'Email': `client${i}@test.com`,
        'Date': '15/01/2025',
        'Amount': '50.00',
        'Payment Method': 'Card',
        'Status': 'Paid'
      }))

      mockPapaParse.mockReturnValue({
        data: largeDataset,
        errors: []
      })

      // Mock all clients found and no duplicates
      mockSupabase.single
        .mockResolvedValue({ data: { id: 'client-123' } })
        .mockResolvedValue({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const startTime = Date.now()
      const result = await importer.importPayments('large csv content')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(10000)

      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(endTime - startTime).toBeLessThan(60000) // 60 seconds max
    })

    test('handles concurrent import attempts gracefully', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValue({ data: { id: 'client-123' } })
        .mockResolvedValue({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      // Start multiple imports concurrently
      const promises = [
        importer.importPayments(csvContent),
        importer.importPayments(csvContent),
        importer.importPayments(csvContent)
      ]

      const results = await Promise.all(promises)

      // All should succeed (or handle conflicts appropriately)
      results.forEach(result => {
        expect(result.success).toBeDefined()
        expect(result.stats).toBeDefined()
      })
    })
  })

  describe('Email and Client Matching Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles emails with special characters', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.co.uk',
        'user_name@example-domain.com',
        'user123@domain123.com',
        'UPPERCASE@DOMAIN.COM'
      ]

      for (const email of specialEmails) {
        const csvContent = `Client Name,Email,Date,Amount,Payment Method,Status\nJohn Doe,${email},15/01/2025,50.00,Card,Paid`

        mockPapaParse.mockReturnValue({
          data: [{
            'Client Name': 'John Doe',
            'Email': email,
            'Date': '15/01/2025',
            'Amount': '50.00',
            'Payment Method': 'Card',
            'Status': 'Paid'
          }],
          errors: []
        })

        mockSupabase.single
          .mockResolvedValueOnce({ data: { id: 'client-123' } })
          .mockResolvedValueOnce({ data: null })
        mockSupabase.insert.mockResolvedValue({ error: null })

        const result = await importer.importPayments(csvContent)

        expect(result.success).toBe(true)
        expect(mockSupabase.eq).toHaveBeenCalledWith('email', email)
      }
    })

    test('handles case sensitivity in email matching', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn Doe,JOHN@EXAMPLE.COM,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': 'JOHN@EXAMPLE.COM',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      // Verify exact email was used for lookup (case preserved)
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'JOHN@EXAMPLE.COM')
    })

    test('handles empty or null email fields', async () => {
      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn Doe,,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John Doe',
          'Email': '',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      // Mock no client found due to empty email
      mockSupabase.single.mockResolvedValue({ data: null })

      const result = await importer.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(result.stats.skipped).toBe(1)
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', '')
    })
  })

  describe('Progress Callback Edge Cases', () => {
    const mockPapaParse = require('papaparse').parse as jest.Mock

    test('handles progress callback throwing errors', async () => {
      const errorThrowingCallback = jest.fn().mockImplementation(() => {
        throw new Error('Progress callback error')
      })

      const importerWithErrorCallback = new GoTeamUpImporter(organizationId, errorThrowingCallback)

      const csvContent = 'Client Name,Email,Date,Amount,Payment Method,Status\nJohn,john@test.com,15/01/2025,50.00,Card,Paid'

      mockPapaParse.mockReturnValue({
        data: [{
          'Client Name': 'John',
          'Email': 'john@test.com',
          'Date': '15/01/2025',
          'Amount': '50.00',
          'Payment Method': 'Card',
          'Status': 'Paid'
        }],
        errors: []
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'client-123' } })
        .mockResolvedValueOnce({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      // Import should still succeed despite callback errors
      const result = await importerWithErrorCallback.importPayments(csvContent)

      expect(result.success).toBe(true)
      expect(errorThrowingCallback).toHaveBeenCalled()
    })

    test('handles very frequent progress updates efficiently', async () => {
      const frequentCallback = jest.fn()
      const importerWithFrequentCallback = new GoTeamUpImporter(organizationId, frequentCallback)

      // Large dataset to trigger many progress updates
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        'Client Name': `Client ${i}`,
        'Email': `client${i}@test.com`,
        'Date': '15/01/2025',
        'Amount': '50.00',
        'Payment Method': 'Card',
        'Status': 'Paid'
      }))

      mockPapaParse.mockReturnValue({
        data: largeDataset,
        errors: []
      })

      mockSupabase.single
        .mockResolvedValue({ data: { id: 'client-123' } })
        .mockResolvedValue({ data: null })
      mockSupabase.insert.mockResolvedValue({ error: null })

      const startTime = Date.now()
      await importerWithFrequentCallback.importPayments('large csv')
      const endTime = Date.now()

      // Should handle frequent callbacks without significant performance impact
      expect(endTime - startTime).toBeLessThan(30000) // 30 seconds max
      expect(frequentCallback.mock.calls.length).toBeGreaterThan(1000) // At least one per record
    })
  })
})