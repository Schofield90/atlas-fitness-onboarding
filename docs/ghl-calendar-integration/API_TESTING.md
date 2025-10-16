# GoHighLevel API Testing Results

Complete record of all API endpoint tests performed to find the working solution.

---

## Test Summary

**Date**: October 16, 2025
**Total Tests**: 12 endpoints tested
**Result**: ✅ Found working solution

---

## Endpoints Tested

### v2 API - `/calendars/events/appointments`

**URL**: `https://services.leadconnectorhq.com/calendars/events/appointments`

#### Private App Token (`pit-c19934db...`)
- **Status**: 403 Forbidden
- **Error**: `"The token does not have access to this location"`
- **Diagnosis**: Private App tokens can't access location-scoped resources

#### Location JWT Token
- **Status**: 401 Unauthorized
- **Error**: `"Invalid JWT"`
- **Diagnosis**: v2 API doesn't accept location JWT tokens

---

### v2 API - `/calendars/appointments`

**URL**: `https://services.leadconnectorhq.com/calendars/appointments`

#### Both Tokens
- **Status**: 401 Unauthorized
- **Error**: `"This route is not yet supported by the IAM Service"`
- **Diagnosis**: Endpoint not fully implemented yet

---

### v1 API - `/calendars/{id}/appointments`

**URL**: `https://rest.gohighlevel.com/v1/calendars/INV5khuOCZFWKMok132c/appointments`

#### Both Tokens
- **Status**: 404 Not Found
- **Error**: `{"msg":"Not found"}`
- **Diagnosis**: Wrong URL format for v1 API

---

### v1 API - `/appointments` ✅ WORKING

**URL**: `https://rest.gohighlevel.com/v1/appointments`

#### Private App Token
- **Status**: 401 Unauthorized
- **Error**: `"Api key is invalid"`
- **Diagnosis**: v1 API only accepts location JWTs

#### Location JWT Token (Initial)
- **Status**: 422 Unprocessable Entity
- **Error**: `"selectedTimezone field is mandatory"`
- **Diagnosis**: Missing required fields

#### Location JWT Token (With Timezone)
- **Status**: 422 Unprocessable Entity
- **Error**: `"email field is mandatory" OR "phone field is mandatory"`
- **Diagnosis**: Needs email or phone

#### Location JWT Token (Complete) ✅
- **Status**: 200 OK
- **Response**: Appointment created successfully
- **Appointment ID**: `qnERz89WTEeXnd1PeTn3`
- **Diagnosis**: WORKS PERFECTLY!

---

## Working Request Format

### Headers

```http
POST /v1/appointments HTTP/1.1
Host: rest.gohighlevel.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Body

```json
{
  "calendarId": "INV5khuOCZFWKMok132c",
  "selectedTimezone": "Europe/London",
  "selectedSlot": "2099-12-31T10:00:00+00:00",
  "email": "test2@test.co.uk",
  "phone": "+447490253471",
  "contact": {
    "id": "qvCWafwCpdAhVnAbTzWd"
  }
}
```

### Response (200 OK)

```json
{
  "id": "qnERz89WTEeXnd1PeTn3",
  "contactId": "4d44cb97-5329-4d4d-ba07-bc430f9979c3",
  "sessionFingerprint": "de9d53ef-ed55-4464-8762-26974075b0f2",
  "contact": {
    "dateAdded": "2022-11-28T18:30:11.000Z",
    "type": "lead",
    "locationId": "LlYsDmB3c62k0au1YcHh",
    "country": "GB",
    "phone": "+447490253471",
    "fingerprint": "4d44cb97-5329-4d4d-ba07-bc430f9979c3",
    "lastName": "Schofield",
    "email": "test2@test.co.uk",
    "firstName": "Sam",
    "tags": [...]
  },
  "sessionId": "54f9afcc-80fd-45e8-9c02-cd0c711c966b"
}
```

---

## Calendar Slot Fetching

### Working Endpoint

**URL**: `https://services.leadconnectorhq.com/calendars/{id}/free-slots`

**Method**: GET

**Query Parameters**:
- `startDate`: Unix timestamp in milliseconds (e.g., `1760569200000`)
- `endDate`: Unix timestamp in milliseconds

**Response Format**:
```json
{
  "2025-10-16": {
    "slots": [
      "2025-10-16T09:30:00+01:00",
      "2025-10-16T09:45:00+01:00",
      "2025-10-16T10:00:00+01:00",
      ...
    ]
  },
  "traceId": "430a44c3-2d9b-417e-b4d1-f74a2dcf02b5"
}
```

**Works With**:
- ✅ Private App tokens
- ✅ Location JWT tokens

---

## Key Findings

### API Version Differences

| Feature | v1 API | v2 API |
|---------|--------|--------|
| Endpoint | `/v1/appointments` | `/calendars/events/appointments` |
| Token Type | Location JWT only | Private App only |
| Required Fields | timezone, email/phone | startTime, title |
| Calendar in URL | ❌ In body | ✅ In path |
| Status | ✅ Working | ❌ Permission errors |

### Token Compatibility

| Token Type | v1 Appointments | v2 Appointments | v2 Free Slots |
|------------|----------------|-----------------|---------------|
| Private App (`pit-...`) | ❌ 401 | ❌ 403 | ✅ Works |
| Location JWT | ✅ Works | ❌ 401 | ✅ Works |
| Zapier JWT (old) | ❌ Untested | ❌ 401 | ✅ Works |

---

## Lessons Learned

1. **Location JWT tokens only work with v1 API** for appointments
2. **v2 API requires Private App tokens** but has location access issues
3. **Calendar slot fetching works across all token types** (v2 API)
4. **v1 appointments endpoint requires more fields** than v2
5. **Error messages are misleading** - 422 validation errors led to success

---

## Test Scripts Used

### Full Test Suite
```bash
node /tmp/test-all-booking-endpoints.mjs
```

### Working Test
```bash
node /tmp/test-v1-complete.mjs
```

### Results
- **12 different combinations tested**
- **Only 1 worked**: v1 API + Location JWT + complete fields
- **Time to solution**: ~2 hours of systematic testing

---

## Next Steps

- [x] Document working solution
- [x] Update booking tool code
- [ ] Deploy to production
- [ ] Test end-to-end via webhook
- [ ] Monitor for API changes

---

## API Documentation Links

**Official Docs**: https://highlevel.stoplight.io/
**v1 Appointments**: https://rest.gohighlevel.com/v1/docs#tag/Appointments
**v2 Calendars**: https://highlevel.stoplight.io/docs/integrations/
