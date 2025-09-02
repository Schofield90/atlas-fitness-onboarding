# Weekly Executive Brief System

## Overview

The Weekly Executive Brief System is a comprehensive automated reporting solution for the SaaS admin dashboard. It provides executive-level insights into key performance indicators, tenant performance, integration health, and actionable items for business decision-making.

## Features

### 🎯 Executive Dashboard
- **KPI Highlights**: MRR, churn rate, new signups, active users
- **Revenue Trends**: Visual charts with forecasting
- **Performance Analytics**: Top performing and at-risk tenants
- **Integration Health**: Real-time status of critical services
- **Action Items**: Tracked tasks with owners and deadlines

### 📊 Visualizations
- Interactive charts using Recharts library
- Area charts for revenue trends and forecasts
- KPI cards with trend indicators
- Progress tracking for action items
- Integration status indicators

### 📧 Automated Delivery
- Scheduled email delivery (default: Monday 9 AM)
- HTML email templates with responsive design
- Customizable recipient lists
- Email delivery logging and tracking

### 📄 Export Options
- PDF export functionality
- Email-friendly HTML format
- Plain text fallback for accessibility

### ⏰ Scheduling System
- Flexible cron-based scheduling
- Multiple schedule management
- Automatic next-run calculation
- Schedule activation/deactivation

## Architecture

### File Structure
```
app/
├── saas-admin/
│   └── weekly-brief/
│       ├── page.tsx              # Main brief dashboard
│       └── settings/
│           └── page.tsx          # Schedule management
├── api/
│   ├── saas-admin/
│   │   └── weekly-brief/
│   │       ├── route.ts          # Get latest brief
│   │       ├── generate/
│   │       │   └── route.ts      # Generate new brief
│   │       ├── export/
│   │       │   └── route.ts      # PDF export
│   │       ├── send/
│   │       │   └── route.ts      # Email delivery
│   │       └── schedule/
│   │           └── route.ts      # Schedule management
│   └── cron/
│       └── weekly-brief/
│           └── route.ts          # Automated execution
supabase/migrations/
└── 20240902_weekly_briefs.sql    # Database schema
```

### Database Schema

#### `weekly_briefs`
Stores generated executive briefs with full data and metadata.

```sql
CREATE TABLE weekly_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,                    -- Complete brief data
  generated_by UUID REFERENCES users(id), -- User who generated (null for system)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `brief_schedules`
Manages automated scheduling for brief generation and delivery.

```sql
CREATE TABLE brief_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,             -- Schedule name
  cron_schedule VARCHAR(100) NOT NULL,    -- Cron expression
  recipients TEXT[] NOT NULL,             -- Email addresses
  is_active BOOLEAN DEFAULT true,         -- Active status
  last_run_at TIMESTAMP WITH TIME ZONE,   -- Last execution time
  next_run_at TIMESTAMP WITH TIME ZONE,   -- Next scheduled run
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `email_logs`
Tracks all email deliveries for monitoring and debugging.

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,             -- Email type (weekly_brief, etc.)
  recipients TEXT[] NOT NULL,             -- Recipient list
  subject TEXT NOT NULL,                  -- Email subject
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',   -- sent, failed, pending
  error_message TEXT,                     -- Error details if failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### GET `/api/saas-admin/weekly-brief`
Retrieves the latest generated weekly brief.

**Response:**
```json
{
  "briefData": {
    "kpis": { "mrr": {...}, "churn": {...} },
    "revenue": {...},
    "tenants": {...},
    "incidents": [...],
    "integrations": {...},
    "actionItems": [...]
  },
  "generatedAt": "2024-09-02T10:00:00Z"
}
```

### POST `/api/saas-admin/weekly-brief/generate`
Generates a new weekly brief with current data.

**Response:**
```json
{
  "success": true,
  "briefId": "uuid",
  "generatedAt": "2024-09-02T10:00:00Z"
}
```

### POST `/api/saas-admin/weekly-brief/export`
Exports the latest brief as PDF.

**Request:**
```json
{
  "format": "pdf"
}
```

**Response:** PDF file download

### POST `/api/saas-admin/weekly-brief/send`
Sends the latest brief via email to configured recipients.

**Response:**
```json
{
  "success": true,
  "message": "Weekly brief sent successfully"
}
```

### Schedule Management (`/api/saas-admin/weekly-brief/schedule`)
- **GET**: List all schedules
- **POST**: Create new schedule
- **PUT**: Update existing schedule
- **DELETE**: Remove schedule

