import { 
  leadsToCSV, 
  downloadCSV, 
  generateExportFilename, 
  getExportFieldOptions 
} from '@/lib/utils/csv-export'
import { Lead } from '@/types/database'

// Mock DOM methods for testing downloadCSV
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()
Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    click: jest.fn(),
    style: {},
    download: true
  })),
})
Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
})

describe('CSV Export Utility Tests', () => {
  const mockLeads: Lead[] = [
    {
      id: '1',
      organization_id: 'org-1',
      name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      status: 'warm',
      lead_score: 75,
      source: 'Website',
      campaign_id: null,
      metadata: { utm_source: 'google' },
      ai_analysis: { sentiment: 'positive' },
      qualification_notes: 'Very interested in personal training',
      assigned_to: null,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-16T14:20:00Z'
    },
    {
      id: '2',
      organization_id: 'org-1',
      name: 'Jane Smith',
      email: 'jane@test.com',
      phone: null,
      status: 'hot',
      lead_score: 90,
      source: 'Facebook Ad',
      campaign_id: 'camp-123',
      metadata: null,
      ai_analysis: null,
      qualification_notes: null,
      assigned_to: 'user-456',
      created_at: '2024-01-14T09:15:00Z',
      updated_at: '2024-01-14T09:15:00Z'
    }
  ]

  describe('leadsToCSV', () => {
    test('exports leads with default configuration', () => {
      const result = leadsToCSV(mockLeads)

      expect(result).toContain('Name,Email,Phone,Status,Source,Lead Score,Notes,Created Date')
      expect(result).toContain('John Doe,john@test.com,+1234567890,Warm,Website,75,Very interested in personal training')
      expect(result).toContain('Jane Smith,jane@test.com,,Hot,Facebook Ad,90,')
    })

    test('exports with custom field selection', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'email', 'status']
      })

      expect(result).toContain('Name,Email,Status')
      expect(result).toContain('John Doe,john@test.com,Warm')
      expect(result).toContain('Jane Smith,jane@test.com,Hot')
      expect(result).not.toContain('Phone')
    })

    test('exports without headers when configured', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'email'],
        includeHeaders: false
      })

      expect(result).not.toContain('Name,Email')
      expect(result).toContain('John Doe,john@test.com')
      expect(result).toContain('Jane Smith,jane@test.com')
    })

    test('properly escapes CSV fields with commas and quotes', () => {
      const leadsWithSpecialChars: Lead[] = [{
        ...mockLeads[0],
        name: 'John "Big Guy" Doe',
        qualification_notes: 'Likes boxing, weightlifting, and cardio'
      }]

      const result = leadsToCSV(leadsWithSpecialChars, {
        fields: ['name', 'qualification_notes']
      })

      expect(result).toContain('"John ""Big Guy"" Doe"')
      expect(result).toContain('"Likes boxing, weightlifting, and cardio"')
    })

    test('formats dates consistently', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'created_at']
      })

      // Check that dates are formatted as locale strings
      expect(result).toMatch(/\d+\/\d+\/\d+.*\d+:\d+:\d+/)
    })

    test('handles null and undefined values', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'phone', 'qualification_notes']
      })

      // Jane Smith has null phone and qualification_notes
      expect(result).toContain('Jane Smith,,')
    })

    test('formats lead score correctly', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'lead_score']
      })

      expect(result).toContain('John Doe,75')
      expect(result).toContain('Jane Smith,90')
    })

    test('formats status with proper capitalization', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'status']
      })

      expect(result).toContain('John Doe,Warm')
      expect(result).toContain('Jane Smith,Hot')
    })

    test('handles complex metadata and ai_analysis objects', () => {
      const result = leadsToCSV(mockLeads, {
        fields: ['name', 'metadata', 'ai_analysis']
      })

      expect(result).toContain('utm_source')
      expect(result).toContain('sentiment')
    })
  })

  describe('generateExportFilename', () => {
    beforeAll(() => {
      // Mock Date to get consistent test results
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T14:30:45Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    test('generates filename with default prefix and timestamp', () => {
      const filename = generateExportFilename()

      expect(filename).toMatch(/^leads-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
    })

    test('generates filename with custom prefix', () => {
      const filename = generateExportFilename('custom-export')

      expect(filename).toMatch(/^custom-export-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
    })

    test('generates unique filenames for different times', () => {
      const filename1 = generateExportFilename('test')
      
      jest.advanceTimersByTime(1000) // Advance by 1 second
      
      const filename2 = generateExportFilename('test')

      expect(filename1).not.toBe(filename2)
    })
  })

  describe('getExportFieldOptions', () => {
    test('returns all available field options', () => {
      const options = getExportFieldOptions()

      expect(options).toHaveLength(9)
      expect(options).toContainEqual({ value: 'name', label: 'Name' })
      expect(options).toContainEqual({ value: 'email', label: 'Email' })
      expect(options).toContainEqual({ value: 'phone', label: 'Phone' })
      expect(options).toContainEqual({ value: 'status', label: 'Status' })
      expect(options).toContainEqual({ value: 'source', label: 'Source' })
      expect(options).toContainEqual({ value: 'lead_score', label: 'Lead Score' })
      expect(options).toContainEqual({ value: 'qualification_notes', label: 'Notes' })
      expect(options).toContainEqual({ value: 'created_at', label: 'Created Date' })
      expect(options).toContainEqual({ value: 'updated_at', label: 'Updated Date' })
    })

    test('returns options in expected format', () => {
      const options = getExportFieldOptions()

      options.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })
  })

  describe('downloadCSV', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('creates and triggers download with default filename', () => {
      const csvContent = 'Name,Email\nJohn,john@test.com'
      
      downloadCSV(csvContent)

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    test('uses custom filename when provided', () => {
      const csvContent = 'Name,Email\nJohn,john@test.com'
      const customFilename = 'my-custom-export.csv'
      
      const mockLink = {
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {},
        download: true
      }
      
      jest.mocked(document.createElement).mockReturnValue(mockLink as any)
      
      downloadCSV(csvContent, customFilename)

      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', customFilename)
    })

    test('cleans up resources after download', () => {
      const csvContent = 'Name,Email\nJohn,john@test.com'
      
      const mockLink = {
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {},
        download: true
      }
      
      jest.mocked(document.createElement).mockReturnValue(mockLink as any)
      
      downloadCSV(csvContent)

      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles empty leads array', () => {
      const result = leadsToCSV([])

      expect(result).toBe('Name,Email,Phone,Status,Source,Lead Score,Notes,Created Date')
    })

    test('handles leads with all null values', () => {
      const nullLead: Lead = {
        id: '1',
        organization_id: 'org-1',
        name: '',
        email: '',
        phone: null,
        status: 'cold',
        lead_score: 0,
        source: '',
        campaign_id: null,
        metadata: null,
        ai_analysis: null,
        qualification_notes: null,
        assigned_to: null,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      }

      const result = leadsToCSV([nullLead])

      expect(result).toContain(',,Cold,,0,')
    })

    test('handles very large datasets efficiently', () => {
      const largeDataset: Lead[] = Array.from({ length: 5000 }, (_, i) => ({
        ...mockLeads[0],
        id: `${i}`,
        name: `User ${i}`,
        email: `user${i}@test.com`
      }))

      const startTime = Date.now()
      const result = leadsToCSV(largeDataset)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(result.split('\n')).toHaveLength(5001) // Header + 5000 data rows
    })

    test('handles special characters and newlines in data', () => {
      const specialCharsLead: Lead = {
        ...mockLeads[0],
        name: 'User\nWith\nNewlines',
        qualification_notes: 'Has special chars: áéíóú, 中文, 🚀'
      }

      const result = leadsToCSV([specialCharsLead], {
        fields: ['name', 'qualification_notes']
      })

      expect(result).toContain('"User\nWith\nNewlines"')
      expect(result).toContain('Has special chars: áéíóú, 中文, 🚀')
    })
  })
})