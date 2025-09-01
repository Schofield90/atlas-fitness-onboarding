# Automation Builder Triggers

This document describes the trigger configuration system for the Gym Coach Platform's automation builder.

## Quick Start

Triggers define what events start your automations. Configure triggers in the Automation Builder by selecting a trigger type and configuring its specific settings.

## Website Opt-in Form Trigger

The Website Opt-in Form trigger starts automations when visitors submit forms on your website.

### Configuration

**Multi-Form Selection:**
- Select specific forms by checking individual form checkboxes
- Use "Select All Active" to choose all active forms at once
- Use "Clear All" to deselect all forms
- Form selections persist in `node.data.selectedForms` as an array of form IDs

**Form Type Filters:**
- **All**: Shows all forms regardless of type or status
- **Active**: Shows only forms with active status
- **Lead Forms**: Shows only forms with type "lead"
- **Contact**: Shows only forms with type "contact"
- **Booking**: Shows only forms with type "booking"

**Form Information Display:**
Each form shows:
- Form name
- Form type badge (color-coded: lead=green, contact=blue, booking=orange)
- Status badge (active=green, inactive=gray)
- Submission count

### Empty State Behavior

When no forms exist in the system:
- Displays "No forms available" message
- Shows "Create a form" CTA button
- Links to `/dashboard/website` for form creation
- Prevents trigger configuration until forms are available

### Data Persistence

Form selections are stored as:
```javascript
node.data.selectedForms = ['form_id_1', 'form_id_2']
```

The trigger displays configuration summary showing:
- Number of selected forms
- Link to manage forms at `/dashboard/website`

### Configuration States

**Selection Display:**
- No selection: "Choose forms to monitor..."
- Single form: Shows form name
- Multiple forms: "X forms selected"

**Save Button:**
- Disabled when no forms are selected
- Enabled when at least one form is selected

### Navigation Integration

**Form Management:**
- "Manage forms" link directs to `/dashboard/website`
- "Create a form" button (empty state) directs to `/dashboard/website`

## Technical Implementation

### Component Structure

The Website Opt-in Form trigger uses the `FormSubmittedTriggerConfig` component with these key features:

**Props:**
- `value?: string[]` - Array of selected form IDs
- `onChange?: (selectedForms: string[]) => void` - Selection change callback
- `onSave?: () => void` - Save action callback
- `onCancel?: () => void` - Cancel action callback

**Mock Data:**
Currently uses mock form data with structure:
```javascript
{
  id: string,
  name: string,
  type: 'contact' | 'lead' | 'booking',
  status: 'active' | 'inactive',
  submissions: number
}
```

### Automation Builder Integration

In the AutomationBuilder component:
- Trigger type `website_form` renders `FormSubmittedTriggerConfig`
- Other trigger types show generic configuration placeholder
- Form selections stored in `node.data.selectedForms`
- Configuration triggers via "Configure Trigger" button after type selection

### Testing Coverage

Comprehensive test coverage includes:
- Component rendering and form display
- Multi-form selection and deselection
- Form type filtering functionality
- Empty state handling
- Save/cancel button behavior
- Configuration persistence
- E2E user workflow validation

## Troubleshooting

**No Forms Available:**
- Ensure forms exist in the system
- Check that forms have proper type and status fields
- Verify navigation to form creation page works

**Form Selection Issues:**
- Verify form IDs are properly stored in `node.data.selectedForms`
- Check that onChange callback is properly connected
- Ensure form checkboxes update selection state correctly

**Filter Not Working:**
- Confirm form objects have correct `type` and `status` fields
- Verify filter state updates when filter buttons are clicked
- Check that filtered forms array updates properly

## Schedule Trigger

The Schedule trigger starts automations at specific times or intervals based on configurable schedules.

### Quick Start

1. Select "Scheduled Time" from trigger type dropdown
2. Choose schedule mode: One-time, Daily, or Weekly
3. Configure date/time settings and timezone
4. Set optional catch-up and active toggles
5. Save configuration to enable scheduled runs

### Schedule Modes

**One-time Schedule:**
- Runs exactly once at a specified date and time
- Date must be in the future when configured
- Uses YYYY-MM-DD date format and HH:MM time format
- Automatically becomes inactive after execution

**Daily Schedule:**
- Runs every day at the same time
- Only requires time configuration (HH:MM format)
- Continues running indefinitely until disabled

**Weekly Schedule:**
- Runs on selected days of the week at a specified time
- Multiple days can be selected (Sunday=0 to Saturday=6)
- At least one day must be selected
- Time applies to all selected days

### Configuration Options

**Timezone Handling:**
- Default timezone: Europe/London
- All schedule times are calculated in the configured timezone
- Handles Daylight Saving Time (DST) transitions automatically
- Next run preview shows times in the configured timezone

**Catch Up Missed Runs:**
- When enabled, missed schedules are executed when the automation reactivates
- Useful for automations that must process all scheduled occurrences
- Disabled by default to prevent unexpected batch executions

