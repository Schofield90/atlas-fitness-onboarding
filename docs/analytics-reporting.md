# Analytics & Reporting Guide

The analytics module provides comprehensive analytics dashboards with feature flag controls and beta access management.

## Quick Start

Navigate to `/analytics` for basic analytics or `/analytics-dashboard` for the advanced password-protected beta dashboard.

## Feature Flag Controls

### `advancedAnalytics`
- **Default**: `false`
- **Purpose**: Controls access to advanced analytics features
- **Effect**: When disabled, shows "Analytics features coming soon..." placeholder

### `customReports`
- **Default**: `false`
- **Purpose**: Controls custom reporting functionality
- **Effect**: Gates report generation and customization features

### `betaAnalytics`
- **Default**: `false`
- **Purpose**: Controls access to beta analytics dashboard
- **Effect**: When disabled, shows access request or waitlist functionality

## Beta Dashboard System

### Password Authentication
The analytics dashboard implements a secure authentication system:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  
  try {
    const response = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
      headers: {
        'Authorization': `Bearer ${password}`
      }
    });
    
    if (response.ok) {
      localStorage.setItem('dashboardToken', password);
      setAuthenticated(true);
      const analyticsData = await response.json();
      setData(analyticsData);
    } else {
      setError('Invalid password');
    }
  } catch (error) {
    setError('Failed to authenticate');
  }
};
```

### Session Management
- **Token Storage**: Uses localStorage to persist authentication
- **Auto-authentication**: Checks for existing token on page load
- **Session Timeout**: Handles 401 responses by clearing tokens
- **Logout Functionality**: Complete session cleanup

## Dashboard Features

### Real-time Analytics
- **Active Users**: Live count of current website visitors
- **Real-time Updates**: 30-second refresh intervals for live data
- **Event Stream**: Real-time display of user interactions
- **Current Pages**: Live view of active pages with user counts

### Key Metrics
- **Page Views**: Total and unique page view counts
- **Unique Visitors**: Distinct user tracking
- **Total Clicks**: Click event aggregation
- **Average Session Duration**: Time-based engagement metrics
- **Bounce Rate**: Single-page session percentage
- **Conversion Rate**: Goal completion tracking

### Traffic Analysis
- **Device Breakdown**: Mobile, desktop, tablet usage patterns
- **Browser Distribution**: Browser type and version analytics
- **Top Referrers**: Traffic source analysis
- **Geographic Distribution**: Location-based visitor insights

### Engagement Metrics
- **Click Heatmap**: Visual representation of click patterns
- **Scroll Depth Analysis**: User engagement depth measurement
- **Exit Pages**: Pages where users commonly leave
- **User Journey Flow**: Path analysis through site

### Data Export
```typescript
const exportData = () => {
  if (!data) return;
  
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${dateRange}-${new Date().toISOString()}.csv`;
  a.click();
};
```

## Data Visualization

### Chart Types
- **Area Charts**: Trend visualization for traffic patterns
- **Line Charts**: Hourly traffic pattern analysis
- **Bar Charts**: Browser distribution and click targets
- **Pie Charts**: Device breakdown and traffic sources

### Interactive Features
- **Metric Switching**: Toggle between page views, visitors, and clicks
- **Date Range Selection**: 24h, 7d, 30d, 90d options
- **Tab Navigation**: Organized view of different analytics categories
- **Responsive Design**: Mobile-optimized dashboard interface

## Tab Structure

### Overview Tab
- **Traffic Trends**: Interactive area chart with metric selection
- **Hourly Patterns**: Peak usage time identification
- **Top Pages**: Most visited content with engagement metrics
- **Key Performance Indicators**: Primary metric cards

### Traffic Tab
- **Device Analytics**: Mobile vs desktop usage patterns
- **Referrer Analysis**: Traffic source breakdown
- **Browser Statistics**: Browser type and version data
- **Geographic Insights**: Visitor location analysis

### Engagement Tab
- **Click Analysis**: Interaction heatmaps and target identification
- **Scroll Behavior**: Content engagement depth measurement
- **Exit Analysis**: Common departure points
- **User Flow**: Navigation pattern visualization

### Realtime Tab
- **Live Activity**: Current active users and pages
- **Event Stream**: Real-time user action feed
- **Active Sessions**: Current user session details
- **Live Metrics**: Up-to-the-minute statistics

### Behavior Tab
- **User Journey**: Flow visualization (coming soon)
- **Session Recordings**: User interaction replay (planned)
- **Heatmap Integration**: Visual interaction analysis (planned)

## What to Expect

### When Beta Analytics Enabled
- **Full Dashboard Access**: Complete analytics suite with real-time data
- **Advanced Visualizations**: Interactive charts and detailed reports
- **Export Capabilities**: CSV download for further analysis
- **Real-time Updates**: Live data refresh every 30 seconds

### When Beta Analytics Disabled
- **Basic Analytics**: Simple "coming soon" placeholder page
- **Feature Request**: Option to request beta access
- **Waitlist Integration**: Early access signup functionality
- **Professional Messaging**: Clear communication about availability

### Coming Soon Features
- **Custom Dashboards**: User-configurable metric displays
- **Advanced Segmentation**: Detailed user group analysis
- **A/B Testing Integration**: Experiment result tracking
- **API Access**: Programmatic analytics data access
- **Automated Reports**: Scheduled report generation and delivery

## API Endpoints

### Dashboard Data
- `GET /api/analytics/dashboard?range={period}`: Main analytics data
- `GET /api/analytics/realtime`: Live metrics and event stream
- Authentication via `Authorization: Bearer {token}` header

### Data Structure
```typescript
interface AnalyticsData {
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    totalClicks: number;
    avgSessionDuration: string;
    bounceRate: number;
    conversionRate: number;
  };
  trends: {
    daily: Array<{date: string, pageviews: number, visitors: number, clicks: number}>;
    hourly: Array<{hour: string, visits: number}>;
  };
  traffic: {
    topPages: Array<{path: string, views: number, avgTime: string}>;
    deviceBreakdown: Array<{device: string, count: number, percentage: number}>;
    browserBreakdown: Array<{browser: string, count: number}>;
    topReferrers: Array<{referrer: string, count: number, percentage: number}>;
  };
  engagement: {
    clickTargets: Array<{target: string, count: number}>;
    scrollDepth: Array<{depth: string, percentage: number}>;
    exitPages: Array<{path: string, exits: number, rate: number}>;
  };
  realtime: {
    activeUsers: number;
    currentPages: Array<{path: string, users: number}>;
    recentEvents: Array<{type: string, path: string, device: string, timestamp: string}>;
  };
}
```

## Troubleshooting

### Authentication Issues
1. Verify correct password is being used
2. Check network connectivity to API endpoints
3. Clear localStorage and try logging in again
4. Ensure API authentication endpoints are available

### Data Not Loading
1. Check authentication token validity
2. Verify API endpoints are responding correctly
3. Check browser console for JavaScript errors
4. Ensure proper data structure is being returned

### Real-time Updates Not Working
1. Verify websocket or polling connection is active
2. Check 30-second refresh interval is functioning
3. Ensure realtime API endpoint is available
4. Check for network connectivity issues

### Export Functionality Failing
1. Verify data is properly loaded before export
2. Check CSV conversion function is working
3. Ensure browser supports Blob API
4. Verify sufficient data exists for export

### Charts Not Rendering
1. Check if Recharts library is properly loaded
2. Ensure data structure matches expected format
3. Verify responsive container dimensions
4. Check for JavaScript errors in chart components