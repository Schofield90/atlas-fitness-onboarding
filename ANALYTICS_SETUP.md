# Analytics System Setup Guide

## Overview
A complete website analytics system has been implemented for your Next.js website using Supabase for data storage. The system tracks pageviews, clicks, user sessions, devices, referrers, and custom events.

## Important Note
This analytics system is designed to work with the atlas-gyms-website repository (https://github.com/Schofield90/atlas-gyms-website), not the current atlas-fitness-onboarding project. The files have been created here as a reference implementation that you'll need to copy to your atlas-gyms-website project.

## Installation

1. **Install Required Dependencies**:
   ```bash
   npm install recharts zod
   ```

2. **Run Database Migration**:
   - Go to your Supabase SQL Editor
   - Run the migration file: `/supabase/migrations/20250727_analytics_system.sql`
   - This creates the `analytics_events` and `analytics_aggregates` tables with proper indexes and triggers

3. **Set Environment Variables**:
   Add these to your `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADMIN_PASSWORD=atlas2024  # Change this to your preferred password
   ```

## Features

### Analytics Client
- **Automatic Tracking**: Pageviews are tracked automatically on route changes
- **Click Tracking**: Add `data-track="button-name"` to any element to track clicks
- **Custom Events**: Use `analytics.trackCustomEvent('event-name', { metadata })`
- **Scroll Depth**: Automatically tracks 25%, 50%, 75%, and 100% scroll depth
- **Device Detection**: Tracks device type, browser, OS, screen resolution
- **Session Management**: 30-minute session timeout with persistent visitor IDs
- **Offline Support**: Events are queued in localStorage when offline
- **Bot Filtering**: Automatically filters out bot traffic

### Analytics Dashboard
- **URL**: `/analytics-dashboard`
- **Default Password**: `atlas2024` (change in environment variables)
- **Date Ranges**: 24h, 7d, 30d, 90d
- **Real-time Updates**: Auto-refreshes every 30 seconds
- **Export**: Download analytics data as CSV

### Dashboard Features
1. **Overview Tab**:
   - Traffic trends (area chart)
   - Hourly pattern (line chart)
   - Top pages with view counts

2. **Traffic Sources Tab**:
   - Device breakdown (pie chart)
   - Top referrers list
   - Browser distribution (bar chart)

3. **Engagement Tab**:
   - Click heatmap (horizontal bar chart)
   - Scroll depth analysis
   - Exit pages with rates

4. **Real-time Tab**:
   - Active users count
   - Current pages being viewed
   - Live event stream

5. **Behavior Tab**:
   - User flow visualization (placeholder)
   - Session insights

## Usage Examples

### Track Button Clicks
```jsx
<button data-track="cta-button">
  Get Started
</button>
```

### Track Custom Events
```jsx
import { analytics } from '@/app/lib/analytics/client';

// Track form submission
analytics.trackFormSubmit('contact-form', {
  fields: ['name', 'email']
});

// Track conversion
analytics.trackCustomEvent('conversion', {
  value: 99.99,
  product: 'premium-plan'
});
```

### Manual Page View Tracking
```jsx
import { analytics } from '@/app/lib/analytics/client';

// Track a virtual pageview
analytics.trackPageView('/virtual/thank-you');
```

## File Structure
```
/app
  /lib/analytics/
    client.ts           # Analytics client singleton
    supabase-storage.ts # Supabase data layer
    types.ts           # TypeScript types
  /components/analytics/
    provider.tsx       # Analytics context provider
  /api/analytics/
    track/route.ts     # Event ingestion endpoint
    dashboard/route.ts # Dashboard data endpoint
    realtime/route.ts  # Real-time metrics endpoint
  /analytics-dashboard/
    page.tsx          # Analytics dashboard UI
/supabase/migrations/
  20250727_analytics_system.sql # Database schema
```

## Performance Optimizations
- **Event Batching**: Groups events (10 events or 5 seconds)
- **Beacon API**: Ensures delivery on page unload
- **Aggregation Tables**: Pre-computed metrics for fast queries
- **Database Indexes**: Optimized for common queries
- **Bot Filtering**: Reduces unnecessary data storage

## Security
- **Password Protected**: Dashboard requires authentication
- **Row Level Security**: Database policies protect data
- **Server-side Validation**: All events are validated with Zod
- **Service Role Key**: Used only server-side for data access

## Troubleshooting

1. **No data showing in dashboard**:
   - Check if migration was run successfully
   - Verify environment variables are set
   - Look for errors in browser console
   - Ensure analytics provider is wrapped around your app

2. **Events not tracking**:
   - Check if bot detection is filtering your user agent
   - Verify Supabase connection is working
   - Look at Network tab for failed requests

3. **Dashboard login issues**:
   - Verify ADMIN_PASSWORD is set correctly
   - Clear localStorage and try again
   - Check API route responses

## Next Steps
1. Customize the dashboard password
2. Add more custom event tracking
3. Set up alerts for anomalies
4. Create custom reports
5. Implement data retention policies