**Active Toggle:**
- Controls whether the scheduled trigger is enabled
- Disabled triggers do not execute on schedule
- Can be toggled without losing schedule configuration
- Enabled by default when creating new schedules

### Next Run Preview

The configuration interface shows a real-time preview of when the automation will next execute:
- Updates automatically as schedule settings change
- Shows "Already passed" for one-time schedules in the past
- Shows "No upcoming runs" for weekly schedules with no valid days
- Displays "Invalid configuration" for validation errors

### Date/Time Validation

**One-time Schedules:**
- Date must be in YYYY-MM-DD format
- Time must be in HH:MM format (24-hour)
- Combined datetime must be in the future
- Validated against the configured timezone

**Daily Schedules:**
- Time must be in HH:MM format (24-hour)
- No future validation required (runs daily)

**Weekly Schedules:**
- Time must be in HH:MM format (24-hour)
- At least one day of week must be selected
- Days are numbered 0-6 (Sunday to Saturday)

### Data Structure

Schedule configuration is stored in `node.data.schedule`:

```typescript
// One-time schedule
{
  mode: 'once',
  date: '2024-12-25',      // YYYY-MM-DD
  time: '09:00',           // HH:MM
  tz: 'Europe/London',     // IANA timezone
  catchUp: false,          // boolean
  active: true             // boolean
}

// Daily schedule
{
  mode: 'daily',
  time: '14:30',           // HH:MM
  tz: 'Europe/London',     // IANA timezone
  catchUp: true,           // boolean
  active: true             // boolean
}

// Weekly schedule
{
  mode: 'weekly',
  daysOfWeek: [1, 3, 5],   // Monday, Wednesday, Friday
  time: '08:00',           // HH:MM
  tz: 'Europe/London',     // IANA timezone
  catchUp: false,          // boolean
  active: true             // boolean
}
```

### DST Boundary Handling

The Schedule trigger handles Daylight Saving Time transitions:
- Uses IANA timezone database for accurate calculations
- Automatically adjusts for clock changes in spring/fall
- Next run calculations account for DST boundaries
- Times are specified in local timezone (not UTC)

### Configuration States

**Schedule Mode Selection:**
- Radio buttons for One-time, Daily, Weekly modes
- Changing modes preserves timezone and toggle settings
- Mode-specific fields reset to defaults when switching

**Save Button Behavior:**
- Disabled when validation errors exist
- Enabled when all required fields are valid
- Shows "Save Configuration" label
- Triggers onSave callback when clicked

**Error Display:**
- Inline validation messages below invalid fields
- Red alert icon with descriptive error text
- Real-time validation as user types
- Comprehensive error states for all input types

### Troubleshooting

**"Already passed" Next Run:**
- One-time schedule date/time is in the past
- Update to a future date and time

**"No upcoming runs" Message:**
- Weekly schedule has no days selected
- Select at least one day of the week

**"Invalid configuration" Preview:**
- Date format incorrect (must be YYYY-MM-DD)
- Time format incorrect (must be HH:MM)
- Missing required fields

**Schedule Not Executing:**
- Check that Active toggle is enabled
- Verify timezone matches expected execution time
- Confirm schedule configuration is saved

## Webhook Trigger

The Webhook trigger starts automations when external systems send HTTP requests to your unique webhook endpoint.

### Quick Start

1. Select "Webhook" from trigger type dropdown
2. Configure security settings (secret management, IP allowlist)
3. Set accepted content types and deduplication options
4. Copy webhook endpoint URL for external systems
5. Test webhook configuration and save settings

### Webhook Configuration

**Endpoint URL:**
- Auto-generated unique URL format: `/api/automations/webhooks/{workflowId}/{nodeId}`
- Read-only endpoint that external systems POST to
- Supports both JSON and form-encoded payloads

**Secret Management:**
- Cryptographically secure webhook secrets with `wh_` prefix
- HMAC-SHA256 signature verification for request authenticity
- Secret rotation with one-time reveal functionality
- Shows last 4 characters of secret for identification

**Security Features:**
- IP allowlist with CIDR notation support (e.g., `192.168.1.0/24`)
- Rate limiting at 10 requests per second per endpoint
- Signature verification with configurable timestamp tolerance (30-600 seconds)
- Request body size limit of 1MB

### Content Type Support

**Accepted Types:**
- `application/json` (recommended) - Full JSON payload support
- `application/x-www-form-urlencoded` - Form-encoded data support
- Multiple content types can be enabled simultaneously

### Deduplication Options

**Header-based Deduplication:**
- Uses request header value as unique identifier
- Default header: `X-Request-ID`
- Configurable deduplication window (60-3600 seconds)

**JSON Path-based Deduplication:**
- Extracts value from JSON payload using dot notation
- Example: `user.id` extracts from `{"user": {"id": "123"}}`
- Fallback to string conversion for non-string values

### Signature Verification

