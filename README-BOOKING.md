# Atlas Fitness Booking System

## Overview

The Atlas Fitness Booking System is a comprehensive solution for managing appointments, classes, and consultations. It integrates with LeadDec (GoHighLevel) for configuration management and provides a seamless booking experience for customers.

## Architecture

### Components

1. **GHL Crawler** (`/scripts/crawl-ghl.ts`)
   - Extracts calendar configurations from LeadDec/GoHighLevel
   - Uses Playwright for web automation
   - Captures availability policies, staff assignments, and routing rules

2. **Database Schema** (`/packages/db/migrations/001_booking_system.sql`)
   - Multi-tenant architecture with organization isolation
   - Tables: calendars, staff, availability_policies, bookings, booking_notes
   - Row Level Security (RLS) for data protection

3. **Availability Engine** (`/packages/core/availability/generateSlots.ts`)
   - Generates available time slots based on policies
   - Handles buffers, minimum notice, and date ranges
   - Manages staff distribution strategies
   - Prevents double-booking with conflict detection

4. **API Endpoints**
   - `/api/calendars/[slug]` - Get calendar information
   - `/api/calendars/[slug]/availability` - Get available slots
   - `/api/calendars/[slug]/book` - Create booking
   - `/api/bookings/[id]/invite.ics` - Download calendar invite

5. **Public Booking UI** (`/app/book/[slug]/page.tsx`)
   - Mobile-responsive booking interface
   - Real-time availability display
   - Form validation and consent management
   - Success confirmation with email/SMS notifications

## Features

### Calendar Management
- **Multiple Calendar Types**: Support for different service types (consultations, classes, appointments)
- **Group Organization**: Calendars organized by business groups (e.g., "Fitter Body Ladies")
- **Custom URLs**: Each calendar has a unique booking URL (e.g., `/book/fitterbodyladies-coa`)

### Availability Configuration
- **Work Hours**: Define working hours per day of week
- **Slot Intervals**: Configurable time slots (15, 30, 60 minutes)
- **Duration**: Service duration separate from slot intervals
- **Buffers**: Pre and post-appointment buffers
- **Minimum Notice**: Prevent last-minute bookings
- **Date Range**: Limit how far in advance bookings can be made
- **Look Busy**: Artificially reduce availability to appear in-demand

### Staff Management
- **Multiple Staff**: Support for team-based services
- **Distribution Strategies**:
  - Single: All bookings to one staff member
  - Round Robin: Rotate evenly among staff
  - Optimize Availability: Balance based on workload
  - Equal Distribution: Ensure equal booking counts

### Booking Features
- **Auto-Confirmation**: Instant or manual approval workflows
- **Consent Management**: GDPR-compliant consent collection
- **Contact Information**: Capture name, email, phone, notes
- **ICS Calendar Files**: Downloadable calendar invites
- **Redis Locking**: Prevent race conditions on popular slots

### Notifications (BullMQ Jobs)
- **Email Notifications**:
  - Booking confirmation
  - 24-hour reminders
  - Cancellation notices
- **SMS Notifications**: Via Twilio integration
- **Customizable Templates**: HTML email and SMS templates
- **Retry Logic**: Automatic retry with exponential backoff

## Setup Instructions

### 1. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Redis (for locking and job queues)
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=bookings@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_SMS_FROM=+1234567890

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# GHL Credentials (for crawler)
GHL_EMAIL=your-email@example.com
GHL_PASSWORD=your-password
```

### 2. Database Migration

Run the migration to create all necessary tables:

```bash
# Using Supabase CLI
supabase db push

# Or run SQL directly in Supabase Dashboard
# Copy contents of /packages/db/migrations/001_booking_system.sql
```

### 3. Crawl GHL Configuration

Extract calendar configurations from GoHighLevel:

```bash
# Run the crawler
npm run crawl-ghl

# This will create JSON files in /data/ghl/
```

### 4. Seed Database

Import the crawled data into your database:

```bash
# Run the seed script
npm run seed-booking

# Or use ts-node
ts-node scripts/seed-from-ghl.ts
```

### 5. Start Workers

Run the BullMQ worker for processing notifications:

```bash
# In a separate terminal
npm run worker:bookings

# Or use ts-node
ts-node scripts/run-booking-worker.ts
```

### 6. Test the System

```bash
# Run Playwright tests
npm run test:e2e

# Or specific booking tests
npx playwright test booking-flow.spec.ts
```

## Usage

### Public Booking Flow

1. Customer visits booking URL: `https://yourdomain.com/book/calendar-slug`
2. Selects date and views available time slots
3. Chooses preferred time slot
4. Fills in contact information
5. Agrees to terms and submits booking
6. Receives confirmation email with ICS file
7. Gets SMS reminder 24 hours before appointment

### Admin Management

Currently managed through direct database access or GHL interface. Future enhancements will include:
- Admin dashboard for calendar management
- Staff scheduling interface
- Booking management (approve, cancel, reschedule)
- Analytics and reporting

