# Claude Code Design Contract

## Project Overview

Atlas Fitness Onboarding - Multi-tenant SaaS platform for gym management with AI-powered features.

## Design Principles

### Minimal Diff Policy

- **ALWAYS** produce the smallest possible change that fixes the issue
- Prefer targeted fixes over refactoring unless explicitly requested
- One concern per PR - don't bundle unrelated changes
- If a fix requires < 10 lines, prefer inline patches over new files

### Code Style

- TypeScript strict mode
- Explicit return types for public functions
- No `any` types without justification
- Guard clauses over nested conditionals
- Early returns to reduce indentation

## Critical Routes for Review

### Public-facing (High Priority)

- `/` - Landing page
- `/book/public/[organizationId]` - Public booking widget
- `/signin` - Authentication flow
- `/signup` - Onboarding flow
- `/integrations/facebook` - OAuth integration

### Dashboard (Medium Priority)

- `/dashboard` - Main dashboard
- `/leads` - Lead management
- `/booking` - Booking system
- `/settings` - Organization settings
- `/automations` - Workflow builder

## Accessibility Standards

### WCAG 2.1 AA Requirements

- Color contrast: 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Form labels properly associated
- Error messages clear and actionable
- Loading states announced to screen readers

### Component Rules

- Buttons must have accessible names
- Forms must have proper fieldset/legend structure
- Modals must trap focus and be escapable
- Tables must have proper headers and scope
- Images must have meaningful alt text (empty for decorative)

## Design Tokens

### Colors

```typescript
const colors = {
  primary: "#3B82F6", // Blue-500
  secondary: "#8B5CF6", // Purple-500
  success: "#10B981", // Green-500
  warning: "#F59E0B", // Amber-500
  error: "#EF4444", // Red-500
  dark: "#1F2937", // Gray-800
  light: "#F9FAFB", // Gray-50
};
```

### Spacing

- Use Tailwind spacing scale (0.25rem increments)
- Component padding: p-4 (1rem) minimum
- Section spacing: my-8 (2rem) between major sections
- Form field spacing: space-y-4 (1rem) between fields

### Typography

- Font: System UI stack
- Base size: 16px
- Line height: 1.5 for body, 1.2 for headings
- Heading hierarchy must be semantic (h1 → h2 → h3)

## Next.js App Router Rules

### Client/Server Boundaries

- `useSearchParams()` MUST be wrapped in `<Suspense>`
- Browser APIs (`window`, `document`, `localStorage`) only in Client Components
- Database queries only in Server Components
- Use `'use client'` directive sparingly - prefer Server Components by default
- **Never** import Server Components into Client Components directly
- Pass Server Components as `children` props to Client Components instead
- Context providers must be Client Components - wrap them around children in layouts

### Data Fetching

- Prefer Server Components for data fetching
- Fetch data in Server Components and pass as props to Client Components
- Use `loading.tsx` for route-level loading states
- Implement error boundaries with `error.tsx`
- Cache responses appropriately with `revalidate`
- Use `async/await` directly in Server Component bodies

## API Design Standards

### Response Format

```typescript
// Success
{
  success: true,
  data: T,
  meta?: { page: number, total: number }
}

// Error
{
  success: false,
  error: string,
  details?: Record<string, any>
}
```

### Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

## Testing Requirements

### Unit Tests

- Business logic functions
- API route handlers
- Custom hooks
- Utility functions

### Integration Tests

- API endpoints with database
- Authentication flows
- Third-party integrations
- Webhook handlers

### E2E Tests

- Critical user journeys
- Payment flows
- OAuth connections
- Multi-step forms

## Security Checklist

### Authentication

- [ ] All routes protected by auth middleware
- [ ] Organization-level data isolation enforced
- [ ] Session tokens properly validated
- [ ] CSRF protection on state-changing operations

### Data Validation

- [ ] Input sanitization on all user inputs
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via proper escaping
- [ ] File upload restrictions enforced

### API Security

- [ ] Rate limiting on all endpoints
- [ ] API keys stored in environment variables
- [ ] Webhook signatures validated
- [ ] CORS properly configured

## Review Checklist

### For Every PR

1. **Functionality**: Does it solve the stated problem?
2. **Minimalism**: Is this the smallest possible fix?
3. **Tests**: Are there tests for the change?
4. **Accessibility**: Does it meet WCAG standards?
5. **Performance**: No N+1 queries or unnecessary re-renders?
6. **Security**: No exposed secrets or injection vulnerabilities?
7. **Documentation**: Are complex parts commented?

### Automatic Fixes Claude Should Apply

- Missing `alt` attributes on images
- Insufficient color contrast
- Missing form labels
- Unescaped user input in templates
- Missing error boundaries
- `useSearchParams` without Suspense
- Client-only APIs in Server Components
- Server Components imported into Client Components
- Context usage in Server Components
- Third-party components without 'use client' wrapper

## PR Comment Template

````markdown
## 🤖 Claude Design Review

### ✅ Passed Checks

- [List passing items]

### ⚠️ Issues Found

- [List issues with severity]

### 🔧 Suggested Fixes

```diff
[Minimal diffs to fix issues]
```
````

### 📊 Metrics

- Accessibility Score: X/100
- Performance Score: X/100
- Test Coverage: X%

````

---

## Recent Fixes (October 1, 2025)

### Booking System Fixes

#### 1. Booking Cancellation Feature ✅
**Problem**: Members couldn't cancel their class bookings from the member portal.

