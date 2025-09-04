import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mocks
const pushMock = jest.fn()
let actionParam: string | null = null

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'action' ? actionParam : null),
  }),
}))

jest.mock('@/app/components/DashboardLayout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))
jest.mock('@/app/components/leads/LeadsTable', () => ({
  LeadsTable: () => <div data-testid="leads-table">Table</div>,
}))
jest.mock('@/app/components/leads/BulkImportModal', () => ({ __esModule: true, default: () => null }))
jest.mock('@/app/components/leads/AddLeadModal', () => ({
  AddLeadModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Add New Lead</div> : null),
}))

import LeadsPage from '@/app/leads/page'

describe('LeadsPage Add Lead button routing', () => {
  beforeEach(() => {
    pushMock.mockReset()
    actionParam = null
  })

  it('clicking Add Lead routes to /leads?action=new', () => {
    render(<LeadsPage />)
    const addButton = screen.getByRole('button', { name: 'Add Lead' })
    fireEvent.click(addButton)
    expect(pushMock).toHaveBeenCalledWith('/leads?action=new')
  })

  it('opens create modal when action=new in URL', () => {
    actionParam = 'new'
    render(<LeadsPage />)
    expect(screen.getByText('Add New Lead')).toBeInTheDocument()
  })
})

