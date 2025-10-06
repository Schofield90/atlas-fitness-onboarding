# Atlas Fitness Service Layer

This directory contains the core business logic services for the Atlas Fitness multi-tenant CRM + Booking SaaS platform.

## Services Overview

### 1. Analytics Service (`analytics.service.ts`)
Provides real-time analytics and metrics with Redis caching support.

**Key Features:**
- Dashboard metrics (revenue, leads, bookings, sessions)
- Lead analytics by source, status, and score
- Revenue analytics with daily tracking
- Cached queries for performance
- Automatic metric refresh

**Example Usage:**
```typescript
import { analyticsService } from '@/src/services';

// Get dashboard metrics
const metrics = await analyticsService.getDashboardMetrics(orgId);

// Get lead analytics for last 30 days
const leadStats = await analyticsService.getLeadAnalytics(orgId, 30);

// Clear cache after updates
await analyticsService.clearCache(orgId);
```

### 2. Lead Service (`lead.service.ts`)
Manages lead lifecycle from creation to conversion.

**Key Features:**
- Lead CRUD operations
- Bulk import from CSV/XLSX
- AI-powered lead scoring
- Advanced filtering and search
- Bulk operations (status update, tagging, assignment)

**Example Usage:**
```typescript
import { leadService } from '@/src/services';

// Create a lead
const leadId = await leadService.createLead(orgId, {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  source: 'website'
});

// Import leads from file
const result = await leadService.importLeads(orgId, file, {
  'First Name': 'first_name',
  'Email': 'email'
});

// Convert lead to client
const clientId = await leadService.convertLead(leadId);
```

### 3. Booking Service (`booking.service.ts`)
Handles class bookings, scheduling, and capacity management.

**Key Features:**
- Single and bulk booking creation
- Waitlist management with automatic promotion
- Recurring session creation
- Schedule views with availability
- Check-in and attendance tracking

**Example Usage:**
```typescript
import { bookingService } from '@/src/services';

// Book a class
const bookingId = await bookingService.createBooking(orgId, {
  sessionId: 'session-uuid',
  clientId: 'client-uuid'
});

// Create recurring sessions
const sessionIds = await bookingService.createRecurringSessions(orgId, classId, {
  startDate: new Date('2025-02-01'),
  endDate: new Date('2025-03-31'),
  daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
  startTime: '09:00',
  duration: 60
});

// Check session availability
const availability = await bookingService.getSessionAvailability(sessionId);
```

### 4. Workflow Service (`workflow.service.ts`)
Automation engine for creating and executing workflows.

**Key Features:**
- Visual workflow builder support
- Multiple trigger types (events, webhooks, schedules)
- Conditional logic and branching
- Variable interpolation
- Built-in action library
- Workflow templates

**Example Usage:**
```typescript
import { workflowService } from '@/src/services';

// Create a workflow
const workflowId = await workflowService.createWorkflow(orgId, {
  name: 'Welcome Series',
  trigger_type: 'lead.created',
  actions: [
    {
      type: 'send_email',
      config: {
        to: '{{trigger.email}}',
        subject: 'Welcome!',
        template_id: 'welcome'
      }
    },
    {
      type: 'delay',
      config: { duration: 1, unit: 'days' }
    },
    {
      type: 'send_sms',
      config: {
        to: '{{trigger.phone}}',
        body: 'Ready to start your fitness journey?'
      }
    }
  ]
});

// Trigger an event
await workflowService.triggerEvent(orgId, 'lead.created', { 
  id: leadId,
  email: 'john@example.com'
});
```

### 5. Message Service (`message.service.ts`)
Unified messaging across email, SMS, and WhatsApp.

**Key Features:**
- Multi-channel messaging
- Template management with variables
- Bulk sending with rate limiting
- Delivery tracking and status
- Message history and analytics

**Example Usage:**
```typescript
import { messageService } from '@/src/services';

// Send email
await messageService.sendEmail(
  orgId,
  'customer@example.com',
  'Your class is tomorrow!',
  'Hi {{name}}, see you at {{time}}!',
  'reminder_template'
);

// Send SMS
await messageService.sendSMS(
  orgId,
  '+447777777777',
  'Your PT session is in 1 hour'
);

// Bulk send
const result = await messageService.bulkSend(
  orgId,
  recipients,
  'email',
  'Special Offer',
  'Limited time 20% off!'
);
```

