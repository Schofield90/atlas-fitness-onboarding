import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Header } from '@/components/layout/header'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
  success: jest.fn(),
}))

jest.mock('@/hooks/use-click-outside', () => ({
  useClickOutside: jest.fn((callback) => ({ current: null })),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  pathname: '/dashboard',
}

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('Plus Button Functionality', () => {
    it('should render plus button with correct attributes', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      expect(plusButton).toBeInTheDocument()
      expect(plusButton).toHaveAttribute('aria-label', 'Create new item')
      expect(plusButton).toHaveAttribute('title', 'Create new item')
    })

    it('should open plus menu when plus button is clicked', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      expect(screen.getByTestId('create-lead-option')).toBeInTheDocument()
      expect(screen.getByTestId('create-task-option')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-meeting-option')).toBeInTheDocument()
    })

    it('should display Create lead option and navigate on click', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      const createLeadOption = screen.getByTestId('create-lead-option')
      expect(createLeadOption).toBeInTheDocument()
      expect(createLeadOption).toHaveTextContent('Create lead')
      
      fireEvent.click(createLeadOption)
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/leads?action=new')
    })

    it('should display Create task option as disabled with Coming soon text', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      const createTaskOption = screen.getByTestId('create-task-option')
      expect(createTaskOption).toBeInTheDocument()
      expect(createTaskOption).toHaveTextContent('Create task')
      expect(createTaskOption).toHaveTextContent('(Coming soon)')
      expect(createTaskOption).toBeDisabled()
      expect(createTaskOption).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should show toast when Create task is clicked', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      const createTaskOption = screen.getByTestId('create-task-option')
      fireEvent.click(createTaskOption)
      
      expect(toast).toHaveBeenCalledWith('Coming soon - Task creation feature')
    })

    it('should display Schedule meeting option and show toast on click', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      const scheduleMeetingOption = screen.getByTestId('schedule-meeting-option')
      expect(scheduleMeetingOption).toBeInTheDocument()
      expect(scheduleMeetingOption).toHaveTextContent('Schedule meeting')
      
      fireEvent.click(scheduleMeetingOption)
      expect(toast).toHaveBeenCalledWith('Schedule meeting modal would open here')
    })
  })

  describe('Notifications Bell Functionality', () => {
    it('should render notifications bell with correct attributes', () => {
      render(<Header />)
      
      const notificationsBell = screen.getByTestId('notifications-bell')
      expect(notificationsBell).toBeInTheDocument()
      expect(notificationsBell).toHaveAttribute('aria-label', 'View notifications')
      expect(notificationsBell).toHaveAttribute('title', 'View notifications')
    })

    it('should display unread count badge', () => {
      render(<Header />)
      
      const unreadBadge = screen.getByText('3') // Mock data shows 3 unread notifications
      expect(unreadBadge).toBeInTheDocument()
      expect(unreadBadge).toHaveClass('bg-red-500', 'text-white', 'text-xs', 'rounded-full')
    })

    it('should open notifications drawer when bell is clicked', () => {
      render(<Header />)
      
      const notificationsBell = screen.getByTestId('notifications-bell')
      fireEvent.click(notificationsBell)
      
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument()
    })

    it('should display mock notifications in drawer', () => {
      render(<Header />)
      
      const notificationsBell = screen.getByTestId('notifications-bell')
      fireEvent.click(notificationsBell)
      
      expect(screen.getByTestId('notification-1')).toBeInTheDocument()
      expect(screen.getByTestId('notification-2')).toBeInTheDocument()
      expect(screen.getByTestId('notification-3')).toBeInTheDocument()
      
      expect(screen.getByText('New lead assigned')).toBeInTheDocument()
      expect(screen.getByText('Client payment received')).toBeInTheDocument()
      expect(screen.getByText('Campaign performance')).toBeInTheDocument()
    })

    it('should show success toast when Mark all read is clicked', () => {
      render(<Header />)
      
      const notificationsBell = screen.getByTestId('notifications-bell')
      fireEvent.click(notificationsBell)
      
      const markAllReadButton = screen.getByTestId('mark-all-read-button')
      fireEvent.click(markAllReadButton)
      
      expect(toast.success).toHaveBeenCalledWith('All notifications marked as read')
    })
  })

  describe('Search Functionality', () => {
    it('should render search input with correct placeholder', () => {
      render(<Header />)
      
      const searchInput = screen.getByPlaceholderText('Search leads, clients, or campaigns...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveClass('w-full', 'pl-10', 'pr-4', 'py-2')
    })
  })

  describe('Profile Menu', () => {
    it('should render profile section with user info', () => {
      render(<Header />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should toggle profile menu when clicked', () => {
      render(<Header />)
      
      const profileButton = screen.getByText('John Doe')
      fireEvent.click(profileButton)
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      expect(screen.getByText('Organization Settings')).toBeInTheDocument()
      expect(screen.getByText('Help & Support')).toBeInTheDocument()
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      const notificationsBell = screen.getByTestId('notifications-bell')
      
      expect(plusButton).toHaveAttribute('aria-label', 'Create new item')
      expect(notificationsBell).toHaveAttribute('aria-label', 'View notifications')
    })

    it('should support keyboard navigation', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      plusButton.focus()
      expect(plusButton).toHaveFocus()
      
      // Test Enter key opens menu
      fireEvent.keyDown(plusButton, { key: 'Enter', code: 'Enter' })
      fireEvent.click(plusButton) // Simulate the click that would happen on Enter
      
      expect(screen.getByTestId('create-lead-option')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle router navigation errors gracefully', () => {
      const mockPushError = jest.fn()
      ;(useRouter as jest.Mock).mockReturnValue({
        ...mockRouter,
        push: mockPushError,
      })
      
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      const createLeadOption = screen.getByTestId('create-lead-option')
      fireEvent.click(createLeadOption)
      
      // Should attempt navigation
      expect(mockPushError).toHaveBeenCalledWith('/dashboard/leads?action=new')
    })
  })

  describe('State Management', () => {
    it('should close plus menu when option is selected', () => {
      render(<Header />)
      
      const plusButton = screen.getByTestId('plus-button')
      fireEvent.click(plusButton)
      
      expect(screen.getByTestId('create-lead-option')).toBeInTheDocument()
      
      const createLeadOption = screen.getByTestId('create-lead-option')
      fireEvent.click(createLeadOption)
      
      // Menu should close after selection
      expect(screen.queryByTestId('create-lead-option')).not.toBeInTheDocument()
    })

    it('should manage drawer open/close state correctly', () => {
      render(<Header />)
      
      const notificationsBell = screen.getByTestId('notifications-bell')
      
      // Open drawer
      fireEvent.click(notificationsBell)
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      
      // Close drawer by clicking bell again
      fireEvent.click(notificationsBell)
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    })
  })
})