## API Reference

### Get Calendar Info
```http
GET /api/calendars/{slug}
```

Response:
```json
{
  "id": "uuid",
  "name": "Coaching Call",
  "slug": "fitterbodyladies-coa",
  "group_name": "Fitter Body Ladies",
  "distribution": "optimize_availability",
  "auto_confirm": true
}
```

### Get Availability
```http
GET /api/calendars/{slug}/availability?from=2024-01-01&to=2024-01-07&tz=Europe/London
```

Response:
```json
{
  "calendar": { ... },
  "timezone": "Europe/London",
  "availability": [
    {
      "date": "2024-01-01",
      "slots": [
        {
          "startTime": "2024-01-01T09:00:00Z",
          "endTime": "2024-01-01T09:15:00Z",
          "staffId": "uuid",
          "staffName": "Sam Schofield"
        }
      ]
    }
  ]
}
```

### Create Booking
```http
POST /api/calendars/{slug}/book
Content-Type: application/json

{
  "slot": "2024-01-01T09:00:00Z",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+447777777777",
  "notes": "First time visitor",
  "consent": true,
  "timezone": "Europe/London"
}
```

Response:
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "startTime": "2024-01-01T09:00:00Z",
    "endTime": "2024-01-01T09:15:00Z",
    "status": "confirmed",
    "staff": {
      "id": "uuid",
      "name": "Sam Schofield"
    },
    "calendar": {
      "name": "Coaching Call"
    },
    "icsDownloadUrl": "/api/bookings/uuid/invite.ics"
  },
  "message": "Your booking has been confirmed!"
}
```

## Testing

### Unit Tests
```bash
# Run availability engine tests
npm run test packages/core/availability/generateSlots.test.ts
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode for debugging
npx playwright test --ui

# Run specific test file
npx playwright test booking-flow.spec.ts
```

### Manual Testing

1. **Test Booking Creation**:
   - Visit `/book/fitterbodyladies-coa`
   - Select tomorrow's date
   - Choose an available slot
   - Fill form with test data
   - Submit and verify confirmation

2. **Test Availability Logic**:
   - Try booking within minimum notice period (should fail)
   - Try booking beyond date range (should not show slots)
   - Verify buffers are applied correctly

3. **Test Notifications**:
   - Create a booking with your email
   - Check for confirmation email
   - Verify ICS file downloads correctly
   - Check SMS if configured

## Troubleshooting

### Common Issues

1. **No slots showing**:
   - Check work hours in availability_policies table
   - Verify current time vs minimum notice
   - Check date range limits
   - Look for existing bookings causing conflicts

2. **Booking fails with "slot no longer available"**:
   - Redis might not be configured
   - Race condition on popular slots
   - Check for duplicate booking attempts

3. **Emails not sending**:
   - Verify SMTP credentials
   - Check firewall/port settings
   - Review email logs in worker console

4. **GHL Crawler fails**:
   - Update login credentials
   - Check for UI changes in GHL
   - Verify Playwright installation

### Debug Endpoints

```bash
# Check calendar configuration
curl http://localhost:3000/api/calendars/fitterbodyladies-coa

# Test availability generation
curl "http://localhost:3000/api/calendars/fitterbodyladies-coa/availability?from=2024-01-01&to=2024-01-07"

# Download ICS file
curl http://localhost:3000/api/bookings/{booking-id}/invite.ics
```

## Performance Considerations

### Caching
- Redis caches availability queries (5-minute TTL)
- Calendar configurations cached in memory
- Static assets served with CDN headers

### Database Optimization
- Indexes on frequently queried columns
- Partial indexes for active records
- Connection pooling configured

### Scaling
- Horizontal scaling via multiple worker instances
- Redis Cluster for high availability
- Database read replicas for availability queries

## Security

### Data Protection
- Row Level Security (RLS) on all tables
- Organization-based data isolation
- Encrypted sensitive data at rest

### Input Validation
- Zod schemas for all API inputs
- SQL injection prevention via parameterized queries
- XSS protection in rendered content

### Rate Limiting
- API endpoints rate-limited per IP
- Booking attempts limited per email
- Crawler requests throttled

## Future Enhancements

### Planned Features
1. **Admin Dashboard**
   - Calendar CRUD interface
   - Booking management
   - Staff scheduling
   - Analytics and reports

2. **Customer Features**
   - Booking history
   - Cancellation/rescheduling
   - Recurring appointments
   - Waitlist management

3. **Integrations**
   - Google Calendar sync
   - Zoom meeting creation
   - Payment processing
   - CRM webhooks

4. **Advanced Scheduling**
   - Resource booking (rooms, equipment)
   - Multi-service appointments
   - Package bookings
   - Group sessions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Proprietary - Atlas Fitness

## Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/atlas-fitness/booking-system/issues)
- Email: support@atlas-fitness.com
- Documentation: [View full docs](https://docs.atlas-fitness.com/booking)