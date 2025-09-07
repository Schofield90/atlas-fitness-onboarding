# Atlas Fitness Booking Flow - E2E Test Suite

## Overview

This comprehensive E2E test suite validates the Atlas Fitness booking system fixes, specifically testing the dual customer architecture (clients vs leads) and ensuring all database schema changes work correctly.

## Tests Covered

### 🎯 Core Booking Functionality

- **Single Class Booking (Client)**: Tests booking from Members tab using client_id field
- **Single Class Booking (Lead)**: Tests booking from Leads tab using customer_id field
- **Multi-Class Booking**: Tests MultiClassBookingModal bulk booking functionality

### 💳 Payment Method Testing

- **Membership Payment**: Tests membership usage with class limits tracking
- **Class Package Payment**: Tests package credit deduction and tracking
- **Card Payment Flow**: Tests card payment processing without connection errors
- **Free Booking**: Tests complimentary bookings

### 🔒 Database Schema Validation

- **Dual Customer Architecture**: Validates client_id and customer_id constraints
- **Foreign Key Integrity**: Ensures no constraint violations
- **Membership Usage Tracking**: Verifies classes_used_this_period increments
- **Package Credit Tracking**: Validates classes_remaining decrements

### 🐛 Bug Fix Verification

- **Phantom Booking Prevention**: Tests fix for false "already booked" messages
- **API Error Prevention**: Ensures no 400 errors in Continue to Payment flow
- **Connection Error Resolution**: Validates database schema fixes prevent connection drops

## Test Data Structure

### Test Organization

- Uses existing "E2E Test Gym" or creates one with known ID
- Isolated test data that doesn't interfere with production

### Test Customers

- **Test Client**: Created in `clients` table for client booking tests
- **Test Lead**: Created in `leads` table for lead booking tests
- Both have unique timestamped emails to prevent conflicts

### Test Classes

- **Morning Yoga**: £20, tomorrow 9-10 AM, Studio A
- **HIIT Training**: £25, tomorrow 6-7 PM, Main Gym
- **Pilates**: £18, day after tomorrow 10-11 AM, Studio B

### Test Payment Methods

- **Test Membership**: 10 classes/period, 3 already used (7 remaining)
- **Test Class Package**: 5 classes total, 2 already used (3 remaining)
- **Free Booking**: Available for all test scenarios
- **Card Payment**: Available for paid classes

## Running the Tests

### Prerequisites

```bash
# Required environment variables
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

### Quick Start

```bash
# Run all booking flow tests
./run-booking-tests.sh
```

### Manual Execution

```bash
# Install dependencies
npm install

# Run specific test file
npx playwright test e2e/booking-flow-fixed.test.ts

# Run with UI mode for debugging
npx playwright test e2e/booking-flow-fixed.test.ts --ui

# Run with HTML reporter
npx playwright test e2e/booking-flow-fixed.test.ts --reporter=html
```

### Individual Test Execution

```bash
# Run only client booking tests
npx playwright test -g "Should book a single class for a client"

# Run only membership tests
npx playwright test -g "membership"

# Run only schema validation
npx playwright test -g "database schema"
```

## Test Scenarios Explained

### 1. Client Booking Test

```typescript
// Validates:
// - client_id field is populated correctly
// - customer_id remains null
// - Membership usage increments
// - No foreign key violations
```

### 2. Lead Booking Test

```typescript
// Validates:
// - customer_id field is populated correctly
// - client_id remains null
// - Free booking flow works
// - Dual architecture support
```

### 3. Multi-Class Booking Test

```typescript
// Validates:
// - MultiClassBookingModal functionality
// - Bulk payment method assignment
// - Multiple booking creation
// - Mixed payment methods
```

### 4. Phantom Booking Prevention

```typescript
// Validates:
// - Legitimate "already booked" messages work
// - No false positives from NULL class_session_ids
// - Other classes remain bookable
// - Proper booking conflict detection
```

### 5. Database Schema Validation

```typescript
// Validates:
// - check_customer_or_client_booking constraint
// - Prevents both fields being set
// - Prevents both fields being null
// - Indexes work correctly
```

## Expected Test Results

### Success Indicators ✅

- All bookings create database records correctly
- Membership usage increments accurately
- Package credits decrement properly
- No 400/500 HTTP errors during booking flow
- Proper constraint validation
- Clean test data setup and teardown

### Failure Indicators ❌

- Foreign key constraint violations
- Connection errors (net::ERR_CONNECTION_CLOSED)
- False "already booked" messages
- Incorrect membership/package usage tracking
- API 400 errors in Continue to Payment flow

## Debugging Failed Tests

### Common Issues

1. **Environment Variables Missing**

   ```bash
   Error: Missing required environment variables
   Solution: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Database Schema Out of Sync**

   ```bash
   Error: Could not find the 'client_id' column
   Solution: Apply migration 20250918_fix_booking_client_support.sql
   ```

3. **Test Data Conflicts**

   ```bash
   Error: duplicate key value violates unique constraint
   Solution: Clear test data or wait for unique timestamps
   ```

4. **Server Not Ready**
   ```bash
   Error: Timeout waiting for page
   Solution: Increase server startup wait time in test script
   ```

### Debug Mode

```bash
# Run with debug logging
DEBUG=pw:* npx playwright test e2e/booking-flow-fixed.test.ts

# Run in headed mode to see browser
npx playwright test e2e/booking-flow-fixed.test.ts --headed

# Run with slowmo for step-by-step viewing
npx playwright test e2e/booking-flow-fixed.test.ts --headed --slowmo=1000
```

## Test Maintenance

### Updating Test Data

- Modify `test.beforeAll()` to adjust test scenarios
- Update class session times if tests fail due to past dates
- Adjust membership/package limits as needed

### Adding New Tests

- Follow existing naming convention: `Should [action] - Testing [feature]`
- Include comprehensive database validation
- Add proper cleanup in `test.afterAll()`
- Document expected behavior in comments

### Performance Expectations

- Booking modal should load within 3 seconds
- Individual booking creation should complete within 10 seconds
- Full test suite should complete within 5-10 minutes
- No memory leaks or hanging processes

## Integration with CI/CD

```yaml
# Example GitHub Actions workflow
- name: Run Booking E2E Tests
  run: |
    npm ci
    npm run build
    npx playwright test e2e/booking-flow-fixed.test.ts
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Reporting Issues

When reporting test failures, include:

1. Full error message and stack trace
2. Environment details (Node version, OS)
3. Database migration status
4. Network logs from browser dev tools
5. Supabase logs if available

## Related Documentation

- [BOOKING_SYSTEM_FIX_STATUS.md](../BOOKING_SYSTEM_FIX_STATUS.md) - Details of fixes implemented
- [BOOKING_SYSTEM_DEBUG_SUMMARY.md](../BOOKING_SYSTEM_DEBUG_SUMMARY.md) - Debug process notes
- [booking-flow.test.ts](./booking-flow.test.ts) - Original test file for comparison
