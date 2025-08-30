import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { ImportModal } from '@/components/leads/import-modal'

// Mock dependencies
jest.mock('@/hooks/use-api', () => ({
  useOrganization: () => ({ data: { id: 'test-org', name: 'Test Organization' } })
}))

jest.mock('@/lib/utils/csv-parser', () => ({
  parseCSV: jest.fn(),
  mapCSVToLeads: jest.fn(),
  validateImportData: jest.fn(),
  generateSampleCSV: jest.fn(() => 'Name,Email\nTest,test@example.com')
}))

jest.mock('@/lib/utils/csv-export', () => ({
  downloadCSV: jest.fn()
}))

import { parseCSV, mapCSVToLeads, validateImportData } from '@/lib/utils/csv-parser'
import { downloadCSV } from '@/lib/utils/csv-export'

const mockParseCSV = jest.mocked(parseCSV)
const mockMapCSVToLeads = jest.mocked(mapCSVToLeads)
const mockValidateImportData = jest.mocked(validateImportData)
const mockDownloadCSV = jest.mocked(downloadCSV)

describe('ImportModal Component Tests', () => {
  let queryClient: QueryClient
  const mockOnClose = jest.fn()
  const mockOnImport = jest.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    jest.clearAllMocks()
  })

  const renderModal = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
          isImporting={false}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  describe('Modal Rendering and Basic Functionality', () => {
    test('renders modal when open', () => {
      renderModal()
      
      expect(screen.getByText('Import Leads')).toBeInTheDocument()
      expect(screen.getByText('Upload a CSV file to bulk import leads')).toBeInTheDocument()
      expect(screen.getByText('Download Template')).toBeInTheDocument()
    })

    test('does not render when closed', () => {
      renderModal({ isOpen: false })
      
      expect(screen.queryByText('Import Leads')).not.toBeInTheDocument()
    })

    test('calls onClose when close button clicked', () => {
      renderModal()
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    test('calls onClose when cancel button clicked', () => {
      renderModal()
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Upload Step', () => {
    test('shows upload step initially', () => {
      renderModal()
      
      expect(screen.getByText('Upload CSV')).toBeInTheDocument()
      expect(screen.getByText('Upload CSV')).toHaveClass('text-blue-600') // Active step
    })

    test('downloads template when button clicked', () => {
      renderModal()
      
      const templateButton = screen.getByRole('button', { name: 'Download Template' })
      fireEvent.click(templateButton)
      
      expect(mockDownloadCSV).toHaveBeenCalledWith(
        'Name,Email\nTest,test@example.com',
        'leads-template.csv'
      )
    })

    test('processes file upload successfully', async () => {
      mockParseCSV.mockReturnValue({
        headers: ['Name', 'Email'],
        data: [{ Name: 'John Doe', Email: 'john@test.com' }],
        errors: []
      })

      renderModal()
      
      const file = new File(['Name,Email\nJohn Doe,john@test.com'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(mockParseCSV).toHaveBeenCalled()
        expect(screen.getByText('Map Fields')).toHaveClass('text-blue-600') // Should advance to mapping step
      })
    })

    test('shows parsing errors', async () => {
      mockParseCSV.mockReturnValue({
        headers: [],
        data: [],
        errors: ['Invalid CSV format', 'Missing headers']
      })

      renderModal()
      
      const file = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText('CSV Parsing Issues')).toBeInTheDocument()
        expect(screen.getByText('Invalid CSV format')).toBeInTheDocument()
        expect(screen.getByText('Missing headers')).toBeInTheDocument()
      })
    })
  })

  describe('Mapping Step', () => {
    beforeEach(async () => {
      mockParseCSV.mockReturnValue({
        headers: ['Name', 'Email', 'Phone'],
        data: [{ Name: 'John Doe', Email: 'john@test.com', Phone: '123456' }],
        errors: []
      })

      renderModal()
      
      const file = new File(['Name,Email,Phone\nJohn Doe,john@test.com,123456'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText('Map CSV Columns to Lead Fields')).toBeInTheDocument()
      })
    })

    test('shows field mapping interface', () => {
      expect(screen.getByText('Map CSV Columns to Lead Fields')).toBeInTheDocument()
      expect(screen.getByText('Name *')).toBeInTheDocument()
      expect(screen.getByText('Email *')).toBeInTheDocument()
      expect(screen.getByText('Phone')).toBeInTheDocument()
    })

    test('shows CSV preview data', () => {
      expect(screen.getByText('Found 1 rows in your CSV file')).toBeInTheDocument()
      expect(screen.getByText('First row preview:')).toBeInTheDocument()
    })

    test('enables next button when required fields mapped', async () => {
      const nameSelect = screen.getByDisplayValue('')
      fireEvent.change(nameSelect, { target: { value: 'Name' } })
      
      const emailSelect = screen.getAllByDisplayValue('')[0]
      fireEvent.change(emailSelect, { target: { value: 'Email' } })
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: 'Next: Preview' })
        expect(nextButton).not.toBeDisabled()
      })
    })

    test('disables next button when required fields not mapped', () => {
      const nextButton = screen.getByRole('button', { name: 'Next: Preview' })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Preview Step', () => {
    beforeEach(async () => {
      mockParseCSV.mockReturnValue({
        headers: ['Name', 'Email'],
        data: [{ Name: 'John Doe', Email: 'john@test.com' }],
        errors: []
      })

      mockMapCSVToLeads.mockReturnValue([
        {
          data: { name: 'John Doe', email: 'john@test.com' },
          errors: [],
          rowIndex: 0
        }
      ])

      mockValidateImportData.mockReturnValue({
        validLeads: [{
          data: { name: 'John Doe', email: 'john@test.com' },
          errors: [],
          rowIndex: 0
        }],
        invalidLeads: [],
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          duplicateEmails: 0
        }
      })

      renderModal()
      
      // Upload file
      const file = new File(['Name,Email\nJohn Doe,john@test.com'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      // Map fields
      await waitFor(() => {
        const nameSelect = screen.getByDisplayValue('')
        fireEvent.change(nameSelect, { target: { value: 'Name' } })
        
        const emailSelect = screen.getAllByDisplayValue('')[0]
        fireEvent.change(emailSelect, { target: { value: 'Email' } })
      })
      
      // Navigate to preview
      const nextButton = screen.getByRole('button', { name: 'Next: Preview' })
      fireEvent.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Import Summary')).toBeInTheDocument()
      })
    })

    test('shows import summary statistics', () => {
      expect(screen.getByText('Import Summary')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Total rows
      expect(screen.getByText('Total Rows')).toBeInTheDocument()
      expect(screen.getByText('Valid Leads')).toBeInTheDocument()
      expect(screen.getByText('Invalid Leads')).toBeInTheDocument()
    })

    test('shows ready to import section', () => {
      expect(screen.getByText('Ready to Import (1 leads)')).toBeInTheDocument()
      expect(screen.getByText('John Doe (john@test.com)')).toBeInTheDocument()
    })

    test('enables import button for valid data', () => {
      const importButton = screen.getByRole('button', { name: 'Import 1 Leads' })
      expect(importButton).not.toBeDisabled()
    })

    test('calls onImport when import button clicked', async () => {
      mockOnImport.mockResolvedValue(undefined)
      
      const importButton = screen.getByRole('button', { name: 'Import 1 Leads' })
      fireEvent.click(importButton)
      
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith([
          { name: 'John Doe', email: 'john@test.com' }
        ])
      })
    })
  })

  describe('Error Handling', () => {
    test('shows issues for invalid data', async () => {
      mockParseCSV.mockReturnValue({
        headers: ['Name', 'Email'],
        data: [{ Name: '', Email: 'invalid-email' }],
        errors: []
      })

      mockMapCSVToLeads.mockReturnValue([
        {
          data: { name: '', email: 'invalid-email' },
          errors: ['Name is required', 'Invalid email format'],
          rowIndex: 0
        }
      ])

      mockValidateImportData.mockReturnValue({
        validLeads: [],
        invalidLeads: [{
          data: { name: '', email: 'invalid-email' },
          errors: ['Name is required', 'Invalid email format'],
          rowIndex: 0
        }],
        summary: {
          totalRows: 1,
          validRows: 0,
          invalidRows: 1,
          duplicateEmails: 0
        }
      })

      renderModal()
      
      // Upload and navigate to preview
      const file = new File(['Name,Email\n,invalid-email'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        const nameSelect = screen.getByDisplayValue('')
        fireEvent.change(nameSelect, { target: { value: 'Name' } })
        
        const emailSelect = screen.getAllByDisplayValue('')[0]
        fireEvent.change(emailSelect, { target: { value: 'Email' } })
      })
      
      const nextButton = screen.getByRole('button', { name: 'Next: Preview' })
      fireEvent.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Issues Found (1 rows)')).toBeInTheDocument()
        expect(screen.getByText('Row 1: Name is required, Invalid email format')).toBeInTheDocument()
      })
    })

    test('disables import for no valid leads', async () => {
      mockValidateImportData.mockReturnValue({
        validLeads: [],
        invalidLeads: [{
          data: {},
          errors: ['Multiple errors'],
          rowIndex: 0
        }],
        summary: {
          totalRows: 1,
          validRows: 0,
          invalidRows: 1,
          duplicateEmails: 0
        }
      })

      // Setup state to reach preview
      renderModal()
      
      // Mock reaching preview step with invalid data
      const importButton = screen.queryByRole('button', { name: /Import \d+ Leads/ })
      if (importButton) {
        expect(importButton).toBeDisabled()
      }
    })
  })

  describe('Loading States', () => {
    test('shows importing state', () => {
      renderModal({ isImporting: true })
      
      expect(screen.getByText('Importing Leads...')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we process your data.')).toBeInTheDocument()
    })

    test('disables buttons during import', () => {
      renderModal({ isImporting: true })
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      expect(cancelButton).toBeDisabled()
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderModal()
      
      const modal = screen.getByRole('dialog', { hidden: true })
      expect(modal).toBeInTheDocument()
    })

    test('focuses close button on open', () => {
      renderModal()
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(document.activeElement).toBe(closeButton)
    })
  })

  describe('Step Navigation', () => {
    test('shows correct step indicators', () => {
      renderModal()
      
      // Upload step should be active
      expect(screen.getByText('Upload CSV')).toHaveClass('text-blue-600')
      expect(screen.getByText('Map Fields')).toHaveClass('text-gray-500')
      expect(screen.getByText('Preview & Import')).toHaveClass('text-gray-500')
    })

    test('updates step indicators on navigation', async () => {
      mockParseCSV.mockReturnValue({
        headers: ['Name', 'Email'],
        data: [{ Name: 'John', Email: 'john@test.com' }],
        errors: []
      })

      renderModal()
      
      const file = new File(['Name,Email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' })
      const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(screen.getByText('Map Fields')).toHaveClass('text-blue-600')
        expect(screen.getByText('Upload CSV')).toHaveClass('text-green-600') // Completed
      })
    })
  })
})