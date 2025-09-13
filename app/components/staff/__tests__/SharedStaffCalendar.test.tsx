/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharedStaffCalendar, { StaffProfile, StaffCalendarBooking } from '../SharedStaffCalendar';
import { createClient } from '@/app/lib/supabase/client';

// Mock Supabase
jest.mock('@/app/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

// Mock date-fns to control dates in tests
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn(),
  startOfWeek: jest.fn(),
  endOfWeek: jest.fn(),
  startOfDay: jest.fn(),
  endOfDay: jest.fn(),
  addDays: jest.fn(),
  isSameDay: jest.fn(),
  parseISO: jest.fn(),
  addMinutes: jest.fn()
}));

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          not: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: null,
      error: null
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  })),
  rpc: jest.fn(() => ({
    data: [],
    error: null
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn()
    }))
  })),
  removeChannel: jest.fn()
};

const mockStaffMembers: StaffProfile[] = [
  {
    id: 'staff-1',
    first_name: 'John',
    last_name: 'Doe',
    job_position: 'Personal Trainer',
    organization_id: 'org-1'
  },
  {
    id: 'staff-2',
    first_name: 'Jane',
    last_name: 'Smith',
    job_position: 'Fitness Instructor',
    organization_id: 'org-1'
  }
];

const mockBookings: StaffCalendarBooking[] = [
  {
    id: 'booking-1',
    organization_id: 'org-1',
    title: 'PT Session with Client A',
    booking_type: 'pt_session_121',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T11:00:00Z',
    timezone: 'Europe/London',
    is_all_day: false,
    assigned_staff_id: 'staff-1',
    created_by_staff_id: 'staff-1',
    max_capacity: 1,
    current_bookings: 1,
    status: 'confirmed',
    is_available_for_booking: false,
    booking_deadline_hours: 24,
    requires_payment: true,
    price_pennies: 5000,
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z'
  }
];

describe('SharedStaffCalendar', () => {
  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default return values
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockStaffMembers,
            error: null
          }),
          single: jest.fn().mockResolvedValue({
            data: mockStaffMembers[0],
            error: null
          })
        }),
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockBookings,
                error: null
              })
            })
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    });
  });

  it('renders calendar with loading state initially', async () => {
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('renders calendar header with navigation controls', async () => {
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Check for navigation buttons
    expect(screen.getByTitle('Previous')).toBeInTheDocument();
    expect(screen.getByTitle('Next')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    
    // Check for view toggle buttons
    expect(screen.getByText('day')).toBeInTheDocument();
    expect(screen.getByText('week')).toBeInTheDocument();
    expect(screen.getByText('month')).toBeInTheDocument();
  });

  it('switches between different calendar views', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
        initialView="week"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Should start in week view
    expect(screen.getByText('week')).toHaveClass('bg-blue-600');

    // Switch to day view
    await user.click(screen.getByText('day'));
    expect(screen.getByText('day')).toHaveClass('bg-blue-600');

    // Switch to month view
    await user.click(screen.getByText('month'));
    expect(screen.getByText('month')).toHaveClass('bg-blue-600');
  });

  it('opens booking modal when clicking empty time slot', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Find an empty time slot and click it
    const timeSlots = screen.getAllByRole('button', { hidden: true });
    const emptySlot = timeSlots.find(slot => 
      slot.classList.contains('cursor-pointer') && 
      slot.classList.contains('hover:bg-gray-700/20')
    );

    if (emptySlot) {
      await user.click(emptySlot);
      
      await waitFor(() => {
        expect(screen.getByText('New Booking')).toBeInTheDocument();
      });
    }
  });

  it('opens filters panel when clicking filters button', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Click filters button
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    await waitFor(() => {
      expect(screen.getByText('Staff Members')).toBeInTheDocument();
      expect(screen.getByText('Booking Types')).toBeInTheDocument();
    });
  });

  it('creates new booking when form is submitted', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Open booking modal by clicking Add Booking button
    const addButton = screen.getByText('Add Booking');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('New Booking')).toBeInTheDocument();
    });

    // Fill in booking details
    const titleInput = screen.getByPlaceholderText('Enter booking title');
    await user.type(titleInput, 'Test Booking');

    // Submit form
    const createButton = screen.getByText('Create Booking');
    await user.click(createButton);

    // Verify insert was called
    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff_calendar_bookings');
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
        initialView="week"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Test view switching with keyboard
    await user.keyboard('d');
    expect(screen.getByText('day')).toHaveClass('bg-blue-600');

    await user.keyboard('w');
    expect(screen.getByText('week')).toHaveClass('bg-blue-600');

    await user.keyboard('m');
    expect(screen.getByText('month')).toHaveClass('bg-blue-600');

    // Test opening new booking modal
    await user.keyboard('n');
    await waitFor(() => {
      expect(screen.getByText('New Booking')).toBeInTheDocument();
    });
  });

  it('displays error state when data loading fails', async () => {
    // Mock error response
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Network error')
                })
              })
            })
          })
        })
      })
    });

    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Calendar')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('filters bookings by staff member', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Open filters
    await user.click(screen.getByText('Filters'));

    // Select a staff member filter
    const johnCheckbox = screen.getByLabelText(/John Doe/);
    await user.click(johnCheckbox);

    // Apply filters
    const applyButton = screen.getByText('Apply');
    await user.click(applyButton);

    // Verify filter is active
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles real-time subscription setup', () => {
    const mockChannel = {
      on: jest.fn().mockReturnValue({
        subscribe: jest.fn()
      })
    };
    
    mockSupabaseClient.channel.mockReturnValue(mockChannel);

    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('staff_calendar_changes');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'staff_calendar_bookings'
      }),
      expect.any(Function)
    );
  });

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SharedStaffCalendar 
        organizationId="org-1" 
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Open filters and select some filters
    await user.click(screen.getByText('Filters'));
    const johnCheckbox = screen.getByLabelText(/John Doe/);
    await user.click(johnCheckbox);
    await user.click(screen.getByText('Apply'));

    // Verify filter is active
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Clear filters
    await user.click(screen.getByText('Clear all'));

    // Verify filters are cleared
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});

// Test utilities
export const createMockBooking = (overrides: Partial<StaffCalendarBooking> = {}): StaffCalendarBooking => ({
  id: 'booking-1',
  organization_id: 'org-1',
  title: 'Test Booking',
  booking_type: 'pt_session_121',
  start_time: '2024-01-15T10:00:00Z',
  end_time: '2024-01-15T11:00:00Z',
  timezone: 'Europe/London',
  is_all_day: false,
  assigned_staff_id: 'staff-1',
  created_by_staff_id: 'staff-1',
  max_capacity: 1,
  current_bookings: 0,
  status: 'confirmed',
  is_available_for_booking: true,
  booking_deadline_hours: 24,
  requires_payment: false,
  price_pennies: 0,
  created_at: '2024-01-14T10:00:00Z',
  updated_at: '2024-01-14T10:00:00Z',
  ...overrides
});

export const createMockStaff = (overrides: Partial<StaffProfile> = {}): StaffProfile => ({
  id: 'staff-1',
  first_name: 'Test',
  last_name: 'Staff',
  organization_id: 'org-1',
  ...overrides
});