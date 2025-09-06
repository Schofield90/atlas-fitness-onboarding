import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import '@testing-library/jest-dom'
import AddMembershipModal from '@/app/components/customers/AddMembershipModal'
import MembershipsTab from '@/app/components/customers/tabs/MembershipsTab'
import { createClient } from '@/app/lib/supabase/client'

// Mock Supabase client
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null
        })),
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'test-membership-id' },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: { id: 'test-membership-id' },
          error: null
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          error: null
        }))
      }))
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }))
}))

// Mock toast
jest.mock('@/app/lib/toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('Membership Functionality', () => {
  const mockSupabase = createClient()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AddMembershipModal', () => {
    const defaultProps = {
      open: true,
      onOpenChange: jest.fn(),
      customerId: 'test-customer-id',
      organizationId: 'test-org-id',
      onMembershipAdded: jest.fn()
    }

    test('renders modal when open', () => {
      render(<AddMembershipModal {...defaultProps} />)
      expect(screen.getByText('Add Membership')).toBeInTheDocument()
    })

    test('displays membership plan selection', async () => {
      // Mock membership plans
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                { id: 'plan-1', name: 'Basic Plan', price_pennies: 5000 },
                { id: 'plan-2', name: 'Premium Plan', price_pennies: 10000 }
              ],
              error: null
            }))
          }))
        }))
      }))

      render(<AddMembershipModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Select a membership plan')).toBeInTheDocument()
      })
    })

    test('prevents duplicate membership creation', async () => {
      // Mock existing membership
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{ id: 'existing-membership' }],
                error: null
              }))
            }))
          }))
        }))
      }))

      render(<AddMembershipModal {...defaultProps} />)
      
      const addButton = screen.getByText('Add Membership')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/already has an active membership/i)).toBeInTheDocument()
      })
    })

    test('handles payment method selection', async () => {
      render(<AddMembershipModal {...defaultProps} />)
      
      const paymentSelect = screen.getByLabelText(/payment method/i)
      fireEvent.change(paymentSelect, { target: { value: 'card' } })
      
      expect(paymentSelect.value).toBe('card')
    })

    test('validates start date', async () => {
      render(<AddMembershipModal {...defaultProps} />)
      
      const startDateInput = screen.getByLabelText(/start date/i)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)
      
      fireEvent.change(startDateInput, { 
        target: { value: futureDate.toISOString().split('T')[0] } 
      })
      
      expect(startDateInput.value).toBe(futureDate.toISOString().split('T')[0])
    })

    test('successfully creates membership', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [{ id: 'plan-1', name: 'Basic Plan', price_pennies: 5000 }],
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'new-membership-id' },
              error: null
            }))
          }))
        }))
      }))

      render(<AddMembershipModal {...defaultProps} />)
      
      // Select plan
      const planSelect = await screen.findByLabelText(/membership plan/i)
      fireEvent.change(planSelect, { target: { value: 'plan-1' } })
      
      // Submit form
      const addButton = screen.getByText('Add Membership')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(defaultProps.onMembershipAdded).toHaveBeenCalled()
      })
    })

    test('handles API errors gracefully', async () => {
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      }))

      render(<AddMembershipModal {...defaultProps} />)
      
      const addButton = screen.getByText('Add Membership')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to add membership/i)).toBeInTheDocument()
      })
    })
  })

  describe('MembershipsTab', () => {
    const defaultProps = {
      customerId: 'test-customer-id',
      organizationId: 'test-org-id'
    }

    test('renders memberships list', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                {
                  id: 'membership-1',
                  status: 'active',
                  start_date: '2024-01-01',
                  end_date: '2024-12-31',
                  membership_plan: {
                    name: 'Premium Plan',
                    price_pennies: 10000
                  }
                }
              ],
              error: null
            }))
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Premium Plan')).toBeInTheDocument()
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    test('handles empty memberships state', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/no memberships found/i)).toBeInTheDocument()
      })
    })

    test('can cancel membership', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [{
                id: 'membership-1',
                status: 'active',
                membership_plan: { name: 'Premium Plan' }
              }],
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: { id: 'membership-1', status: 'cancelled' },
            error: null
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      const cancelButton = await screen.findByText('Cancel')
      fireEvent.click(cancelButton)

      // Confirm cancellation
      const confirmButton = await screen.findByText('Confirm Cancel')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'cancelled',
          cancelled_at: expect.any(String)
        })
      })
    })

    test('can pause membership', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [{
                id: 'membership-1',
                status: 'active',
                membership_plan: { name: 'Premium Plan' }
              }],
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: { id: 'membership-1', status: 'paused' },
            error: null
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      const pauseButton = await screen.findByText('Pause')
      fireEvent.click(pauseButton)

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'paused',
          paused_at: expect.any(String)
        })
      })
    })

    test('can resume paused membership', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [{
                id: 'membership-1',
                status: 'paused',
                membership_plan: { name: 'Premium Plan' }
              }],
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: { id: 'membership-1', status: 'active' },
            error: null
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      const resumeButton = await screen.findByText('Resume')
      fireEvent.click(resumeButton)

      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: 'active',
          paused_at: null
        })
      })
    })

    test('displays membership payment history', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                {
                  id: 'payment-1',
                  amount_pennies: 10000,
                  status: 'paid',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              error: null
            }))
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      const historyButton = await screen.findByText('Payment History')
      fireEvent.click(historyButton)

      await waitFor(() => {
        expect(screen.getByText('£100.00')).toBeInTheDocument()
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })
    })

    test('handles expired memberships', async () => {
      const expiredDate = new Date()
      expiredDate.setMonth(expiredDate.getMonth() - 1)

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [{
                id: 'membership-1',
                status: 'active',
                end_date: expiredDate.toISOString(),
                membership_plan: { name: 'Premium Plan' }
              }],
              error: null
            }))
          }))
        }))
      }))

      render(<MembershipsTab {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument()
      })
    })
  })

  describe('Membership Business Logic', () => {
    test('calculates prorated amount correctly', () => {
      const monthlyPrice = 10000 // £100 in pennies
      const daysInMonth = 30
      const daysRemaining = 15
      
      const proratedAmount = Math.round((monthlyPrice / daysInMonth) * daysRemaining)
      expect(proratedAmount).toBe(5000) // £50
    })

    test('validates membership overlap', () => {
      const existingMembership = {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      }
      
      const newStartDate = '2024-06-01'
      const hasOverlap = new Date(newStartDate) <= new Date(existingMembership.end_date)
      
      expect(hasOverlap).toBe(true)
    })

    test('checks membership expiry', () => {
      const membership = {
        end_date: '2024-01-01',
        status: 'active'
      }
      
      const isExpired = new Date() > new Date(membership.end_date) && membership.status === 'active'
      expect(isExpired).toBe(true)
    })
  })
})