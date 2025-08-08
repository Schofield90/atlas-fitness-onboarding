# Atlas Fitness Mobile App

A production-ready React Native + Expo mobile application for gym members with multi-tenant support.

## Features

### Core Features
- 🔐 **Multi-tenant Authentication**: Magic link, Apple Sign In, and Google OAuth
- 🏢 **Organization Management**: Dynamic theming and gym selection
- 📱 **QR Code Check-in**: Scan or display QR codes for gym access
- 📅 **Class Scheduling**: Browse, book, and manage fitness classes
- 💳 **Membership Management**: View status, manage payments via Stripe
- 💬 **Messaging System**: Direct messaging with instructors and support
- 🔔 **Push Notifications**: Class reminders and important updates
- 📴 **Offline Support**: Queue actions when offline, sync when connected
- 🎨 **Dynamic Theming**: Automatic light/dark mode with org branding

### Technical Features
- TypeScript for type safety
- Redux Toolkit for state management
- React Query for server state
- Supabase for backend services
- Expo for cross-platform development
- Detox for E2E testing
- Sentry for error monitoring
- Offline-first architecture

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/atlas-fitness-mobile.git
cd atlas-fitness-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
# ... other variables
```

## Development

### Start the development server:
```bash
npm start
```

### Run on specific platforms:
```bash
npm run ios     # iOS Simulator
npm run android # Android Emulator
```

### Type checking:
```bash
npm run type-check
```

### Linting:
```bash
npm run lint
```

### Format code:
```bash
npm run format
```

## Testing

### Unit Tests
```bash
npm test                # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### E2E Tests
```bash
# iOS
npm run detox:build:ios
npm run detox:test:ios

# Android
npm run detox:build:android
npm run detox:test:android
```

## Project Structure

```
atlas-fitness-mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation setup
│   ├── store/          # Redux store and slices
│   ├── services/       # API services
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   └── config/         # App configuration
├── assets/             # Images, fonts, animations
├── e2e/               # E2E test files
└── __tests__/         # Unit test files
```

## Architecture

### State Management
- **Redux Toolkit**: Global app state (auth, theme, offline queue)
- **React Query**: Server state and caching
- **Redux Persist**: Offline persistence

### Authentication Flow
1. User enters email for magic link
2. OTP verification
3. Organization selection
4. Profile completion
5. Main app access

### Offline Support
- Actions queued when offline
- Automatic sync when connection restored
- Conflict resolution for concurrent updates
- Local data caching

### Multi-tenant Architecture
- Organization-specific theming
- Feature flags per organization
- Isolated data contexts
- Dynamic branding

## Building for Production

### iOS
1. Configure certificates in Apple Developer Console
2. Update `app.json` with production values
3. Build with EAS:
```bash
eas build --platform ios
```

### Android
1. Generate keystore
2. Configure in `app.json`
3. Build with EAS:
```bash
eas build --platform android
```

## Deployment

### Over-the-Air Updates
```bash
eas update --branch production
```

### App Store Submission
```bash
eas submit --platform ios
```

### Google Play Submission
```bash
eas submit --platform android
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| EXPO_PUBLIC_SUPABASE_URL | Supabase project URL | Yes |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe public key | Yes |
| EXPO_PUBLIC_SENTRY_DSN | Sentry DSN for error tracking | No |
| EXPO_PUBLIC_ONESIGNAL_APP_ID | OneSignal app ID | No |

## Security Considerations

- Sensitive data stored in Expo SecureStore
- API keys use anonymous Supabase key
- Row Level Security (RLS) enforced
- Certificate pinning for production
- Biometric authentication support

## Performance Optimization

- Image caching with expo-image
- Lazy loading for screens
- Memoization for expensive computations
- Virtual lists for large datasets
- Bundle splitting and tree shaking

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
```bash
npx expo start --clear
```

2. **iOS build errors**:
```bash
cd ios && pod install
```

3. **Android build errors**:
```bash
cd android && ./gradlew clean
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email support@atlasfitness.com or join our Slack channel.