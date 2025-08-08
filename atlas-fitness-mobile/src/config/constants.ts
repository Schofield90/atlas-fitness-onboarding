export const Constants = {
  // API Configuration
  API: {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // Auth Configuration
  AUTH: {
    TOKEN_KEY: '@atlas_fitness_token',
    REFRESH_TOKEN_KEY: '@atlas_fitness_refresh_token',
    USER_KEY: '@atlas_fitness_user',
    ORG_KEY: '@atlas_fitness_org',
    MAGIC_LINK_EXPIRY: 600000, // 10 minutes
  },

  // Storage Keys
  STORAGE: {
    THEME_KEY: '@atlas_fitness_theme',
    LANGUAGE_KEY: '@atlas_fitness_language',
    NOTIFICATIONS_KEY: '@atlas_fitness_notifications',
    OFFLINE_QUEUE: '@atlas_fitness_offline_queue',
    CACHED_DATA: '@atlas_fitness_cached_data',
  },

  // UI Configuration
  UI: {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    PULL_TO_REFRESH_THRESHOLD: 100,
    PAGINATION_SIZE: 20,
  },

  // Class Booking
  BOOKING: {
    CANCELLATION_WINDOW: 3600000, // 1 hour before class
    CHECK_IN_WINDOW: 900000, // 15 minutes before class
    WAITLIST_AUTO_ENROLL: true,
  },

  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: 300000, // 5 minutes
    USER_DATA_TTL: 600000, // 10 minutes
    CLASS_SCHEDULE_TTL: 180000, // 3 minutes
    MEMBERSHIP_TTL: 3600000, // 1 hour
  },

  // Push Notifications
  NOTIFICATIONS: {
    CLASS_REMINDER_OFFSET: 3600000, // 1 hour before
    MEMBERSHIP_EXPIRY_WARNING: 604800000, // 7 days before
  },

  // QR Code
  QR_CODE: {
    SIZE: 200,
    MARGIN: 20,
    SCAN_INTERVAL: 1000,
  },

  // Validation
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 50,
    PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Error Messages
  ERRORS: {
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Please sign in to continue.',
    SERVER: 'Something went wrong. Please try again.',
    VALIDATION: 'Please check your input and try again.',
    NOT_FOUND: 'The requested resource was not found.',
    PERMISSION: 'You do not have permission to perform this action.',
  },

  // Success Messages
  SUCCESS: {
    BOOKING_CONFIRMED: 'Class booked successfully!',
    BOOKING_CANCELLED: 'Booking cancelled successfully.',
    CHECK_IN: 'Check-in successful! Enjoy your workout!',
    PROFILE_UPDATED: 'Profile updated successfully.',
    PASSWORD_CHANGED: 'Password changed successfully.',
    PAYMENT_METHOD_ADDED: 'Payment method added successfully.',
  },

  // Default Theme
  DEFAULT_THEME: {
    primaryColor: '#1a1a1a',
    secondaryColor: '#2563eb',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    surfaceColor: '#f3f4f6',
    textColor: '#111827',
    secondaryTextColor: '#6b7280',
    borderColor: '#e5e7eb',
    errorColor: '#ef4444',
    successColor: '#10b981',
    warningColor: '#f59e0b',
  },

  // Dark Theme
  DARK_THEME: {
    primaryColor: '#ffffff',
    secondaryColor: '#3b82f6',
    accentColor: '#fbbf24',
    backgroundColor: '#0f0f0f',
    surfaceColor: '#1a1a1a',
    textColor: '#f9fafb',
    secondaryTextColor: '#9ca3af',
    borderColor: '#374151',
    errorColor: '#f87171',
    successColor: '#34d399',
    warningColor: '#fbbf24',
  },
};