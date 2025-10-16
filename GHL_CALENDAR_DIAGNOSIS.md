# GoHighLevel Calendar Booking Issue - Root Cause Analysis

**Date**: October 16, 2025
**Issue**: AI agent offers already-booked appointment times
**Status**: ❌ **API PERMISSIONS INSUFFICIENT**

## Problem Summary

When user asks for appointment at 1pm:
- ✅ Agent correctly identifies 1pm is not available
- ❌ Agent offers alternatives (8:30am, 9am, 12:30pm) that are ALSO already booked
- User reports these times show as booked in GoHighLevel calendar

## Root Cause

The GoHighLevel API key currently stored only has permissions for:
- ✅ `/calendars/{id}/free-slots` - Returns availability **windows** (when calendar is generally open)

But lacks permissions for:
- ❌ `/calendars/appointments` - Returns **actual bookings** (to filter out booked times)
- ❌ `/opportunities` - Alternative endpoint for bookings
- ❌ `/calendars/{id}` - Calendar details

### Test Results

```
API Key Type: JWT token (eyJhbGciOiJIUzI1NiIs...)
Length: 213 characters

✅ GET /calendars/{id}/free-slots
   Status: 200 OK
   Returns: 16 time slots for tomorrow

❌ GET /calendars/appointments?calendarId={id}
   Status: 401 Unauthorized
   Error: "Invalid JWT"

❌ GET /opportunities/search?location_id={id}
   Status: 401 Unauthorized
   Error: "Invalid JWT"

❌ GET /calendars/{id}
   Status: 401 Unauthorized
   Error: "Invalid JWT"
```

## Current Behavior

**What the code does:**
1. Fetch availability windows from `/free-slots` ✅
2. **Attempt** to fetch booked appointments ❌ (fails with 401)
3. If appointments fetch fails, code has fallback: "just use free-slots" ❌
4. Return ALL availability windows (including booked times) ❌
5. User gets offered times that are already booked ❌

**Code location**: `/app/lib/ai-agents/tools/gohighlevel-tools.ts:252-277`

```typescript
// Step 2: Fetch existing appointments for this day to exclude booked slots
const appointmentsResponse = await fetch(
  `https://services.leadconnectorhq.com/calendars/events/appointments?...`,
  { headers: { Authorization: `Bearer ${apiKey}` } }
);

// Get booked times (may fail if permissions lacking, that's ok - we'll just use free-slots)
const bookedTimes = new Set<string>();
if (appointmentsResponse.ok) {  // ← This check FAILS (401 error)
  // ... populate bookedTimes (NEVER RUNS)
}

// Filter out booked times
const availableSlots = allSlots.filter(slot => {
  return !bookedTimes.has(slotTime);  // ← bookedTimes is EMPTY, so nothing filtered
});
```

## Why This Happened

1. **GHL has different API key types**:
   - Calendar-specific keys (limited permissions)
   - Location-level keys (full permissions)
   - Private Integration keys (app-level access)

2. **Current key is calendar-specific**:
   - Can read availability windows
   - Cannot read bookings
   - Cannot read calendar details

3. **Fix was deployed but doesn't work**:
   - Commit `4ddad474` added appointments filtering
   - But appointments API call fails silently
   - Fallback behavior returns unfiltered slots

## Solution Options

### Option 1: Generate New GHL API Key ✅ RECOMMENDED

**Steps for user:**
1. Log into GoHighLevel
2. Go to Location Settings → Integrations → API
3. Generate a NEW API key with these scopes:
   - ✅ `calendars.readonly` OR `calendars.write`
   - ✅ `contacts.readonly` (for contact lookup)
4. Copy the new API key
5. Update agent configuration with new key

**Where to update**:
- Agent settings page → GoHighLevel Integration section
- Field: `ghl_api_key`

### Option 2: Use Direct Booking Link (Temporary Workaround)

**Modify system prompt** to include:
```
When user wants to book a call, send them the direct booking link:
https://api.leadconnectorhq.com/widget/bookings/apyork/discoverycall

This ensures they see real-time availability from GoHighLevel.
Do NOT attempt to book via the tool - just provide the link.
```

**Pros:**
- Works immediately
- Shows real-time availability
- No API permission issues

**Cons:**
- Not fully automated
- User clicks external link
- Breaks conversational flow

### Option 3: Check Different API Key in Metadata

**Current keys in database:**
- `ghl_api_key`: Same JWT as above (401 errors)
- `metadata.gohighlevel_api_key`: Same JWT (401 errors)
- `metadata.gohighlevel_private_integration_key`: `pit-25953c8d-bf25-4018-9718-f87ad28629ac`

**Try private integration key:**
- May have different permissions
- Test if it can access appointments API
- If yes, update code to use this key instead

## Recommended Action

**Immediate** (User Action Required):
1. Generate new GHL API key with `calendars.readonly` scope
2. Update agent configuration
3. Test booking with "Can you book me for 1pm tomorrow?"
4. Verify alternatives offered are actually available

**Alternative** (Code Change):
1. Update tool to use `metadata.gohighlevel_private_integration_key` if it has permissions
2. Test appointments API with private key
3. Fallback to booking link if API still fails

## Testing Commands

**After getting new API key:**

```bash
# Test new key has appointments access
NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://...', process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const NEW_API_KEY = 'paste_new_key_here';

  const response = await fetch(
    'https://services.leadconnectorhq.com/calendars/appointments?calendarId=INV5khuOCZFWKMok132c&limit=10',
    { headers: { 'Authorization': 'Bearer ' + NEW_API_KEY, 'Version': '2021-07-28' } }
  );

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 200));

  if (response.ok) {
    console.log('✅ NEW KEY WORKS! Update agent config with this key.');
  } else {
    console.log('❌ Key still lacks permissions. Try different scopes.');
  }
})();
"
```

## Next Steps

**User needs to:**
1. Read this diagnosis
2. Choose Option 1 (new API key) OR Option 2 (booking link workaround)
3. Provide feedback on which approach to take

**Then I will:**
1. Update agent configuration with new key (if Option 1)
2. Update system prompt with booking link (if Option 2)
3. Redeploy and test
4. Verify bookings respect actual calendar availability
