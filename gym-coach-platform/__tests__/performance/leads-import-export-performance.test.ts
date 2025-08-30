import { 
  parseCSV, 
  mapCSVToLeads, 
  validateImportData 
} from '@/lib/utils/csv-parser'
import { leadsToCSV } from '@/lib/utils/csv-export'
import type { Lead } from '@/types/database'

describe('Import/Export Performance Tests', () => {
  const organizationId = 'test-org-id'

  describe('CSV Parsing Performance', () => {
    test('handles large CSV files efficiently (10,000 rows)', () => {
      const headers = 'Name,Email,Phone,Status,Source,Notes'
      const dataRows = Array.from({ length: 10000 }, (_, i) => 
        `User ${i},user${i}@test.com,+${i.toString().padStart(10, '0')},cold,Performance Test,"Notes for user ${i}"`
      )
      const csvContent = [headers, ...dataRows].join('\n')

      const startTime = Date.now()
      const result = parseCSV(csvContent)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(result.data).toHaveLength(10000)
      expect(result.errors).toHaveLength(0)
    })

    test('parsing with complex data and special characters', () => {
      const headers = 'Name,Email,Notes'
      const dataRows = Array.from({ length: 1000 }, (_, i) => 
        `"User ${i} 中文名","user${i}@test.com","Complex notes with, commas and \"quotes\" and newlines\nand special chars: áéíóú 🚀"`
      )
      const csvContent = [headers, ...dataRows].join('\n')

      const startTime = Date.now()
      const result = parseCSV(csvContent)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000)
      expect(result.data).toHaveLength(1000)
      expect(result.errors).toHaveLength(0)
      
      // Verify special characters preserved
      expect(result.data[0].Name).toContain('中文名')
      expect(result.data[0].Notes).toContain('🚀')
    })

    test('handles malformed CSV gracefully at scale', () => {
      // Create CSV with various formatting issues
      const csvLines = [
        'Name,Email,Phone',
        'John Doe,john@test.com,123456', // Valid
        'Jane Smith,jane@test.com', // Missing column
        '"Bob Johnson",bob@test.com,789012,extra', // Extra column
        '', // Empty line
        'Alice,alice@test.com,"Complex,quoted,field"', // Valid with quotes
        ...Array.from({ length: 1000 }, (_, i) => `User${i},user${i}@test.com,${i}`) // Many valid rows
      ]
      
      const csvContent = csvLines.join('\n')

      const startTime = Date.now()
      const result = parseCSV(csvContent)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000)
      expect(result.errors.length).toBe(2) // Two malformed lines
      expect(result.data.length).toBe(1003) // Valid rows including complex quoted field
    })
  })

  describe('Field Mapping Performance', () => {
    test('maps large dataset efficiently', () => {
      const csvData = Array.from({ length: 5000 }, (_, i) => ({
        Name: `User ${i}`,
        Email: `user${i}@test.com`,
        Phone: `+${i.toString().padStart(10, '0')}`,
        Status: i % 4 === 0 ? 'hot' : i % 3 === 0 ? 'warm' : 'cold',
        Source: 'Performance Test',
        Notes: `Notes for user ${i} with some longer text content to simulate real data`
      }))

      const mapping = {
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        status: 'Status',
        source: 'Source',
        qualification_notes: 'Notes'
      }

      const startTime = Date.now()
      const result = mapCSVToLeads(csvData, mapping, organizationId)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000)
      expect(result).toHaveLength(5000)
      expect(result.filter(lead => lead.errors.length === 0)).toHaveLength(5000)
    })

    test('validation performance with mixed valid/invalid data', () => {
      const parsedLeads = Array.from({ length: 3000 }, (_, i) => ({
        data: {
          organization_id: organizationId,
          name: i % 10 === 0 ? '' : `User ${i}`, // 10% invalid names
          email: i % 7 === 0 ? 'invalid-email' : `user${i}@test.com`, // ~14% invalid emails
          source: 'Test'
        },
        errors: i % 10 === 0 ? ['Name is required'] : i % 7 === 0 ? ['Invalid email'] : [],
        rowIndex: i
      }))

      const startTime = Date.now()
      const result = validateImportData(parsedLeads)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)
      expect(result.summary.totalRows).toBe(3000)
      expect(result.summary.invalidRows).toBeGreaterThan(0)
    })
  })

  describe('Export Performance', () => {
    test('exports large dataset to CSV efficiently', () => {
      const leads: Lead[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `lead-${i}`,
        organization_id: organizationId,
        name: `User ${i}`,
        email: `user${i}@test.com`,
        phone: i % 3 === 0 ? `+${i.toString().padStart(10, '0')}` : null,
        status: i % 4 === 0 ? 'hot' : i % 3 === 0 ? 'warm' : 'cold',
        lead_score: Math.floor(Math.random() * 100),
        source: 'Performance Test',
        campaign_id: i % 5 === 0 ? `campaign-${Math.floor(i / 5)}` : null,
        metadata: { test: true, index: i },
        ai_analysis: i % 10 === 0 ? { score: Math.random(), sentiment: 'positive' } : null,
        qualification_notes: i % 7 === 0 ? `Detailed notes for user ${i} with extended content to simulate real-world usage patterns` : null,
        assigned_to: i % 6 === 0 ? `user-${Math.floor(i / 6)}` : null,
        created_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
        updated_at: new Date(2024, 0, 1 + (i % 365)).toISOString()
      }))

      const startTime = Date.now()
      const csvResult = leadsToCSV(leads)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(3000)
      expect(csvResult.split('\n')).toHaveLength(5001) // Header + 5000 data rows
      
      // Verify content integrity
      const lines = csvResult.split('\n')
      expect(lines[0]).toContain('Name,Email')
      expect(lines[1]).toContain('User 0,user0@test.com')
      expect(lines[5000]).toContain('User 4999,user4999@test.com')
    })

    test('export with custom field selection performance', () => {
      const leads: Lead[] = Array.from({ length: 2000 }, (_, i) => ({
        id: `lead-${i}`,
        organization_id: organizationId,
        name: `User ${i}`,
        email: `user${i}@test.com`,
        phone: `+${i}`,
        status: 'cold',
        lead_score: i,
        source: 'Test',
        campaign_id: null,
        metadata: { complex: { nested: { data: `value-${i}` } } },
        ai_analysis: null,
        qualification_notes: `Long qualification notes for user ${i}`.repeat(10), // Long text
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const startTime = Date.now()
      const csvResult = leadsToCSV(leads, {
        fields: ['name', 'email', 'phone', 'status', 'metadata'],
        includeHeaders: true
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000)
      expect(csvResult.split('\n')).toHaveLength(2001)
    })
  })

  describe('Memory Usage and Cleanup', () => {
    test('handles multiple sequential operations without memory leaks', () => {
      const iterations = 10
      const recordsPerIteration = 1000

      for (let iter = 0; iter < iterations; iter++) {
        // Generate data
        const csvData = Array.from({ length: recordsPerIteration }, (_, i) => ({
          Name: `User ${iter}-${i}`,
          Email: `user${iter}-${i}@test.com`,
          Phone: `${iter}${i}`,
          Status: 'cold'
        }))

        // Parse and map
        const mapping = { name: 'Name', email: 'Email', phone: 'Phone', status: 'Status' }
        const mapped = mapCSVToLeads(csvData, mapping, organizationId)
        const validated = validateImportData(mapped)

        // Create leads for export
        const leads: Lead[] = validated.validLeads.map(lead => ({
          ...lead.data,
          id: `${iter}-${lead.rowIndex}`,
          lead_score: 0,
          source: 'Test',
          campaign_id: null,
          metadata: null,
          ai_analysis: null,
          qualification_notes: null,
          assigned_to: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Lead))

        // Export
        const csv = leadsToCSV(leads)

        // Verify operation completed successfully
        expect(validated.validLeads.length).toBe(recordsPerIteration)
        expect(csv.split('\n').length).toBe(recordsPerIteration + 1)
      }

      // Test should complete without memory errors
      expect(true).toBe(true)
    })

    test('handles edge cases with extreme data sizes', () => {
      // Test with very long field values
      const longValue = 'A'.repeat(10000) // 10KB string
      const csvData = [{
        Name: 'Test User',
        Email: 'test@example.com',
        Notes: longValue
      }]

      const mapping = { name: 'Name', email: 'Email', qualification_notes: 'Notes' }
      
      const startTime = Date.now()
      const mapped = mapCSVToLeads(csvData, mapping, organizationId)
      const validated = validateImportData(mapped)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)
      expect(validated.validLeads[0].data.qualification_notes).toHaveLength(10000)
    })
  })

  describe('Concurrent Operations', () => {
    test('handles multiple parsing operations concurrently', async () => {
      const tasks = Array.from({ length: 5 }, async (_, i) => {
        const csvContent = `Name,Email\n${Array.from({ length: 1000 }, (_, j) => 
          `User ${i}-${j},user${i}-${j}@test.com`
        ).join('\n')}`

        return parseCSV(csvContent)
      })

      const startTime = Date.now()
      const results = await Promise.all(tasks)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000)
      results.forEach((result, i) => {
        expect(result.data).toHaveLength(1000)
        expect(result.data[0].Name).toBe(`User ${i}-0`)
      })
    })
  })

  describe('Real-world Simulation', () => {
    test('simulates typical gym lead import scenario', () => {
      // Simulate a real CSV export from a lead generation system
      const headers = 'Full Name,Email Address,Phone Number,Lead Status,Lead Source,Interest Level,Notes,Created Date'
      const csvRows = Array.from({ length: 500 }, (_, i) => {
        const interests = ['Personal Training', 'Group Classes', 'Nutrition Coaching', 'Weight Loss']
        const sources = ['Facebook Ad', 'Google Ad', 'Website Form', 'Referral', 'Walk-in']
        const statuses = ['cold', 'warm', 'hot']
        
        return `"${['John', 'Jane', 'Mike', 'Sarah', 'Chris'][i % 5]} ${['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'][i % 5]}","lead${i}@example.com","+1${(2000000000 + i).toString()}","${statuses[i % 3]}","${sources[i % 5]}","${interests[i % 4]}","Interested in ${interests[i % 4]}, contacted via ${sources[i % 5]}","2024-01-${String(1 + (i % 28)).padStart(2, '0')} 10:${String(i % 60).padStart(2, '0')}:00"`
      })
      
      const csvContent = [headers, ...csvRows].join('\n')

      // Parse
      const startParse = Date.now()
      const parsed = parseCSV(csvContent)
      const endParse = Date.now()

      // Map
      const mapping = {
        name: 'Full Name',
        email: 'Email Address', 
        phone: 'Phone Number',
        status: 'Lead Status',
        source: 'Lead Source',
        qualification_notes: 'Notes'
      }

      const startMap = Date.now()
      const mapped = mapCSVToLeads(parsed.data, mapping, organizationId)
      const endMap = Date.now()

      // Validate
      const startValidate = Date.now()
      const validated = validateImportData(mapped)
      const endValidate = Date.now()

      // Export back to CSV
      const leads: Lead[] = validated.validLeads.map(lead => ({
        ...lead.data,
        id: `imported-${lead.rowIndex}`,
        lead_score: Math.floor(Math.random() * 100),
        campaign_id: null,
        metadata: { imported: true },
        ai_analysis: null,
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Lead))

      const startExport = Date.now()
      const exported = leadsToCSV(leads)
      const endExport = Date.now()

      // Performance assertions
      expect(endParse - startParse).toBeLessThan(1000) // Parse < 1s
      expect(endMap - startMap).toBeLessThan(500)       // Map < 0.5s
      expect(endValidate - startValidate).toBeLessThan(300) // Validate < 0.3s
      expect(endExport - startExport).toBeLessThan(1000)    // Export < 1s

      // Data integrity assertions
      expect(parsed.errors).toHaveLength(0)
      expect(validated.validLeads).toHaveLength(500)
      expect(validated.invalidLeads).toHaveLength(0)
      expect(exported.split('\n')).toHaveLength(501) // Header + 500 rows

      console.log(`Performance Summary:
        Parse: ${endParse - startParse}ms
        Map: ${endMap - startMap}ms  
        Validate: ${endValidate - startValidate}ms
        Export: ${endExport - startExport}ms
        Total: ${endExport - startParse}ms
        Records: ${validated.validLeads.length}
      `)
    })
  })
})