**HMAC-SHA256 Process:**
- Payload format: `{timestamp}.{request_body}`
- Signature header: `X-Atlas-Signature` (format: `sha256=hexdigest`)
- Timestamp header: `X-Atlas-Timestamp` (Unix timestamp)
- Timing-safe comparison prevents signature attacks

**Verification Steps:**
1. Check timestamp within tolerance window
2. Recreate payload using timestamp and body
3. Generate expected HMAC signature using webhook secret
4. Compare signatures using timing-safe equality

### Status Controls

**Pause Intake:**
- Temporarily stops accepting incoming webhooks
- Returns HTTP 503 with "Webhook temporarily unavailable"
- Preserves configuration while paused

**Active Toggle:**
- Enables/disables webhook trigger completely
- Inactive webhooks return HTTP 404 "Webhook not found"
- Can be toggled without losing settings

### Sample Code Examples

**cURL Request:**
```bash
curl -X POST 'https://yourdomain.com/api/automations/webhooks/{workflowId}/{nodeId}' \
  -H 'Content-Type: application/json' \
  -H 'X-Atlas-Signature: sha256=abc123...' \
  -H 'X-Atlas-Timestamp: 1703097600' \
  -d '{"event": "user_action", "user_id": "12345"}'
```

**Node.js Implementation:**
```javascript
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');
```

### Response Codes

- **202 Accepted** - Webhook processed successfully
- **401 Unauthorized** - Invalid signature or timestamp
- **403 Forbidden** - IP address not allowed
- **404 Not Found** - Webhook not found or inactive
- **413 Payload Too Large** - Request body exceeds 1MB
- **415 Unsupported Media Type** - Content type not accepted
- **429 Too Many Requests** - Rate limit exceeded
- **503 Service Unavailable** - Webhook paused or workflow inactive

### Configuration States

**Endpoint Display:**
- Shows full webhook URL with copy button
- Read-only field with monospace font
- Includes explanatory text about POST requirements

**Secret Display:**
- Masked view showing last 4 characters: `****abcd`
- Toggle visibility button (eye icon)
- Copy button available only when revealed

**Save Button:**
- Disabled when validation errors exist
- Enabled when all required fields are valid
- Shows "Save Configuration" label

### Data Structure

Webhook configuration is stored in `node.data`:

```typescript
{
  kind: 'webhook',
  name?: string,
  description?: string,
  endpoint: string,
  secretId: string,
  secretLast4: string,
  verify: {
    algorithm: 'hmac-sha256',
    signatureHeader: 'X-Atlas-Signature',
    timestampHeader: 'X-Atlas-Timestamp',
    toleranceSeconds: 300
  },
  contentTypes: ['application/json'],
  ipAllowlist: ['192.168.1.0/24'],
  dedupe?: {
    header?: 'X-Request-ID',
    jsonPath?: 'user.id',
    windowSeconds: 300
  },
  paused: false,
  active: true
}
```

### Test Functionality

**Test Webhook Button:**
- Sends simulated webhook request to verify configuration
- Validates endpoint accessibility and response handling
- Currently shows "Test webhook feature coming soon" message
- Disabled when configuration has validation errors

### Troubleshooting

**Webhook Not Receiving Requests:**
- Verify webhook is active and not paused
- Check IP allowlist configuration if requests are blocked
- Confirm workflow status is active
- Validate content type matches request headers

**Signature Verification Failures:**
- Ensure timestamp is within tolerance window (default 300 seconds)
- Verify signature format is `sha256=hexdigest`
- Check payload construction: `{timestamp}.{body}`
- Confirm secret is current (not rotated)

**Rate Limiting Issues:**
- Current limit is 10 requests per second per endpoint
- Implement exponential backoff in client code
- Consider request batching for high-volume scenarios

**Deduplication Not Working:**
- Verify header exists in request or JSON path is valid
- Check deduplication window hasn't expired
- Ensure dedupe key extraction is working correctly

## Related Files

- **Website Form Component**: `/components/automations/FormSubmittedTriggerConfig.tsx`
- **Website Form Tests**: `/__tests__/unit/components/automations/FormSubmittedTriggerConfig.test.tsx`
- **Website Form E2E**: `/__tests__/e2e/website-opt-in-form-trigger.spec.ts`
- **Schedule Component**: `/components/automations/ScheduleTriggerConfig.tsx`
- **Schedule Tests**: `/__tests__/unit/components/automations/ScheduleTriggerConfig.test.tsx`
- **Schedule E2E**: `/__tests__/e2e/schedule-trigger.spec.ts`
- **Webhook Component**: `/components/automations/WebhookTriggerConfig.tsx`
- **Webhook Tests**: `/__tests__/unit/components/automations/WebhookTriggerConfig.test.tsx`
- **Webhook E2E**: `/__tests__/e2e/webhook-configuration.spec.ts`
- **Webhook Security Tests**: `/__tests__/unit/webhook-security.test.ts`
- **Webhook API Tests**: `/__tests__/api/webhooks/route.test.ts`
- **Integration**: `/components/automations/AutomationBuilder.tsx`