# GoHighLevel Calendar Booking Integration - Complete Setup Guide

**Last Updated**: October 16, 2025
**Status**: ✅ Working in Production
**Agent**: Aimee's Place AI Agent

---

## Overview

This document contains everything needed to recreate the AI agent calendar booking integration with GoHighLevel from scratch.

## The Solution

After extensive testing, we discovered that **GoHighLevel v1 API** with a **Location API Key** is required for booking appointments.

### Why v2 API Didn't Work

- ❌ Private App tokens: `403 - Token does not have access to this location`
- ❌ v2 endpoints: Not compatible with location-scoped tokens
- ✅ v1 API with Location JWT: Works perfectly!

---

## Required Credentials

### 1. Location API Key (JWT Format)

**How to Get**:
1. Login to GoHighLevel: https://app.gohighlevel.com/
2. **Switch to the correct location** (top-left dropdown)
3. Go to: **Settings** → **Business Profile**
4. Scroll to: **API** section
5. Click: **Create API Key** or copy existing key
6. Key format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)

**Current Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IkxsWXNEbUIzYzYyazBhdTFZY0hoIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYwNTI2MDkxNDk2LCJzdWIiOiJ6ZWxTck9GQlZOU2MybkZJUGNDVyJ9.8xfckiOzvZh6o1sCeAh_CGf9jl-d1dzHFjbWXDkQmA4`

**Key Details**:
- Location ID: `LlYsDmB3c62k0au1YcHh` (Aimee's Place York)
- Created: October 15, 2025
- Type: Location-scoped JWT
- Permissions: Full location access

### 2. Calendar ID

**How to Get**:
1. Login to GoHighLevel
2. Go to: **Calendars**
3. Click on the calendar you want to use
4. Copy the ID from the URL or calendar settings

**Current Calendar**:
- ID: `INV5khuOCZFWKMok132c`
- Name: "York 10 Minute Discovery Call"
- Location: Aimee's Place York (`LlYsDmB3c62k0au1YcHh`)

### 3. Agent ID

**Current Agent**: `1b44af8e-d29d-4fdf-98a8-ab586a289e5e` (Aimee's Place)

---

## API Endpoint Configuration

### Working Endpoint

```
POST https://rest.gohighlevel.com/v1/appointments
```

### Required Headers

```json
{
  "Authorization": "Bearer {LOCATION_JWT_TOKEN}",
  "Content-Type": "application/json"
}
```

### Required Body Fields

```json
{
  "calendarId": "INV5khuOCZFWKMok132c",
  "selectedTimezone": "Europe/London",
  "selectedSlot": "2025-10-16T10:00:00+00:00",
  "email": "contact@example.com",
  "phone": "+447490253471",
  "contact": {
    "id": "qvCWafwCpdAhVnAbTzWd"
  }
}
```

**Field Notes**:
- `selectedTimezone`: Must match contact's timezone (default: `Europe/London`)
- `selectedSlot`: ISO 8601 format with timezone
- `email` OR `phone`: At least one is required
- `contact.id`: GoHighLevel contact ID from webhook

### Successful Response

```json
{
  "id": "qnERz89WTEeXnd1PeTn3",
  "contactId": "4d44cb97-5329-4d4d-ba07-bc430f9979c3",
  "sessionId": "54f9afcc-80fd-45e8-9c02-cd0c711c966b",
  "contact": { ... }
}
```

---

## Database Configuration

### Agent Record

**Table**: `ai_agents`
**ID**: `1b44af8e-d29d-4fdf-98a8-ab586a289e5e`

**Required Fields**:
```sql
ghl_api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' -- Location JWT
ghl_calendar_id = 'INV5khuOCZFWKMok132c'
metadata = {
  "gohighlevel_api_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "gohighlevel_calendar_id": "INV5khuOCZFWKMok132c",
  "gohighlevel_location_id": "LlYsDmB3c62k0au1YcHh"
}
```

### Update Script

```bash
node update-ghl-api-key.mjs YOUR_LOCATION_JWT_TOKEN
```

Or manually:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lzlrojoaxrqvmhempnkn.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

await supabase
  .from('ai_agents')
  .update({
    ghl_api_key: 'YOUR_LOCATION_JWT',
    ghl_calendar_id: 'INV5khuOCZFWKMok132c',
    metadata: {
      gohighlevel_api_key: 'YOUR_LOCATION_JWT',
      gohighlevel_calendar_id: 'INV5khuOCZFWKMok132c',
      gohighlevel_location_id: 'LlYsDmB3c62k0au1YcHh'
    }
  })
  .eq('id', '1b44af8e-d29d-4fdf-98a8-ab586a289e5e');
```

