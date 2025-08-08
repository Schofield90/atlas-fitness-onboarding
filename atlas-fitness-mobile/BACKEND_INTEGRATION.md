# Mobile App Backend Integration Guide

This guide explains how to connect the Atlas Fitness mobile app to the Supabase backend.

## Quick Start

1. **Run Backend Setup**
   ```bash
   cd ../
   ./scripts/setup-mobile-backend.sh
   ```

2. **Configure Mobile App**
   ```bash
   cd atlas-fitness-mobile
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Install Dependencies & Run**
   ```bash
   npm install
   npm start
   ```

## Backend Architecture

### Database Schema

The mobile app uses these main tables:

- **clients** - Member profiles
- **member_preferences** - Notification and app preferences
- **member_devices** - Push notification tokens
- **qr_tokens** - Temporary check-in tokens
- **member_check_ins** - Check-in history
- **bookings** - Class bookings
- **class_sessions** - Available classes
- **memberships** - Active membership plans
- **class_credits** - Class pack credits
- **member_notifications** - In-app notifications
- **member_message_threads** - Support conversations

### Edge Functions

All mobile API calls go through Edge Functions for security and performance:

1. **mobile-api** - Main API endpoint handling all mobile requests
2. **send-push-notification** - Sends push notifications via Expo
3. **qr-check-in** - Processes QR code check-ins
4. **mobile-stripe-checkout** - Handles payment processing

### API Endpoints

Base URL: `https://YOUR_PROJECT.supabase.co/functions/v1/mobile-api`

#### Authentication Required
All endpoints except `/org/by-slug` require:
- `Authorization: Bearer YOUR_JWT_TOKEN`
- `X-Organization-Id: ORG_UUID`

#### Available Endpoints

```typescript
// Organization
GET  /org/by-slug?slug={slug}

// User Profile
GET  /me
POST /device (register for push)

// Schedule & Bookings  
GET  /schedule?from={date}&to={date}
POST /bookings
DELETE /bookings/{id}
GET  /bookings/my
POST /waitlist

// Check-in
GET  /qr-token
POST /check-in (via qr-check-in function)

// Settings
GET  /settings
POST /settings

// Stats
GET  /stats

// Messaging
GET  /messages
POST /messages
```

## Mobile App Configuration

### 1. Environment Variables

Create `.env` in the mobile app root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Optional
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_key
```

### 2. Update API Client

The API client is already configured in `src/config/supabase.ts`. Just ensure your env vars are set.

### 3. Deep Linking

Configure deep links for:
- Organization invites: `atlas-fitness://join/{orgSlug}`
- Magic links: `atlas-fitness://auth/magic-link?token={token}`
- Payment returns: `atlas-fitness://payment/success`

Update `app.json`:
```json
{
  "expo": {
    "scheme": "atlas-fitness",
    "ios": {
      "associatedDomains": ["applinks:your-domain.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{
            "scheme": "atlas-fitness",
            "host": "join"
          }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Testing the Integration

### 1. Test Organization Resolution
```bash
# Get org details
curl https://YOUR_PROJECT.supabase.co/functions/v1/mobile-api/org/by-slug?slug=atlas-london \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 2. Test Authentication
1. Open the app
2. Enter org code or use invite link
3. Sign in with magic link
4. Verify profile loads

### 3. Test Core Features

#### Bookings
1. Browse schedule
2. Book a class
3. Check "My Bookings"
4. Cancel booking

#### Check-in
1. Go to Home tab
2. View QR code
3. Verify it refreshes every 30s

#### Push Notifications
1. Enable notifications in settings
2. Book a class
3. Should receive reminder 2 hours before

## Troubleshooting

### Common Issues

1. **"Organization not found"**
   - Check org slug is correct
   - Verify organization exists in database

2. **"Unauthorized" errors**
   - Check JWT token is valid
   - Verify X-Organization-Id header is sent
   - Ensure user belongs to organization

3. **Push notifications not working**
   - Verify device token is saved
   - Check notification preferences
   - Ensure push certificates are configured

4. **QR code not scanning**
   - Check camera permissions
   - Verify QR token is not expired
   - Ensure check-in window is valid

### Debug Mode

Enable debug logging:
```typescript
// In App.tsx
if (__DEV__) {
  console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  // Enable Supabase debug mode
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, session);
  });
}
```

### View Logs

```bash
# Edge function logs
supabase functions logs mobile-api --tail

# Database logs
supabase db logs --tail
```

## Production Deployment

### 1. Build for Stores
```bash
# iOS
eas build --platform ios --profile production

# Android  
eas build --platform android --profile production
```

### 2. Configure Push Notifications

#### iOS
1. Upload APNs certificates to Supabase Dashboard
2. Configure in `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["remote-notification"]
    }
  }
}
```

#### Android
1. Add FCM server key to Expo credentials
2. Configure in `app.json`:
```json
{
  "android": {
    "useNextNotificationsApi": true,
    "googleServicesFile": "./google-services.json"
  }
}
```

### 3. Submit to Stores
```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

## Security Best Practices

1. **Never expose service role key** - Only use anon key in mobile app
2. **Validate org membership** - Always check user belongs to org
3. **Use RLS policies** - Database security at row level
4. **Rotate tokens** - QR tokens expire after 60 seconds
5. **Sanitize inputs** - Validate all user inputs
6. **HTTPS only** - All API calls over HTTPS
7. **Certificate pinning** - For extra security (optional)

## Performance Optimization

1. **Cache aggressively** - 14-day schedule cache
2. **Paginate lists** - Load bookings in batches
3. **Optimize images** - Use Supabase Storage transforms
4. **Lazy load** - Load screens on demand
5. **Background sync** - Sync data when app is idle

## Monitoring

1. **Sentry** - Error tracking and performance
2. **PostHog** - User analytics and funnels
3. **Supabase Dashboard** - Database metrics
4. **Edge Function Metrics** - API performance

## Support

For issues:
1. Check logs in Supabase Dashboard
2. Review error details in Sentry
3. Check GitHub issues
4. Contact support@atlas-fitness.com