import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassCalendarPage from '@/app/class-calendar/page';

// Mock supabase organization lookup to avoid redirects
jest.mock('@/app/lib/organization-service', () => ({
  getCurrentUserOrganization: () => Promise.resolve({ organizationId: 'test-org', error: null })
}));

// Mock fetch for classes API
const mockClasses = {
  classes: [
    {
      id: 'cls_1',
      start_time: new Date().toISOString(),
      program: { name: 'Power Yoga', price_pennies: 1200 },
      instructor_name: 'Jamie Instructor',
      duration_minutes: 60,
      bookings: [],
      capacity: 12,
      location: 'Studio A'
    }
  ]
};

describe('Class Calendar selection', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClasses
    } as any);
  });

  it('updates the side panel when a class is clicked', async () => {
    render(<ClassCalendarPage />);

    // Wait for the class to render in the grid
    const block = await screen.findByTestId(/class-block-/);
    expect(block).toBeInTheDocument();

    // Initially, panel shows No Class Selected
    expect(screen.getAllByTestId('selected-class-panel')[0]).toHaveTextContent('No Class Selected');

    // Click the class block
    fireEvent.click(block);

    // After click, title should appear
    const title = await screen.findByTestId('selected-class-title');
    expect(title).toHaveTextContent('Power Yoga');
  });
});

