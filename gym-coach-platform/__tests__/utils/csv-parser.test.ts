import { 
  parseCSV, 
  mapCSVToLeads, 
  validateImportData, 
  generateSampleCSV,
  type LeadMappingConfig 
} from '@/lib/utils/csv-parser'

describe('CSV Parser Utility Tests', () => {
  const organizationId = 'test-org-id'

  describe('parseCSV', () => {
    test('parses valid CSV with headers and data', () => {
      const csvContent = 'Name,Email,Phone\nJohn Doe,john@test.com,123456\nJane Smith,jane@test.com,789012'
      const result = parseCSV(csvContent)

      expect(result.headers).toEqual(['Name', 'Email', 'Phone'])
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        Name: 'John Doe',
        Email: 'john@test.com',
        Phone: '123456'
      })
      expect(result.errors).toHaveLength(0)
    })

    test('handles CSV with quoted fields containing commas', () => {
      const csvContent = '"Name","Email","Notes"\n"John Doe","john@test.com","Interested in training, very motivated"\n"Jane Smith","jane@test.com","Prefers morning sessions"'
      const result = parseCSV(csvContent)

      expect(result.headers).toEqual(['Name', 'Email', 'Notes'])
      expect(result.data[0].Notes).toBe('Interested in training, very motivated')
      expect(result.errors).toHaveLength(0)
    })

    test('handles escaped quotes in CSV fields', () => {
      const csvContent = 'Name,Email,Quote\nJohn,john@test.com,"He said ""Hello"" to me"'
      const result = parseCSV(csvContent)

      expect(result.data[0].Quote).toBe('He said "Hello" to me')
      expect(result.errors).toHaveLength(0)
    })

    test('returns error for empty CSV', () => {
      const result = parseCSV('')
      expect(result.errors).toContain('CSV file must contain at least a header row and one data row')
    })

    test('returns error for CSV with only headers', () => {
      const result = parseCSV('Name,Email,Phone')
      expect(result.errors).toContain('CSV file must contain at least a header row and one data row')
    })

    test('handles CSV with inconsistent column count', () => {
      const csvContent = 'Name,Email,Phone\nJohn Doe,john@test.com\nJane Smith,jane@test.com,789012,extra'
      const result = parseCSV(csvContent)

      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toContain('Line 2: Expected 3 columns, got 2')
      expect(result.errors[1]).toContain('Line 3: Expected 3 columns, got 4')
    })

    test('skips empty lines', () => {
      const csvContent = 'Name,Email\nJohn,john@test.com\n\nJane,jane@test.com\n'
      const result = parseCSV(csvContent)

      expect(result.data).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('mapCSVToLeads', () => {
    const csvData = [
      { Name: 'John Doe', Email: 'john@test.com', Phone: '123456', Status: 'warm', Source: 'Website' },
      { Name: 'Jane Smith', Email: 'jane@test.com', Phone: '', Status: 'invalid', Source: 'Facebook' },
      { Name: '', Email: 'noname@test.com', Phone: '789012', Status: 'hot', Source: 'Referral' }
    ]

    const mapping: LeadMappingConfig = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      source: 'Source'
    }

    test('maps valid lead data correctly', () => {
      const result = mapCSVToLeads([csvData[0]], mapping, organizationId)

      expect(result).toHaveLength(1)
      expect(result[0].data).toMatchObject({
        organization_id: organizationId,
        name: 'John Doe',
        email: 'john@test.com',
        phone: '123456',
        status: 'warm',
        source: 'Website'
      })
      expect(result[0].errors).toHaveLength(0)
    })

    test('validates required fields', () => {
      const result = mapCSVToLeads([csvData[2]], mapping, organizationId)

      expect(result[0].errors).toContain('Name is required')
    })

    test('validates email format', () => {
      const invalidEmailData = [{ Name: 'Test', Email: 'invalid-email', Phone: '', Status: 'cold', Source: 'Test' }]
      const result = mapCSVToLeads(invalidEmailData, mapping, organizationId)

      expect(result[0].errors).toContain('Invalid email format')
    })

    test('validates lead status', () => {
      const result = mapCSVToLeads([csvData[1]], mapping, organizationId)

      expect(result[0].errors).toContain('Invalid status: invalid. Must be one of: cold, warm, hot, converted, lost')
    })

    test('sets default source when not provided', () => {
      const mappingWithoutSource = { ...mapping }
      delete mappingWithoutSource.source
      const result = mapCSVToLeads([csvData[0]], mappingWithoutSource, organizationId)

      expect(result[0].data.source).toBe('CSV Import')
    })

    test('handles missing field mappings', () => {
      const incompleteMapping = { phone: 'Phone' }
      const result = mapCSVToLeads([csvData[0]], incompleteMapping as LeadMappingConfig, organizationId)

      expect(result[0].errors).toContain('Name field mapping is required')
      expect(result[0].errors).toContain('Email field mapping is required')
    })
  })

  describe('validateImportData', () => {
    const validLead = {
      data: {
        organization_id: organizationId,
        name: 'John Doe',
        email: 'john@test.com',
        source: 'Test'
      },
      errors: [],
      rowIndex: 0
    }

    const invalidLead = {
      data: {
        organization_id: organizationId,
        name: '',
        email: 'invalid-email'
      },
      errors: ['Name is required', 'Invalid email format'],
      rowIndex: 1
    }

    test('separates valid and invalid leads', () => {
      const result = validateImportData([validLead, invalidLead])

      expect(result.validLeads).toHaveLength(1)
      expect(result.invalidLeads).toHaveLength(1)
      expect(result.summary.totalRows).toBe(2)
      expect(result.summary.validRows).toBe(1)
      expect(result.summary.invalidRows).toBe(1)
    })

    test('detects duplicate emails within CSV', () => {
      const duplicateLead = {
        ...validLead,
        rowIndex: 2
      }
      const result = validateImportData([validLead, duplicateLead])

      expect(result.summary.duplicateEmails).toBe(1)
      expect(result.invalidLeads).toHaveLength(1)
      expect(result.invalidLeads[0].errors).toContain('Duplicate email in CSV')
    })

    test('provides accurate summary counts', () => {
      // The issue was that validLead appears to have a duplicate email
      // Let's create completely separate leads
      const firstValidLead = {
        data: {
          organization_id: organizationId,
          name: 'Alice Johnson',
          email: 'alice@test.com',
          source: 'Test'
        },
        errors: [],
        rowIndex: 0
      }
      
      const secondValidLead = {
        data: {
          organization_id: organizationId,
          name: 'Bob Wilson',
          email: 'bob@test.com',
          source: 'Test'
        },
        errors: [],
        rowIndex: 2
      }
      
      const leads = [firstValidLead, invalidLead, secondValidLead]
      const result = validateImportData(leads)

      expect(result.summary).toEqual({
        totalRows: 3,
        validRows: 2,
        invalidRows: 1,
        duplicateEmails: 0
      })
    })
  })

  describe('generateSampleCSV', () => {
    test('generates valid CSV sample', () => {
      const result = generateSampleCSV()

      expect(result).toContain('Name')
      expect(result).toContain('Email')
      expect(result).toContain('John Doe')
      expect(result).toContain('jane@example.com')

      // Verify it can be parsed back
      const parsed = parseCSV(result)
      expect(parsed.errors).toHaveLength(0)
      expect(parsed.headers).toContain('Name')
      expect(parsed.headers).toContain('Email')
      expect(parsed.data).toHaveLength(2)
    })

    test('properly escapes quotes in sample data', () => {
      const result = generateSampleCSV()
      
      // Should contain escaped quotes for CSV safety
      expect(result).toMatch(/"[^"]*"/)
      
      // Parse to verify structure
      const parsed = parseCSV(result)
      expect(parsed.errors).toHaveLength(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles CSV with only whitespace', () => {
      const result = parseCSV('   \n  \n  ')
      expect(result.errors).toContain('CSV file must contain at least a header row and one data row')
    })

    test('handles CSV with special characters', () => {
      const csvContent = 'Name,Email,Notes\n"José María","josé@test.com","Speaks español"\n"李小明","li@test.com","Uses 中文"'
      const result = parseCSV(csvContent)

      expect(result.errors).toHaveLength(0)
      expect(result.data[0].Name).toBe('José María')
      expect(result.data[1].Name).toBe('李小明')
    })

    test('handles very long field values', () => {
      const longValue = 'A'.repeat(1000)
      const csvContent = `Name,Email,Notes\n"John","john@test.com","${longValue}"`
      const result = parseCSV(csvContent)

      expect(result.errors).toHaveLength(0)
      expect(result.data[0].Notes).toBe(longValue)
    })

    test('validates large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        data: {
          organization_id: organizationId,
          name: `User ${i}`,
          email: `user${i}@test.com`,
          source: 'Test'
        },
        errors: [],
        rowIndex: i
      }))

      const startTime = Date.now()
      const result = validateImportData(largeDataset)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.validLeads).toHaveLength(1000)
      expect(result.summary.totalRows).toBe(1000)
    })
  })
})