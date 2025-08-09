# Comprehensive Booking System Guide

This guide covers the implementation of a comprehensive booking system with Google Calendar integration, availability management, and AI tools for the Atlas Fitness gym management platform.

## System Overview

The booking system provides:
- **Google Calendar Integration**: Two-way sync with staff calendars
- **Advanced Availability Engine**: Rules-based scheduling with overrides
- **Public Booking APIs**: Customer-facing booking endpoints
- **AI Booking Tools**: Claude integration for automated booking
- **Notification System**: Email/SMS confirmations and reminders
- **Real-time Sync**: Webhook-based calendar updates

## Architecture Components

### 1. Database Schema

**New Tables Added:**
- `calendar_connections` - OAuth tokens for Google Calendar
- `calendars` - User's connected calendars
- `availability_rules` - Weekly working hours
- `availability_overrides` - Date-specific changes (time off, extra hours)
- `holidays` - Organization-wide holidays
- `appointment_types` - Service definitions with duration/pricing
- `booking_links` - Public booking page configurations
- `link_branding` - Visual customization for booking pages
- `booking_audit` - Complete audit trail of changes
- `notifications` - Email/SMS notification queue

**Enhanced Existing Tables:**
- `bookings` - Extended with calendar integration fields

### 2. Core Services

#### Google Calendar Service (`app/lib/google-calendar-enhanced.ts`)
- OAuth token management with auto-refresh
- FreeBusy API integration for availability checking
- Event CRUD operations with booking metadata
- Webhook setup for real-time updates
- Two-way sync between bookings and calendar events

#### Availability Engine (`app/lib/availability-engine.ts`)
- Rule-based availability calculation
- Support for working hours, overrides, and holidays
- Integration with Google Calendar busy times
- Team/round-robin booking support
- Conflict detection and resolution

#### Notification Service (`app/lib/notification-service.ts`)
- Multi-channel notifications (email, SMS)
- Template-based messaging system
- Scheduled reminders and confirmations
- Retry logic for failed deliveries
- Unsubscribe/opt-out management

#### AI Booking Tools (`app/lib/ai-booking-tools.ts`)
- Claude integration for automated booking
- Availability search and booking creation
- Rescheduling and cancellation management
- Organization and booking data access
- Permission-aware operations

## API Endpoints

### Public Booking APIs

#### Get Availability
```http
GET /api/booking/availability?link=gym-consultation&date=2024-03-15
```

**Parameters:**
- `link` - Booking link slug
- `org` - Organization slug (alternative to link)
- `date` - Specific date (YYYY-MM-DD)
- `start_date`, `end_date` - Date range
- `duration` - Appointment duration in minutes
- `appointment_type_id` - Filter by service type
- `staff_id` - Filter by staff member
- `timezone` - Client timezone

**Response:**
```json
{
  "success": true,
  "slots": [
    {
      "start": "2024-03-15T09:00:00Z",
      "end": "2024-03-15T09:30:00Z",
      "duration": 30,
      "staff_id": "uuid",
      "staff_name": "John Doe",
      "appointment_type_id": "uuid"
    }
  ],
  "booking_link": {
    "slug": "gym-consultation",
    "name": "Gym Consultation",
    "type": "individual"
  }
}
```

#### Create Booking
```http
POST /api/booking/create
```

**Request Body:**
```json
{
  "link_slug": "gym-consultation",
  "staff_id": "uuid",
  "appointment_type_id": "uuid",
  "start_time": "2024-03-15T09:00:00Z",
  "end_time": "2024-03-15T09:30:00Z",
  "attendee_name": "Jane Smith",
  "attendee_email": "jane@example.com",
  "attendee_phone": "+44 7700 900123",
  "description": "Initial consultation",
  "location_details": "Main gym floor"
}
```

#### Manage Booking
```http
GET /api/booking/manage?token=<cancellation_token>
PUT /api/booking/manage (reschedule)
DELETE /api/booking/manage (cancel)
```

### AI Integration APIs

#### AI Booking Tools
```http
POST /api/ai/booking
```

**Available Actions:**
- `find_availability` - Search for available slots
- `book_slot` - Create a new booking
- `reschedule_booking` - Move existing booking
- `cancel_booking` - Cancel existing booking
- `get_booking` - Retrieve booking details
- `get_bookings` - List organization bookings

**Example Request:**
```json
{
  "action": "find_availability",
  "organizationSlug": "atlas-fitness",
  "date": "2024-03-15",
  "duration": 60,
  "limit": 10
}
```

### Calendar Integration

#### Google Calendar OAuth
```http
GET /api/calendar/google/connect
GET /api/calendar/google/callback
```

#### Webhook Handler
```http
POST /api/calendar/webhooks/google
```

## Setup Instructions

### 1. Database Migration

Apply the comprehensive booking system migration:

```bash
# Run the migration
psql -d your_database -f supabase/migrations/20250809_comprehensive_booking_system.sql
```

### 2. Google Calendar Integration

Set up environment variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Configure Google Cloud Console:
1. Enable Calendar API
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://your-domain.com/api/calendar/google/callback`
4. Add webhook URI: `https://your-domain.com/api/calendar/webhooks/google`

### 3. Email/SMS Configuration

