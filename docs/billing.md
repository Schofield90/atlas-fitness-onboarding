# Billing Module Guide

The billing module provides graceful fallback functionality when API errors occur, ensuring users always see meaningful information rather than technical error messages.

## Quick Start

Navigate to `/billing` to access the billing dashboard with subscription management, revenue tracking, and payment settings.

## Graceful Fallback System

### How Fallbacks Work

The billing module implements intelligent fallbacks when API calls fail:

1. **Primary Flow**: Attempts to fetch organization data from Supabase
2. **Fallback Flow**: On failure, switches to demo data in development environments
3. **Error Flow**: Shows user-friendly error page with retry functionality

### Demo Data Mode

When enabled via feature flags, the system provides mock billing data:

```typescript
{
  id: 'mock-org-id',
  name: 'Demo Gym',
  subscription_status: 'trial',
  plan_name: 'Free Trial'
}
```

**Visual Indicator**: A yellow "Demo Data" badge appears when using fallback data.

## Feature Flags

### `billingMswStub` 
- **Default**: `true` 
- **Purpose**: Enables MSW stub support for development
- **Effect**: Shows demo data when API fails in development mode

### `billingRetryButton`
- **Default**: `true`
- **Purpose**: Controls retry functionality visibility
- **Effect**: Shows "Try Again" button on error states

## User Experience

### Loading States
- Animated spinner with contextual message
- Full-screen loading overlay with billing icon
- Clear indication that data is being fetched

### Error States
- Friendly error message: "Unable to Load Billing Information"
- Explanation: "We couldn't fetch your billing details right now"
- Action button: "Try Again" (when feature flag enabled)
- Support contact: Direct link to support@atlasfitness.com

### Success States
- Tab-based navigation: Subscription, Revenue, Payment Settings
- Real-time toast notifications for checkout success/failure
- Visual feedback for Stripe Connect integration status

## What to Expect

### In Development
- API failures automatically show demo data
- Toast notification: "Using demo data - no live billing API connection"
- Yellow demo badge visible in header
- All functionality works with mock data

### In Production
- API failures show retry option and support contact
- No demo data fallback (security consideration)
- Real billing data integration with Stripe
- Full payment processing capabilities

## Configuration

### Environment Variables
- `NODE_ENV=development`: Enables demo data fallbacks
- `NEXT_PUBLIC_FEATURE_BILLING_MSW_STUB=true`: Force enable MSW stubs
- `NEXT_PUBLIC_FEATURE_BILLING_RETRY=true`: Force enable retry button

### Toast Notifications
Billing module provides feedback for:
- API connection issues
- Checkout success/failure
- Stripe Connect status
- Demo data usage warnings

## Troubleshooting

### "Unable to Load Billing Information" Error
1. Click "Try Again" button
2. Check network connection
3. Verify organization access permissions
4. Contact support if issues persist

### Demo Data Showing in Production
- Check `NODE_ENV` environment variable
- Verify `billingMswStub` feature flag is disabled
- Ensure proper Supabase configuration

### Missing Retry Button
- Verify `billingRetryButton` feature flag is enabled
- Check error state rendering logic
- Confirm user has proper permissions