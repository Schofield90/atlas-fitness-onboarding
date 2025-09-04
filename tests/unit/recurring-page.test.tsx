import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import RecurringClassesPage from '@/app/classes/recurring/page'

// Stub DashboardLayout to avoid auth and heavy providers in unit test
jest.mock('@/app/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>
}))

// Mock supabase client
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    })
  })
}))

// Mock organization hook
jest.mock('@/app/hooks/useOrganization', () => ({
  useOrganization: () => ({ organizationId: 'org_123' })
}))

describe('RecurringClassesPage', () => {
  it('shows empty state when no class types', async () => {
    render(<RecurringClassesPage />)

    await waitFor(() => {
      expect(screen.getByText('No class types yet')).toBeInTheDocument()
    })
  })
})

