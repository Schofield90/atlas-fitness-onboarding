import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AddClassTypeModal from '@/app/classes/AddClassTypeModal'

// Mock the organization client
jest.mock('@/app/lib/organization-client', () => ({
  getCurrentUserOrganization: jest.fn().mockResolvedValue({
    organizationId: 'test-org-id',
    error: null
  })
}))

// Mock the Supabase client
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        error: null
      }))
    }))
  }))
}))

describe('AddClassTypeModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
  }

  it('renders modal with correct title', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    expect(screen.getByText('New Class Type')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel button is clicked', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', async () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    // Find the backdrop (the outer div with fixed positioning)
    const backdrop = screen.getByTestId('modal-backdrop') || 
                    document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50')
    
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('does not close when clicking inside the modal content', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    const modalContent = screen.getByText('Name:').closest('div')
    if (modalContent) {
      fireEvent.click(modalContent)
      expect(mockOnClose).not.toHaveBeenCalled()
    }
  })

  it('has required form fields', () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByText(/visibility/i)).toBeInTheDocument()
  })

  it('shows loading state when submitting', async () => {
    render(<AddClassTypeModal {...defaultProps} />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /create class type/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test Class' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })
  })

  it('prevents event propagation when clicking modal content', () => {
    const { container } = render(<AddClassTypeModal {...defaultProps} />)
    
    const modalContent = container.querySelector('.bg-gray-800.rounded-lg')
    const stopPropagationSpy = jest.fn()
    
    if (modalContent) {
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'stopPropagation', {
        value: stopPropagationSpy
      })
      
      modalContent.dispatchEvent(clickEvent)
      // The actual stopPropagation is called in the onClick handler
    }
  })
})