### 6. Billing Service (`billing.service.ts`)
Stripe-integrated subscription and payment management.

**Key Features:**
- Subscription plan management
- Stripe customer creation
- Payment method handling
- Invoice generation
- Usage tracking against limits
- Webhook processing

**Example Usage:**
```typescript
import { billingService } from '@/src/services';

// Subscribe to a plan
const subscription = await billingService.subscribe(
  orgId,
  planId,
  'monthly'
);

// Get current usage
const usage = await billingService.getUsage(orgId);
if (usage.bookings >= usage.bookings_limit) {
  // Prompt upgrade
}

// Create checkout session for upgrade
const checkoutUrl = await billingService.createCheckoutSession(
  orgId,
  newPlanId,
  'yearly',
  successUrl,
  cancelUrl
);
```

### 7. Payroll Service (`payroll.service.ts`)
Staff time tracking and payroll processing.

**Key Features:**
- Clock in/out functionality
- Timesheet management and approval
- Payroll batch processing
- Overtime calculation
- Export to multiple formats (CSV, Xero, QuickBooks)
- Staff payroll summaries

**Example Usage:**
```typescript
import { payrollService } from '@/src/services';

// Clock in
const timesheetId = await payrollService.clockIn(staffId);

// Create payroll batch
const batchId = await payrollService.createPayrollBatch(orgId, {
  period_start: '2025-02-01',
  period_end: '2025-02-15'
});

// Export payroll
const export = await payrollService.exportPayroll(batchId, 'xero');
```

## Architecture Patterns

### 1. Multi-Tenancy
All services enforce organization isolation through:
- Mandatory `orgId` parameters
- RLS policies in database
- Scoped queries

### 2. Error Handling
Services throw descriptive errors that should be caught at the API layer:
```typescript
try {
  await leadService.createLead(orgId, data);
} catch (error) {
  if (error.message.includes('duplicate')) {
    // Handle duplicate lead
  }
}
```

### 3. Caching Strategy
Services use Redis when available:
- Analytics: 5-minute TTL
- Static data: 1-hour TTL
- Clear cache on updates

### 4. Schema Validation
All input data is validated using Zod schemas:
```typescript
const validated = leadSchema.parse(inputData);
```

### 5. Pagination
List methods support pagination:
```typescript
const { data, total, page, totalPages } = await leadService.getLeads(
  orgId,
  filter,
  page = 1,
  limit = 50
);
```

## Environment Variables

Required for full functionality:
```env
# Database
DATABASE_URL=postgresql://...

# Redis (optional but recommended)
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=re_...

# SMS/WhatsApp
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_FROM=+44...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Payments
STRIPE_SECRET_KEY=sk_...

# AI
OPENAI_API_KEY=sk-...
```

## Testing

Each service should have corresponding tests:
```typescript
// src/services/__tests__/lead.service.test.ts
describe('LeadService', () => {
  it('should create a lead', async () => {
    const leadId = await leadService.createLead(orgId, mockLead);
    expect(leadId).toBeDefined();
  });
});
```

## Best Practices

1. **Always use transactions** for operations that modify multiple tables
2. **Validate input** at the service layer, not just API layer
3. **Log errors** but don't expose internal details to clients
4. **Use type safety** - leverage TypeScript throughout
5. **Cache expensive operations** but ensure cache invalidation
6. **Rate limit** external API calls (Twilio, Stripe)
7. **Handle edge cases** like duplicate entries, missing data
8. **Document complex logic** with inline comments

## Adding New Services

1. Create service file: `src/services/[name].service.ts`
2. Define schemas and types
3. Implement service class with methods
4. Export singleton instance
5. Add to index exports
6. Create tests
7. Update this README

## Performance Considerations

- Use database indexes (already created in migrations)
- Batch operations when possible
- Implement pagination for large datasets
- Cache frequently accessed data
- Use connection pooling (handled by Supabase)
- Monitor query performance with EXPLAIN ANALYZE

## Security

- All services assume authentication is handled at API layer
- RLS policies enforce data isolation
- Sensitive data (API keys) stored in env variables
- Input validation prevents injection attacks
- Rate limiting on external services