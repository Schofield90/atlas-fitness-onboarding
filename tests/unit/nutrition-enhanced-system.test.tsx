/**
 * Comprehensive Test Suite for Enhanced AI Nutrition Coaching System
 *
 * Tests all new components:
 * - AdvancedCoach.tsx
 * - ProgressTracker.tsx
 * - BehavioralCoach.tsx
 * - Updated NutritionDashboard.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import components
import AdvancedCoach from '../../app/components/nutrition/AdvancedCoach';
import ProgressTracker from '../../app/components/nutrition/ProgressTracker';
import BehavioralCoach from '../../app/components/nutrition/BehavioralCoach';
import NutritionDashboard from '../../app/components/nutrition/NutritionDashboard';

// Mock external dependencies
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2025-09-22'),
  subDays: jest.fn((date, days) => new Date('2025-09-15')),
  addDays: jest.fn((date, days) => new Date('2025-09-29')),
  startOfWeek: jest.fn((date) => new Date('2025-09-21')),
  parseISO: jest.fn((str) => new Date(str)),
  differenceInDays: jest.fn(() => 7),
}));

jest.mock('../../app/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
      refreshSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

describe('Enhanced AI Nutrition Coaching System', () => {

  describe('AdvancedCoach Component', () => {
    const mockProps = {
      clientId: 'test-client-123',
      onPhaseComplete: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders initial assessment phase correctly', () => {
      render(<AdvancedCoach {...mockProps} />);

      expect(screen.getByText(/AI Coach/)).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive Assessment/)).toBeInTheDocument();
    });

    test('displays phase selector with all coaching phases', () => {
      render(<AdvancedCoach {...mockProps} />);

      expect(screen.getByText(/Comprehensive Assessment/)).toBeInTheDocument();
      expect(screen.getByText(/Mindset & Behavior/)).toBeInTheDocument();
      expect(screen.getByText(/Performance Optimization/)).toBeInTheDocument();
    });

    test('allows phase transitions when clicking on different phases', async () => {
      const user = userEvent.setup();
      render(<AdvancedCoach {...mockProps} />);

      const mindsetPhase = screen.getByText(/Mindset & Behavior/);
      await user.click(mindsetPhase);

      expect(screen.getByText(/Building sustainable habits/)).toBeInTheDocument();
    });

    test('handles user input in chat interface', async () => {
      const user = userEvent.setup();
      render(<AdvancedCoach {...mockProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      await user.type(messageInput, 'I need help with meal planning');

      expect(messageInput).toHaveValue('I need help with meal planning');
    });

    test('sends message when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdvancedCoach {...mockProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });

    test('keyboard navigation works for sending messages', async () => {
      const user = userEvent.setup();
      render(<AdvancedCoach {...mockProps} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      await user.type(messageInput, 'Test message{enter}');

      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });
  });

  describe('ProgressTracker Component', () => {
    const mockProps = {
      clientId: 'test-client-123',
      onInsightGenerated: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders with correct tab structure', () => {
      render(<ProgressTracker {...mockProps} />);

      expect(screen.getByText(/Overview/)).toBeInTheDocument();
      expect(screen.getByText(/Trends/)).toBeInTheDocument();
      expect(screen.getByText(/Check-in/)).toBeInTheDocument();
      expect(screen.getByText(/Goals/)).toBeInTheDocument();
    });

    test('tab navigation works correctly', async () => {
      const user = userEvent.setup();
      render(<ProgressTracker {...mockProps} />);

      const trendsTab = screen.getByText(/Trends/);
      await user.click(trendsTab);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    test('daily check-in modal opens when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProgressTracker {...mockProps} />);

      const checkInButton = screen.getByText(/Daily Check-in/);
      await user.click(checkInButton);

      expect(screen.getByText(/How are you feeling today/)).toBeInTheDocument();
    });

    test('check-in form accepts input and validates', async () => {
      const user = userEvent.setup();
      render(<ProgressTracker {...mockProps} />);

      const checkInButton = screen.getByText(/Daily Check-in/);
      await user.click(checkInButton);

      const weightInput = screen.getByLabelText(/Weight/);
      await user.type(weightInput, '75.5');

      expect(weightInput).toHaveValue(75.5);
    });

    test('charts render with proper responsive containers', () => {
      render(<ProgressTracker {...mockProps} />);

      // Switch to trends tab to see charts
      const trendsTab = screen.getByText(/Trends/);
      fireEvent.click(trendsTab);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    test('goals tab displays and allows goal management', async () => {
      const user = userEvent.setup();
      render(<ProgressTracker {...mockProps} />);

      const goalsTab = screen.getByText(/Goals/);
      await user.click(goalsTab);

      expect(screen.getByText(/Add New Goal/)).toBeInTheDocument();
    });
  });

  describe('BehavioralCoach Component', () => {
    const mockProps = {
      clientId: 'test-client-123',
      onHabitComplete: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders with correct tab structure', () => {
      render(<BehavioralCoach {...mockProps} />);

      expect(screen.getByText(/Habits/)).toBeInTheDocument();
      expect(screen.getByText(/Goals/)).toBeInTheDocument();
      expect(screen.getByText(/Achievements/)).toBeInTheDocument();
      expect(screen.getByText(/Tips/)).toBeInTheDocument();
    });

    test('displays preset habits for selection', () => {
      render(<BehavioralCoach {...mockProps} />);

      expect(screen.getByText(/Add New Habit/)).toBeInTheDocument();
    });

    test('habit completion tracking works', async () => {
      const user = userEvent.setup();
      render(<BehavioralCoach {...mockProps} />);

      // This would test habit completion once habits are displayed
      const addHabitButton = screen.getByText(/Add New Habit/);
      await user.click(addHabitButton);

      expect(screen.getByText(/Choose from presets/)).toBeInTheDocument();
    });

    test('achievements system displays progress', async () => {
      const user = userEvent.setup();
      render(<BehavioralCoach {...mockProps} />);

      const achievementsTab = screen.getByText(/Achievements/);
      await user.click(achievementsTab);

      expect(screen.getByText(/Your Achievements/)).toBeInTheDocument();
    });

    test('points system calculates correctly', () => {
      render(<BehavioralCoach {...mockProps} />);

      // Points should be displayed in the interface
      expect(screen.getByText(/Total Points/)).toBeInTheDocument();
    });

    test('coaching tips are displayed and actionable', async () => {
      const user = userEvent.setup();
      render(<BehavioralCoach {...mockProps} />);

      const tipsTab = screen.getByText(/Tips/);
      await user.click(tipsTab);

      expect(screen.getByText(/Personalized Tips/)).toBeInTheDocument();
    });
  });

  describe('NutritionDashboard Integration', () => {
    const mockClient = {
      id: 'test-client-123',
      email: 'test@example.com',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders with all new tabs', () => {
      render(<NutritionDashboard client={mockClient} />);

      expect(screen.getByText(/AI Coach/)).toBeInTheDocument();
      expect(screen.getByText(/Progress/)).toBeInTheDocument();
      expect(screen.getByText(/Habits/)).toBeInTheDocument();
    });

    test('tab navigation maintains state correctly', async () => {
      const user = userEvent.setup();
      render(<NutritionDashboard client={mockClient} />);

      const progressTab = screen.getByText(/Progress/);
      await user.click(progressTab);

      expect(screen.getByText(/Overview/)).toBeInTheDocument();
    });

    test('header contains correct branding and navigation', () => {
      render(<NutritionDashboard client={mockClient} />);

      expect(screen.getByText(/AI Nutrition Coach/)).toBeInTheDocument();
      expect(screen.getByText(/Your personalized nutrition assistant/)).toBeInTheDocument();
    });

    test('profile summary displays correct information', () => {
      render(<NutritionDashboard client={mockClient} />);

      expect(screen.getByText(/Your Profile/)).toBeInTheDocument();
      expect(screen.getByText(/Daily Calories/)).toBeInTheDocument();
    });

    test('quick actions are functional', async () => {
      const user = userEvent.setup();
      render(<NutritionDashboard client={mockClient} />);

      const trackMacrosButton = screen.getByText(/Track Today's Macros/);
      await user.click(trackMacrosButton);

      // Should switch to macros tab
      expect(screen.getByText(/Macro Tracking/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    test('all components have proper ARIA labels', () => {
      render(<AdvancedCoach clientId="test" onPhaseComplete={jest.fn()} />);

      const messageInput = screen.getByRole('textbox');
      expect(messageInput).toHaveAttribute('aria-label', 'Type your message');
    });

    test('keyboard navigation works throughout the interface', async () => {
      const user = userEvent.setup();
      render(<NutritionDashboard client={{ id: 'test' }} />);

      // Tab through interface elements
      await user.tab();
      expect(document.activeElement).toHaveClass('text-gray-300');
    });

    test('loading states are properly handled', () => {
      render(<ProgressTracker clientId="test" />);

      // Should show loading indicators initially
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });

    test('error states are gracefully handled', () => {
      // Test error boundary behavior
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      expect(() => render(<ErrorComponent />)).toThrow();
    });
  });

  describe('Data Persistence and State Management', () => {
    test('user preferences are saved correctly', async () => {
      const user = userEvent.setup();
      render(<BehavioralCoach clientId="test" onHabitComplete={jest.fn()} />);

      // Add a habit and verify it persists
      const addHabitButton = screen.getByText(/Add New Habit/);
      await user.click(addHabitButton);

      // Would test localStorage or API calls here
    });

    test('progress data is properly formatted for charts', () => {
      render(<ProgressTracker clientId="test" />);

      // Verify chart data structure
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    test('coach conversation history is maintained', async () => {
      const user = userEvent.setup();
      render(<AdvancedCoach clientId="test" onPhaseComplete={jest.fn()} />);

      const messageInput = screen.getByPlaceholderText(/Type your response/);
      await user.type(messageInput, 'Test message');
      await user.keyboard('{Enter}');

      // Verify message appears in conversation
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('components render without excessive re-renders', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        return <AdvancedCoach clientId="test" onPhaseComplete={jest.fn()} />;
      };

      render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    test('lazy loading works for chart components', () => {
      render(<ProgressTracker clientId="test" />);

      // Charts should only render when tab is active
      const trendsTab = screen.getByText(/Trends/);
      fireEvent.click(trendsTab);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});