**Root Cause**: Row Level Security (RLS) policies blocked UPDATE operations from user context.

**Solution**:
- Modified `/app/api/client-bookings/cancel/route.ts` to use service role key for UPDATE operations
- Maintains security by validating user authentication and ownership BEFORE performing admin updates
- Code location: `app/api/client-bookings/cancel/route.ts:12-15`

```typescript
// Create admin client for updates (bypasses RLS after auth check)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
````

#### 2. Duplicate Booking Prevention ✅

**Problem**: Users could book the same class session multiple times.

**Root Cause**: `/api/booking/book` endpoint had no duplicate check.

**Solution**:

- Added duplicate check in `/app/api/booking/book/route.ts` before creating booking
- Checks both `bookings` and `class_bookings` tables
- Returns `409 Conflict` status with clear error message
- Code location: `app/api/booking/book/route.ts:83-105`

```typescript
// Check for existing booking (duplicate prevention)
const { data: existingBooking } = await supabase
  .from("bookings")
  .select("id")
  .eq("client_id", customerId)
  .eq("class_session_id", classSessionId)
  .eq("status", "confirmed")
  .maybeSingle();

const { data: existingClassBooking } = await supabase
  .from("class_bookings")
  .select("id")
  .eq("client_id", customerId)
  .eq("class_session_id", classSessionId)
  .eq("booking_status", "confirmed")
  .maybeSingle();

if (existingBooking || existingClassBooking) {
  return NextResponse.json(
    { error: "You have already booked this class" },
    { status: 409 },
  );
}
```

#### 3. Cancelled Bookings Statistics ✅

**Problem**: Cancelled bookings were counting as "Classes Attended".

**Solution**:

- Updated `/app/client/bookings/page.tsx` to exclude cancelled bookings from attendance count
- Cancelled bookings now show with red "Cancelled" badge
- Code location: `app/client/bookings/page.tsx:347-356`

```typescript
const cancelledBookings = bookings.filter((b) => {
  return b.status === "cancelled";
});

// Only count attended classes, not cancelled ones
const attendedCount = pastBookings.filter(
  (b) => b.status === "attended",
).length;
```

#### 4. Staff View - Member Bookings Not Showing ✅

**Problem**: Gym staff couldn't see member bookings in the member profile view.

**Root Causes**:

1. API endpoint `/api/staff/customer-bookings` only checked `user_organizations` table, but staff records exist in `organization_staff` table
2. `CustomerBookings` component was using wrong API endpoint
3. Data transformation didn't match API response structure

**Solutions**:

1. **API Authorization Fallback** - Updated `/app/api/staff/customer-bookings/route.ts` to check both tables:

```typescript
// Check user_organizations first
const { data: staffOrg } = await supabase
  .from("user_organizations")
  .select("organization_id, role")
  .eq("user_id", user.id)
  .maybeSingle();

// Fallback to organization_staff table if not found
let organizationId = staffOrg?.organization_id;

if (!organizationId) {
  const { data: staffRecord } = await supabase
    .from("organization_staff")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  organizationId = staffRecord?.organization_id;
}
```

2. **Component Fix** - Updated `gym-coach-platform/components/booking/CustomerBookings.tsx`:

```typescript
// Use correct API endpoint
const response = await fetch(
  `/api/staff/customer-bookings?customerId=${memberId}`,
);

// Transform API response with nested class_sessions data
const transformedBookings = (data.bookings || []).map((booking: any) => ({
  session_title: booking.class_sessions?.name || "Unknown Session",
  start_time: booking.class_sessions?.start_time,
  trainer_name: booking.class_sessions?.instructor_name,
  location: booking.class_sessions?.location,
  status: booking.status || booking.booking_status,
  // ... etc
}));
```

**Code Locations**:

- `app/api/staff/customer-bookings/route.ts:36-62` - Authorization fallback
- `gym-coach-platform/components/booking/CustomerBookings.tsx:52-78` - API integration and data transformation

### Database Schema Notes

**Two Booking Tables**:

- `bookings` - Primary table for direct client bookings (member portal)
- `class_bookings` - Legacy table for lead-based bookings and staff-created bookings

**Key Fields**:

- `bookings.status` - Booking status ("confirmed", "cancelled", "attended", "no_show")
- `class_bookings.booking_status` - Same as above
- `bookings.client_id` - Links to clients table
- `class_bookings.client_id` OR `class_bookings.customer_id` - Can link to either clients or leads

### Testing Credentials

**Member Portal** (`members.gymleadhub.co.uk`):

- Email: samschofield90@hotmail.co.uk
- Password: @Aa80236661

**Staff Dashboard** (`login.gymleadhub.co.uk`):

- Email: sam@atlas-gyms.co.uk
- Password: @Aa80236661

### Deployment Structure

**Three Separate Vercel Projects**:

1. **Member Portal** - `apps/member-portal` → `members.gymleadhub.co.uk`
2. **Staff Dashboard** - `apps/gym-dashboard` → `login.gymleadhub.co.uk`
3. **Admin Portal** - `apps/admin-portal` → `admin.gymleadhub.co.uk`

**Shared Code**: Root `/app` directory is shared via symlinks in each app's directory.

**Triggering Deployments**: Modify `DEPLOYMENT_TRIGGER.md` in each app directory to force rebuild when shared code changes.

---

_Last Updated: October 1, 2025_
_Review Type: Automated Design & Accessibility_
_Diff Policy: Minimal changes only_

```

```
