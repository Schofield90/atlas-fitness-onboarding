import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import HomeScreen from '@screens/home/HomeScreen';
import authReducer from '@store/slices/authSlice';
import themeReducer from '@store/slices/themeSlice';
import bookingsReducer from '@store/slices/bookingsSlice';

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      theme: themeReducer,
      bookings: bookingsReducer,
    },
    preloadedState: initialState,
  });
};

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with user data', async () => {
    const mockStore = createMockStore({
      auth: {
        user: {
          id: '1',
          fullName: 'John Doe',
          email: 'john@example.com',
          avatarUrl: null,
        },
        organization: {
          id: '1',
          name: 'Atlas Fitness Downtown',
        },
        membership: {
          id: '1',
          status: 'active',
          membershipPlan: {
            name: 'Premium Monthly',
          },
          startDate: '2024-01-01',
        },
        isAuthenticated: true,
        isLoading: false,
      },
      theme: {
        currentTheme: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          primaryColor: '#007AFF',
          secondaryColor: '#5856D6',
          surfaceColor: '#F2F2F7',
          secondaryTextColor: '#8E8E93',
        },
      },
      bookings: {
        upcomingBookings: [],
        isLoading: false,
      },
    });

    const { getByText } = render(
      <Provider store={mockStore}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Premium Monthly')).toBeTruthy();
      expect(getByText('Check In')).toBeTruthy();
    });
  });

  it('displays greeting based on time of day', async () => {
    const mockDate = new Date('2024-01-01T09:00:00');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const mockStore = createMockStore({
      auth: {
        user: { id: '1', fullName: 'Jane Doe' },
        isAuthenticated: true,
      },
      theme: { currentTheme: {} },
      bookings: { upcomingBookings: [] },
    });

    const { getByText } = render(
      <Provider store={mockStore}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText(/Good morning/)).toBeTruthy();
    });
  });

  it('shows next class when available', async () => {
    const mockStore = createMockStore({
      auth: {
        user: { id: '1' },
        isAuthenticated: true,
      },
      theme: { currentTheme: {} },
      bookings: {
        upcomingBookings: [
          {
            id: '1',
            classId: 'class-1',
            status: 'confirmed',
            class: {
              id: 'class-1',
              startTime: '2024-01-01T18:00:00Z',
              classType: {
                name: 'Yoga Flow',
              },
              instructor: {
                user: {
                  fullName: 'Sarah Johnson',
                },
              },
            },
          },
        ],
      },
    });

    const { getByText } = render(
      <Provider store={mockStore}>
        <NavigationContainer>
          <HomeScreen />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Next Class')).toBeTruthy();
      expect(getByText('Yoga Flow')).toBeTruthy();
      expect(getByText(/Sarah Johnson/)).toBeTruthy();
    });
  });
});