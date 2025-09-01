import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScheduleTriggerConfig } from '@/components/automations/ScheduleTriggerConfig'

// Mock date-fns-tz functions
jest.mock('date-fns-tz', () => ({
  zonedTimeToUtc: jest.fn((dateStr: string) => {
    const [datePart, timePart] = dateStr.split(' ')
    return new Date(`${datePart}T${timePart}:00`)
  }),
  utcToZonedTime: jest.fn((date: Date) => date),
  format: jest.fn(() => 'Jan 16, 2024 at 2:30 PM')
}))

// Mock zod validation schemas
jest.mock('zod', () => {
  const mockSchema = {
    safeParse: jest.fn((data) => ({ 
      success: true, 
      data 
    })),
    refine: jest.fn(() => mockSchema),
    min: jest.fn(() => mockSchema),
    max: jest.fn(() => mockSchema),
    regex: jest.fn(() => mockSchema)
  }
  
  return {
    z: {
      string: jest.fn(() => mockSchema),
      boolean: jest.fn(() => mockSchema),
      literal: jest.fn(() => mockSchema),
      number: jest.fn(() => mockSchema),
      array: jest.fn(() => mockSchema),
      object: jest.fn(() => mockSchema),
      discriminatedUnion: jest.fn(() => mockSchema)
    }
  }
})

describe('ScheduleTriggerConfig', () => {
  const mockOnChange = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders with default values and shows schedule trigger title', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByText('Schedule Trigger')).toBeInTheDocument()
      expect(screen.getByText(/trigger this automation at specific times/i)).toBeInTheDocument()
    })

    it('displays all schedule mode options', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByText('One-time')).toBeInTheDocument()
      expect(screen.getByText('Daily')).toBeInTheDocument()
      expect(screen.getByText('Weekly')).toBeInTheDocument()
    })

    it('shows Europe/London as default timezone', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByText('Europe/London')).toBeInTheDocument()
    })

    it('displays Next Run Preview section', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByText('Next Run Preview')).toBeInTheDocument()
    })

    it('shows catch up and active toggles', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByText('Catch up missed runs')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('Mode Selection', () => {
    it('shows date and time inputs when once mode is selected', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const onceRadio = screen.getByRole('radio', { name: /one-time/i })
      fireEvent.click(onceRadio)
      
      await waitFor(() => {
        expect(screen.getByTestId('schedule-date')).toBeInTheDocument()
        expect(screen.getByTestId('schedule-time')).toBeInTheDocument()
      })
    })

    it('shows only time input when daily mode is selected', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const dailyRadio = screen.getByRole('radio', { name: /daily/i })
      fireEvent.click(dailyRadio)
      
      await waitFor(() => {
        expect(screen.getByTestId('daily-time')).toBeInTheDocument()
        expect(screen.queryByTestId('schedule-date')).not.toBeInTheDocument()
      })
    })

    it('shows day checkboxes and time input when weekly mode is selected', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const weeklyRadio = screen.getByRole('radio', { name: /weekly/i })
      fireEvent.click(weeklyRadio)
      
      await waitFor(() => {
        expect(screen.getByTestId('weekly-time')).toBeInTheDocument()
        expect(screen.getByTestId('day-0')).toBeInTheDocument() // Sunday
        expect(screen.getByTestId('day-1')).toBeInTheDocument() // Monday
        expect(screen.getByTestId('day-6')).toBeInTheDocument() // Saturday
      })
    })
  })

  describe('Weekly Schedule Day Selection', () => {
    it('allows selecting multiple days of the week', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      // Switch to weekly mode
      const weeklyRadio = screen.getByRole('radio', { name: /weekly/i })
      fireEvent.click(weeklyRadio)
      
      await waitFor(() => {
        expect(screen.getByTestId('day-3')).toBeInTheDocument()
      })

      // Select Wednesday
      const wednesdayCheckbox = screen.getByTestId('day-3')
      fireEvent.click(wednesdayCheckbox)
      
      // Select Friday
      const fridayCheckbox = screen.getByTestId('day-5')
      fireEvent.click(fridayCheckbox)
      
      // Verify onChange was called
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('shows day labels correctly', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const weeklyRadio = screen.getByRole('radio', { name: /weekly/i })
      fireEvent.click(weeklyRadio)
      
      await waitFor(() => {
        expect(screen.getByText('Sun')).toBeInTheDocument()
        expect(screen.getByText('Mon')).toBeInTheDocument()
        expect(screen.getByText('Tue')).toBeInTheDocument()
        expect(screen.getByText('Wed')).toBeInTheDocument()
        expect(screen.getByText('Thu')).toBeInTheDocument()
        expect(screen.getByText('Fri')).toBeInTheDocument()
        expect(screen.getByText('Sat')).toBeInTheDocument()
      })
    })
  })

  describe('Form Controls', () => {
    it('calls onChange when date is modified in once mode', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const dateInput = screen.getByTestId('schedule-date')
      fireEvent.change(dateInput, { target: { value: '2024-02-15' } })
      
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('calls onChange when time is modified', async () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const timeInput = screen.getByTestId('schedule-time')
      fireEvent.change(timeInput, { target: { value: '14:30' } })
      
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('toggles catch up option', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const catchUpCheckbox = screen.getByTestId('catch-up')
      fireEvent.click(catchUpCheckbox)
      
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('toggles active option', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      const activeCheckbox = screen.getByTestId('active')
      fireEvent.click(activeCheckbox)
      
      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('Action Buttons', () => {
    it('renders save and cancel buttons when provided', () => {
      render(
        <ScheduleTriggerConfig
          onChange={mockOnChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      expect(screen.getByText('Save Configuration')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('does not render buttons when not provided', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.queryByText('Save Configuration')).not.toBeInTheDocument()
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    })

    it('calls onSave when save button is clicked', () => {
      render(
        <ScheduleTriggerConfig
          onChange={mockOnChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      const saveButton = screen.getByTestId('save-schedule-config')
      fireEvent.click(saveButton)
      
      expect(mockOnSave).toHaveBeenCalled()
    })

    it('calls onCancel when cancel button is clicked', () => {
      render(
        <ScheduleTriggerConfig
          onChange={mockOnChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )
      
      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Configuration with Initial Values', () => {
    it('renders with provided initial weekly configuration', () => {
      const initialValue = {
        mode: 'weekly' as const,
        time: '14:30',
        daysOfWeek: [1, 3, 5],
        tz: 'America/New_York',
        active: false,
        catchUp: true
      }

      render(
        <ScheduleTriggerConfig
          value={initialValue}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument()
      expect(screen.getByDisplayValue('14:30')).toBeInTheDocument()
    })

    it('renders with provided initial once configuration', () => {
      const initialValue = {
        mode: 'once' as const,
        date: '2024-12-25',
        time: '09:00',
        tz: 'America/Los_Angeles',
        active: true,
        catchUp: false
      }

      render(
        <ScheduleTriggerConfig
          value={initialValue}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByDisplayValue('2024-12-25')).toBeInTheDocument()
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('America/Los_Angeles')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByLabelText('One-time')).toBeInTheDocument()
      expect(screen.getByLabelText('Daily')).toBeInTheDocument()
      expect(screen.getByLabelText('Weekly')).toBeInTheDocument()
    })

    it('has proper test IDs for automation', () => {
      render(<ScheduleTriggerConfig onChange={mockOnChange} />)
      
      expect(screen.getByTestId('schedule-mode')).toBeInTheDocument()
      expect(screen.getByTestId('catch-up')).toBeInTheDocument()
      expect(screen.getByTestId('active')).toBeInTheDocument()
    })
  })
})