Configure notification services:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Atlas Fitness <noreply@your-domain.com>

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Admin API Key for notifications processing
ADMIN_API_KEY=your_secure_admin_key
```

### 4. Notification Processing

Set up a cron job or scheduled task to process notifications:

```bash
# Process every minute
* * * * * curl -X POST -H "Authorization: Bearer ${ADMIN_API_KEY}" https://your-domain.com/api/notifications/process
```

Or use Vercel Cron (add to vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/notifications/process",
      "schedule": "* * * * *"
    }
  ]
}
```

## Usage Examples

### 1. Setting Up a Booking Link

```typescript
// Create appointment type
const appointmentType = await supabase
  .from('appointment_types')
  .insert({
    organization_id: orgId,
    name: 'Personal Training Session',
    duration_minutes: 60,
    buffer_after_minutes: 15,
    price_pennies: 5000, // £50.00
    description: '1-on-1 personal training session'
  })

// Create booking link
const bookingLink = await supabase
  .from('booking_links')
  .insert({
    organization_id: orgId,
    user_id: trainerId,
    slug: 'personal-training',
    name: 'Book Personal Training',
    type: 'individual',
    appointment_type_ids: [appointmentType.id],
    is_public: true
  })
```

### 2. Setting Staff Availability

```typescript
// Set working hours (Monday-Friday 9 AM - 5 PM)
for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
  await supabase
    .from('availability_rules')
    .insert({
      user_id: staffId,
      organization_id: orgId,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      buffer_after: 15
    })
}

// Add holiday override
await supabase
  .from('holidays')
  .insert({
    organization_id: orgId,
    name: 'Christmas Day',
    date: '2024-12-25',
    affects_all_staff: true
  })

// Add personal time off
await supabase
  .from('availability_overrides')
  .insert({
    user_id: staffId,
    organization_id: orgId,
    date: '2024-03-20',
    type: 'unavailable',
    reason: 'Personal day off'
  })
```

### 3. Using AI Tools with Claude

```typescript
// Find available slots
const availability = await fetch('/api/ai/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'find_availability',
    organizationSlug: 'atlas-fitness',
    date: '2024-03-15',
    duration: 60,
    limit: 5
  })
})

// Book a slot
const booking = await fetch('/api/ai/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'book_slot',
    organizationSlug: 'atlas-fitness',
    staffId: 'trainer-uuid',
    appointmentTypeId: 'pt-session-uuid',
    startTime: '2024-03-15T10:00:00Z',
    endTime: '2024-03-15T11:00:00Z',
    attendeeName: 'John Smith',
    attendeeEmail: 'john@example.com',
    attendeePhone: '+44 7700 900123'
  })
})
```

## Testing

Test the complete system integration:

```bash
# Test all components
curl https://your-domain.com/api/test/booking-system

# Test specific components
curl -X POST https://your-domain.com/api/test/booking-system \
  -H "Content-Type: application/json" \
  -d '{"testName": "availability"}'
```

## Security Considerations

1. **Authentication**: Booking management requires authentication
2. **Rate Limiting**: Implement rate limits on public booking endpoints  
3. **Token Security**: Booking tokens should be cryptographically secure
4. **Data Validation**: All inputs are validated using Zod schemas
5. **RLS Policies**: Row-level security enforced on all tables
6. **API Keys**: Secure admin operations with API keys

## Performance Optimization

1. **Database Indexing**: Strategic indexes on commonly queried fields
2. **Caching**: Consider Redis for availability calculations
3. **Batch Processing**: Notification processing in batches
4. **Background Jobs**: Move heavy operations to background queues
5. **CDN**: Static assets and booking pages via CDN

## Monitoring and Observability

1. **Logging**: Comprehensive logging of booking operations
2. **Error Tracking**: Monitor API errors and failures
3. **Metrics**: Track booking conversion rates and system usage
4. **Alerts**: Set up alerts for system failures and high error rates
5. **Analytics**: Track booking patterns and user behavior

## Troubleshooting

### Common Issues

1. **Google Calendar Sync Issues**
   - Check OAuth token validity
   - Verify webhook endpoint accessibility
   - Review Google API quotas and limits

2. **Availability Calculation Problems**
   - Validate working hours configuration
   - Check for conflicting overrides
   - Verify timezone handling

3. **Notification Delivery Failures**
   - Check SMTP/SMS configuration
   - Review notification queue status
   - Validate recipient email/phone formats

4. **Booking Conflicts**
   - Ensure atomic booking operations
   - Validate slot availability before booking
   - Check for race conditions in high-traffic scenarios

### Debug Endpoints

- `GET /api/test/booking-system` - Full system test
- `GET /api/notifications/process` - Notification processor health
- `GET /api/calendar/webhooks/google` - Webhook endpoint test

## Future Enhancements

1. **Multi-location Support** - Location-specific availability
2. **Resource Booking** - Equipment and room reservations
3. **Waitlist Management** - Automated waitlist processing
4. **Payment Integration** - Stripe payment processing
5. **Mobile App Support** - React Native booking interface
6. **Advanced Analytics** - Booking insights and reporting
7. **Integration Marketplace** - Third-party service integrations

## Support

For technical support or questions about the booking system implementation, please refer to:

- System logs and monitoring dashboards
- Database query performance metrics
- API endpoint documentation and examples
- Test suite results and validation reports

The comprehensive booking system is designed to scale with your business needs while maintaining reliability and performance.