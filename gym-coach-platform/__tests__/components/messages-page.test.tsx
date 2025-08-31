import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessagesPage from '@/app/dashboard/messages/page'

describe('Messages Page', () => {
  describe('Empty State', () => {
    it('should display empty state when no conversations exist', () => {
      render(<MessagesPage />)
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument()
      expect(screen.getByText('Start a conversation with your leads or clients')).toBeInTheDocument()
      expect(screen.getByText('Select a conversation')).toBeInTheDocument()
    })

    it('should show start conversation button in empty state', () => {
      render(<MessagesPage />)
      
      const startButtons = screen.getAllByText('Start Conversation')
      expect(startButtons.length).toBeGreaterThan(0)
    })

    it('should have plus button in header', () => {
      render(<MessagesPage />)
      
      const plusButtons = screen.getAllByRole('button')
      const headerPlusButton = plusButtons.find(btn => 
        btn.querySelector('svg') && btn.className.includes('h-8 w-8')
      )
      expect(headerPlusButton).toBeInTheDocument()
    })
  })

  describe('Start Conversation', () => {
    it('should open new conversation modal when clicking start button', () => {
      render(<MessagesPage />)
      
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      expect(screen.getByText('Start New Conversation')).toBeInTheDocument()
      expect(screen.getByLabelText('Recipient')).toBeInTheDocument()
      expect(screen.getByLabelText('Message')).toBeInTheDocument()
    })

    it('should close modal when clicking cancel', () => {
      render(<MessagesPage />)
      
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(screen.queryByText('Start New Conversation')).not.toBeInTheDocument()
    })

    it('should create new conversation when starting conversation', async () => {
      render(<MessagesPage />)
      
      // Open modal
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      // Click Start Conversation in modal
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        expect(screen.queryByText('Start New Conversation')).not.toBeInTheDocument()
      })
      
      // Should now show the new conversation
      expect(screen.getByText('New Lead')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should have search input in conversations list', () => {
      render(<MessagesPage />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      expect(searchInput).toBeInTheDocument()
    })

    it('should update search query when typing', () => {
      render(<MessagesPage />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      fireEvent.change(searchInput, { target: { value: 'test search' } })
      
      expect(searchInput).toHaveValue('test search')
    })
  })

  describe('Message Sending', () => {
    it('should show message input when conversation is selected', async () => {
      render(<MessagesPage />)
      
      // Create a conversation first
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
      })
    })

    it('should have send button disabled when message is empty', async () => {
      render(<MessagesPage />)
      
      // Create a conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeDisabled()
      })
    })

    it('should enable send button when message has content', async () => {
      render(<MessagesPage />)
      
      // Create a conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('Type a message...')
        fireEvent.change(messageInput, { target: { value: 'Test message' } })
        
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeEnabled()
      })
    })

    it('should send message when clicking send button', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('Type a message...')
        fireEvent.change(messageInput, { target: { value: 'Test message' } })
        
        const sendButton = screen.getByRole('button', { name: /send/i })
        fireEvent.click(sendButton)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })
  })

  describe('Conversation Actions', () => {
    it('should show action buttons in conversation header', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        // Check for action buttons
        const buttons = screen.getAllByRole('button')
        const phoneButton = buttons.find(btn => btn.querySelector('svg[class*="Phone"]'))
        const videoButton = buttons.find(btn => btn.querySelector('svg[class*="Video"]'))
        const starButton = buttons.find(btn => btn.querySelector('svg[class*="Star"]'))
        const archiveButton = buttons.find(btn => btn.querySelector('svg[class*="Archive"]'))
        
        expect(phoneButton).toBeDefined()
        expect(videoButton).toBeDefined()
        expect(starButton).toBeDefined()
        expect(archiveButton).toBeDefined()
      })
    })
  })

  describe('Conversation List', () => {
    it('should show conversation details when conversation exists', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        expect(screen.getByText('New Lead')).toBeInTheDocument()
        expect(screen.getByText('Start your conversation...')).toBeInTheDocument()
        expect(screen.getByText('lead')).toBeInTheDocument()
      })
    })

    it('should highlight selected conversation', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const conversationButton = screen.getByText('New Lead').closest('button')
        expect(conversationButton?.className).toContain('bg-blue-50')
      })
    })
  })

  describe('Attachment Actions', () => {
    it('should have attachment button in message input', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const attachButton = buttons.find(btn => btn.querySelector('svg[class*="Paperclip"]'))
        expect(attachButton).toBeDefined()
      })
    })

    it('should have emoji button in message input', async () => {
      render(<MessagesPage />)
      
      // Create conversation
      const startButton = screen.getAllByText('Start Conversation')[0]
      fireEvent.click(startButton)
      
      const modalStartButton = screen.getAllByText('Start Conversation').find(btn => 
        btn.tagName === 'BUTTON' && btn.parentElement?.parentElement?.className?.includes('mt-6')
      )
      
      if (modalStartButton) {
        fireEvent.click(modalStartButton)
      }
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        const emojiButton = buttons.find(btn => btn.querySelector('svg[class*="Smile"]'))
        expect(emojiButton).toBeDefined()
      })
    })
  })
})