### POST `/api/cron/weekly-brief`
Automated cron endpoint that executes due schedules.

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

## Configuration

### Environment Variables

```bash
# Required for email functionality
SENDGRID_API_KEY=your_sendgrid_api_key

# Required for cron job security
CRON_SECRET=your_cron_secret

# Database access
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Vercel Configuration

The system includes Vercel cron job configuration in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-brief",
      "schedule": "0 * * * *"
    }
  ],
  "functions": {
    "app/api/cron/**/*.ts": {
      "maxDuration": 300,
      "memory": 2048
    }
  }
}
```

## Security

### Authentication & Authorization
- Email-based admin authorization
- Row Level Security (RLS) policies
- Service role key for cron operations
- Cron secret for automated endpoints

### Authorized Admin Emails
```typescript
const ADMIN_EMAILS = [
  'sam@atlas-gyms.co.uk',
  'sam@gymleadhub.co.uk'
];
```

## Usage

### Manual Brief Generation
1. Navigate to `/saas-admin/weekly-brief`
2. Click "Generate New" to create a fresh brief
3. View KPIs, charts, and insights
4. Export to PDF or send via email

### Schedule Management
1. Go to `/saas-admin/weekly-brief/settings`
2. Create new schedules with cron expressions
3. Configure recipient lists
4. Activate/deactivate schedules as needed

### Automated Execution
- Vercel cron runs every hour (`0 * * * *`)
- Checks for due schedules
- Generates briefs and sends emails automatically
- Logs all activities for monitoring

## Data Sources

### KPI Calculations
- **MRR**: Sum of subscription tier pricing across active organizations
- **Churn**: Week-over-week organization loss percentage
- **New Signups**: Weekly new organization registrations
- **Active Users**: Users with sign-ins in the last 7 days

### Performance Metrics
- **Top Performing Tenants**: Based on revenue and growth rates
- **At-Risk Tenants**: Identified by engagement patterns and payment issues
- **Integration Health**: Real-time status monitoring of critical services

### Revenue Forecasting
- Historical trend analysis
- Growth rate projections
- Seasonal adjustments (future enhancement)

## Customization

### Adding New KPIs
1. Extend the `WeeklyBriefData` interface
2. Update `generateWeeklyBriefData()` function
3. Add visualization components
4. Update email templates

### Custom Schedules
The system supports any valid cron expression:
- `0 9 * * 1` - Monday 9 AM
- `0 9 * * 0` - Sunday 9 AM
- `0 8 1 * *` - First of month 8 AM

### Email Template Customization
Modify the `generateEmailHTML()` function in `/api/saas-admin/weekly-brief/send/route.ts`

## Monitoring & Troubleshooting

### Email Delivery Logs
Query the `email_logs` table to monitor delivery status:

```sql
SELECT * FROM email_logs 
WHERE type = 'weekly_brief' 
ORDER BY sent_at DESC;
```

### Schedule Monitoring
Check next run times and execution status:

```sql
SELECT name, cron_schedule, is_active, last_run_at, next_run_at
FROM brief_schedules 
WHERE is_active = true;
```

### Common Issues

1. **Emails Not Sending**
   - Verify SENDGRID_API_KEY
   - Check email_logs for error messages
   - Ensure sender email is verified

2. **Cron Jobs Not Running**
   - Verify CRON_SECRET configuration
   - Check Vercel function logs
   - Ensure schedule times are in UTC

3. **Data Generation Errors**
   - Check database connections
   - Verify RLS policies
   - Review service role permissions

## Future Enhancements

### Planned Features
- [ ] Custom dashboard themes
- [ ] Advanced forecasting models
- [ ] Slack integration
- [ ] Multi-language support
- [ ] Advanced PDF formatting
- [ ] Historical brief comparison
- [ ] Custom metric definitions
- [ ] Alert thresholds configuration

### Performance Optimizations
- [ ] Data caching strategies
- [ ] Background job processing
- [ ] Email template caching
- [ ] Database query optimization

## Contributing

When extending the weekly brief system:

1. Follow existing patterns for authentication
2. Update type definitions in interfaces
3. Add comprehensive error handling
4. Include monitoring and logging
5. Update documentation and tests
6. Verify security implications

## Support

For issues or questions regarding the weekly brief system:

1. Check the `email_logs` table for delivery issues
2. Review Vercel function logs for API errors
3. Verify database connectivity and permissions
4. Ensure all environment variables are configured

The system is designed to be self-monitoring with comprehensive logging for troubleshooting and maintenance.