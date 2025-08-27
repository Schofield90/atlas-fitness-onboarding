/**
 * Unit Tests for Conversations - New Conversation Button
 * Tests button presence and functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConversationsPage from '@/app/conversations/page'

// Mock Supabase
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { organization_id: 'test-org' },
      error: null
    }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: [],
      error: null
    })
  }))
}))

describe('Conversations Page - New Conversation Button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display New Conversation button in header', async () => {
    render(<ConversationsPage />)

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /New Conversation/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeVisible()
    })
  })

  it('should have correct styling for New Conversation button', async () => {
    render(<ConversationsPage />)

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /New Conversation/i })
      expect(button).toHaveClass('bg-blue-600')
      expect(button).toHaveClass('text-white')
    })
  })

  it('should switch to enhanced view when clicking New Conversation', async () => {
    render(<ConversationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: /New Conversation/i })
    fireEvent.click(button)

    await waitFor(() => {
      // Check for enhanced view elements
      expect(screen.getByText(/Select a contact/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Search contacts/i)).toBeInTheDocument()
    })
  })

  it('should show contact search interface after clicking New Conversation', async () => {
    render(<ConversationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /New Conversation/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search.*contacts/i)).toBeInTheDocument()
      expect(screen.getByText(/Select.*contact.*start/i)).toBeInTheDocument()
    })
  })

  it('should allow searching for contacts', async () => {
    const mockContacts = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
    ]

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user' } },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockContacts,
        error: null
      }),
      single: jest.fn().mockResolvedValue({
        data: { organization_id: 'test-org' },
        error: null
      })
    }

    const { createClient } = require('@/app/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    render(<ConversationsPage />)

    // Click new conversation
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByRole('button', { name: /New Conversation/i }))

    // Search for contact
    const searchInput = await screen.findByPlaceholderText(/Search.*contacts/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })

  it('should handle conversation creation flow', async () => {
    render(<ConversationsPage />)

    // Click new conversation
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByRole('button', { name: /New Conversation/i }))

    // Select a contact
    const contactOption = await screen.findByText('John Doe')
    fireEvent.click(contactOption)

    // Message input should appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument()
    })

    // Type message
    const messageInput = screen.getByPlaceholderText(/Type a message/i)
    fireEvent.change(messageInput, { target: { value: 'Hello, this is a test' } })

    // Send button should be enabled
    const sendButton = screen.getByRole('button', { name: /Send/i })
    expect(sendButton).not.toBeDisabled()
  })

  it('should maintain button visibility while scrolling', async () => {
    render(<ConversationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
    })

    // Simulate scroll
    window.scrollY = 500
    window.dispatchEvent(new Event('scroll'))

    // Button should still be visible (assuming sticky header)
    expect(screen.getByRole('button', { name: /New Conversation/i })).toBeInTheDocument()
  })
})