---

## Code Implementation

### Booking Tool Location

**File**: `/app/lib/ai-agents/tools/gohighlevel-tools.ts`

**Class**: `BookGHLAppointmentTool`

### Key Methods

#### `bookAppointment()` - v1 API Implementation

```typescript
private async bookAppointment(
  apiKey: string,
  calendarId: string,
  contactId: string,
  slot: { startTime: string; endTime: string },
  appointmentType: string,
  notes?: string,
  contactEmail?: string,
  contactPhone?: string,
): Promise<any> {
  // Use v1 API with location JWT token
  const response = await fetch(
    'https://rest.gohighlevel.com/v1/appointments',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendarId: calendarId,
        selectedTimezone: 'Europe/London',
        selectedSlot: slot.startTime,
        email: contactEmail,
        phone: contactPhone,
        contact: {
          id: contactId,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to book appointment: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}
```

---

## Testing

### Test Script

**File**: `test-full-booking-flow.mjs`

```bash
node test-full-booking-flow.mjs
```

**Expected Output**:
```
✅ Agent ID: 1b44af8e-d29d-4fdf-98a8-ab586a289e5e
✅ Calendar ID: INV5khuOCZFWKMok132c
✅ Slots Found: 26
✅ BOOKING SUCCESSFUL!
Appointment ID: qnERz89WTEeXnd1PeTn3
```

### Manual API Test

```bash
curl -X POST https://rest.gohighlevel.com/v1/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "calendarId": "INV5khuOCZFWKMok132c",
    "selectedTimezone": "Europe/London",
    "selectedSlot": "2099-12-31T10:00:00+00:00",
    "email": "test@test.co.uk",
    "phone": "+447490253471",
    "contact": {
      "id": "qvCWafwCpdAhVnAbTzWd"
    }
  }'
```

### End-to-End Test

1. Send message in GoHighLevel: "Book me in for 2pm tomorrow"
2. Check Vercel logs for:
   - `[Orchestrator] Executing tool: book_ghl_appointment`
   - `[Orchestrator] Tool result: SUCCESS`
   - Appointment ID in response
3. Verify appointment in GoHighLevel calendar
4. Check AI response to customer

---

## Common Errors & Solutions

### 403 - "Token does not have access to this location"

**Cause**: Using Private App token instead of Location API key
**Solution**: Use Location API Key (JWT) from Business Profile

### 401 - "Invalid JWT"

**Cause**: Using location JWT with v2 API
**Solution**: Use v1 API endpoint (`/v1/appointments`)

### 422 - "selectedTimezone field is mandatory"

**Cause**: Missing required fields
**Solution**: Include `selectedTimezone`, `email` OR `phone`

### 404 - "Not found"

**Cause**: Using v1 endpoint format: `/v1/calendars/{id}/appointments`
**Solution**: Use: `/v1/appointments` (no calendar ID in URL)

---

## Deployment Checklist

- [ ] Location API Key obtained from GoHighLevel
- [ ] Calendar ID confirmed
- [ ] Agent database record updated with correct keys
- [ ] Booking tool code updated to use v1 API
- [ ] Test script passes locally
- [ ] Code deployed to Vercel
- [ ] End-to-end test via GHL webhook
- [ ] Appointment verified in GHL calendar
- [ ] Delete test appointments

---

## Files Reference

### Documentation
- `/docs/ghl-calendar-integration/README.md` - This file
- `/docs/ghl-calendar-integration/API_TESTING.md` - API test results
- `/docs/ghl-calendar-integration/TROUBLESHOOTING.md` - Debug guide

### Code
- `/app/lib/ai-agents/tools/gohighlevel-tools.ts` - Booking tool
- `/app/api/webhooks/ghl/[agentId]/route.ts` - Webhook handler

### Test Scripts
- `/test-full-booking-flow.mjs` - Complete booking test
- `/test-new-api-key.mjs` - API key validation
- `/update-ghl-api-key.mjs` - Database update script

---

## Support Contacts

**GoHighLevel Support**: https://help.gohighlevel.com/
**API Documentation**: https://highlevel.stoplight.io/

---

## Change Log

**October 16, 2025** - Initial working implementation
- Discovered v1 API requirement
- Implemented location JWT authentication
- Successfully created test appointment: `qnERz89WTEeXnd1PeTn3`

**October 15, 2025** - Testing phase
- Tested v2 API (failed with 403/401 errors)
- Tested Private App tokens (permission errors)
- Generated Location API Key

**October 14, 2025** - Initial setup
- Configured agent with calendar ID
- Implemented v2 API (non-functional)
