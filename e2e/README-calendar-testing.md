# Atlas Fitness Calendar E2E Testing Strategy

## Overview

This comprehensive E2E testing strategy for the Atlas Fitness CRM class calendar functionality is designed to ensure that class times display correctly, navigation works properly, and timezone handling is consistent across all scenarios.

## Test Architecture

### Test Organization

The calendar E2E tests are organized into four specialized test suites:

1. **`calendar-time-display-comprehensive.spec.ts`** - Core time display verification
2. **`calendar-navigation-comprehensive.spec.ts`** - Navigation consistency testing
3. **`calendar-timezone-edge-cases.spec.ts`** - Timezone and edge case handling
4. **`calendar-database-consistency.spec.ts`** - Database-UI consistency verification

### Test Data Management

Each test suite creates its own test data and cleans up after completion to avoid interference between tests. Test classes are created with:

- Unique names with timestamps or identifiers
- Specific times designed to catch common timezone bugs
- Known organization ID for isolation
- Predictable patterns for verification

## Key Test Scenarios

### 1. Time Display Verification (`calendar-time-display-comprehensive.spec.ts`)

**Purpose**: Verify that class times display correctly in the calendar, catching specific bugs like:

- 6am classes showing as 7am
- 6pm classes showing as 7:30am
- Times changing unexpectedly

**Key Tests**:

- ✅ `should create and verify 6am class displays correctly as 06:00`
- ✅ `should create and verify 6pm class displays correctly as 18:00 or 6:00 PM`
- ✅ `should verify multiple classes at different times display correctly`
- ✅ `should maintain correct times when switching between calendar views`
- ✅ `should verify database times match calendar display`

**Test Strategy**:

- Create classes at specific problematic times (6am, 6pm, etc.)
- Verify both 24-hour and 12-hour time format displays
- Test across different calendar views (day, week, month)
- Compare database stored times with UI displayed times

### 2. Navigation Consistency (`calendar-navigation-comprehensive.spec.ts`)

**Purpose**: Ensure calendar navigation doesn't cause classes to disappear or change times.

**Key Tests**:

- ✅ `should maintain consistent times when navigating to next week`
- ✅ `should maintain correct times across multiple week navigations`
- ✅ `should handle month boundary navigation correctly`
- ✅ `should not lose classes when rapidly navigating`
- ✅ `should maintain time consistency when switching views during navigation`
- ✅ `should handle Today button correctly from different time periods`
- ✅ `should verify calendar date display updates correctly during navigation`

**Test Strategy**:

- Create reference classes at known times across multiple days
- Navigate extensively through the calendar
- Verify times remain consistent after navigation
- Test rapid navigation to catch race conditions
- Verify "Today" button functionality

### 3. Timezone & Edge Cases (`calendar-timezone-edge-cases.spec.ts`)

**Purpose**: Handle complex timezone scenarios and edge cases that could cause time display issues.

**Key Tests**:

- ✅ `should handle midnight boundary classes correctly`
- ✅ `should handle Daylight Saving Time transition dates`
- ✅ `should handle year boundary navigation correctly`
- ✅ `should handle leap year dates correctly`
- ✅ `should handle timezone consistency across browser refresh`
- ✅ `should handle empty calendar state gracefully`

**Test Strategy**:

- Test classes that span midnight
- Test DST transition periods
- Test year/month boundaries
- Test browser refresh scenarios
- Test empty state edge cases

### 4. Database Consistency (`calendar-database-consistency.spec.ts`)

**Purpose**: Verify that database stored times exactly match calendar display times.

**Key Tests**:

- ✅ `should verify database time matches calendar display exactly`
- ✅ `should maintain time consistency through CRUD operations`
- ✅ `should handle concurrent session creation without time corruption`
- ✅ `should verify database query consistency across multiple requests`
- ✅ `should verify time zone handling in database vs calendar`
- ✅ `should verify data integrity after multiple operations`

**Test Strategy**:

- Create classes with precise timestamps
- Verify database vs UI time consistency
- Test CRUD operations maintain time integrity
- Test concurrent operations don't corrupt times
- Test timezone conversion accuracy

## Running the Tests

### Prerequisites

1. **Environment Setup**:

   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
   export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   ```

2. **Authentication State**:
   Tests require `.auth/owner.json` authentication state file. Run the auth setup first:
   ```bash
   npx playwright test e2e/auth-setup.spec.ts
   ```

### Running Individual Test Suites

```bash
# Time display tests
npx playwright test e2e/calendar-time-display-comprehensive.spec.ts

# Navigation tests
npx playwright test e2e/calendar-navigation-comprehensive.spec.ts

# Timezone and edge cases
npx playwright test e2e/calendar-timezone-edge-cases.spec.ts

# Database consistency
npx playwright test e2e/calendar-database-consistency.spec.ts
```

### Running All Calendar Tests

```bash
npx playwright test e2e/calendar-*comprehensive*.spec.ts e2e/calendar-*edge-cases*.spec.ts e2e/calendar-*consistency*.spec.ts
```

### Running with Different Options

```bash
# Run with UI mode for debugging
npx playwright test e2e/calendar-time-display-comprehensive.spec.ts --ui

# Run in headed mode
npx playwright test e2e/calendar-time-display-comprehensive.spec.ts --headed

# Run with HTML reporter
npx playwright test e2e/calendar-*comprehensive*.spec.ts --reporter=html

# Run with trace on failure
npx playwright test e2e/calendar-*comprehensive*.spec.ts --trace=on-first-retry

# Run specific test
npx playwright test -g "should create and verify 6am class displays correctly"
```

## Test Execution Strategy

### Development Testing

During development, run tests in this order:

1. **Time Display Tests** - Core functionality verification
2. **Database Consistency** - Verify data integrity
3. **Navigation Tests** - Interaction testing
4. **Edge Cases** - Comprehensive coverage

### CI/CD Integration

For automated testing:

```yaml
- name: Run Calendar E2E Tests
  run: |
    npx playwright test e2e/calendar-time-display-comprehensive.spec.ts
    npx playwright test e2e/calendar-navigation-comprehensive.spec.ts  
    npx playwright test e2e/calendar-timezone-edge-cases.spec.ts
    npx playwright test e2e/calendar-database-consistency.spec.ts
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Expected Test Results

### Success Indicators ✅

- All classes display correct times in both 12-hour and 24-hour formats
- 6am classes show as 06:00 or 6:00 AM (not 7:00 AM)
- 6pm classes show as 18:00 or 6:00 PM (not 7:30 AM)
- Times remain consistent during navigation
- Database stored times match UI displayed times exactly
- No JavaScript errors in console
- Calendar responds correctly to view changes
- Edge cases handled gracefully

### Failure Indicators ❌

- Classes show incorrect times
- Times change during navigation
- Classes disappear after navigation
- Database times don't match UI times
- JavaScript errors in console
- Calendar becomes unresponsive
- Edge cases cause crashes

## Debugging Failed Tests

### Common Issues and Solutions

1. **Time Display Mismatches**:

   ```bash
   # Check browser timezone
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

   # Verify database timezone
   SELECT start_time, created_at FROM class_sessions WHERE name = 'test_class'
   ```

2. **Navigation Issues**:

   ```bash
   # Run with trace to see navigation flow
   npx playwright test --trace=on calendar-navigation-comprehensive.spec.ts

   # Check for network errors
   npx playwright test --headed calendar-navigation-comprehensive.spec.ts
   ```

3. **Authentication Problems**:

   ```bash
   # Regenerate auth state
   npx playwright test e2e/auth-setup.spec.ts

   # Verify auth state exists
   ls -la .auth/
   ```

4. **Environment Issues**:
   ```bash
   # Verify environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

### Debug Mode Execution

```bash
# Run with maximum debugging
DEBUG=pw:* npx playwright test e2e/calendar-time-display-comprehensive.spec.ts --headed --trace=on
```

### Screenshot Analysis

Tests automatically capture screenshots at key points:

- `6am-class-display.png` - Verification of 6am class display
- `6pm-class-display.png` - Verification of 6pm class display
- `multiple-classes-display.png` - Multiple time verification
- `after-week-navigation.png` - Post-navigation state
- `midnight-boundary-classes.png` - Edge case handling
- `dst-transition-test.png` - DST handling
- `database-precision-test.png` - Database consistency

## Test Maintenance

### Updating Test Data

When modifying tests:

1. Update expected times in test constants
2. Adjust timezone-specific test dates
3. Update class capacity/instructor names as needed
4. Verify cleanup procedures still work

### Adding New Test Cases

Template for new test:

```typescript
test("should verify new scenario", async ({ page }) => {
  // 1. Create test data
  const testTime = new Date();
  // ... setup

  // 2. Create class via API
  const createResponse = await page.evaluate(async (data) => {
    // ... API call
  });

  expect(createResponse.success).toBe(true);
  createdClassIds.push(createResponse.session.id);

  // 3. Navigate to calendar
  await page.goto("/class-calendar");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 4. Verify expectations
  // ... assertions

  // 5. Optional screenshot
  await page.screenshot({ path: "e2e/screenshots/new-scenario.png" });
});
```

### Performance Considerations

- Each test suite should complete within 5-10 minutes
- Individual tests should complete within 2 minutes
- Use `page.waitForTimeout()` sparingly, prefer `waitForLoadState()`
- Clean up test data to prevent database bloat
- Use parallel execution where possible

## Integration with Existing Tests

### Relationship to Other Test Suites

These calendar tests complement existing test suites:

- **`booking-flow.test.ts`** - Calendar tests verify time display, booking tests verify booking functionality
- **`calendar-basic-functionality.spec.ts`** - Basic tests cover simple scenarios, comprehensive tests cover complex ones
- **`timezone-issue.spec.ts`** - Focused timezone tests, comprehensive tests cover broader scenarios

### Test Execution Order

Recommended execution order for full test suite:

1. Authentication setup
2. Calendar time display tests (core functionality)
3. Calendar database consistency (data integrity)
4. Calendar navigation tests (user interactions)
5. Calendar edge cases (comprehensive coverage)
6. Booking flow tests (dependent functionality)

## Monitoring and Alerting

### Key Metrics to Track

- Test execution time trends
- Test failure patterns
- Screenshot diff analysis
- Console error frequency
- Database query performance during tests

### Alert Conditions

Set up alerts for:

- Test failure rate > 5%
- Test execution time > 15 minutes
- Consistent timezone-related failures
- Database inconsistency errors

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Compare calendar screenshots over time
2. **Performance Testing**: Measure calendar load times with many classes
3. **Mobile Testing**: Test calendar on mobile devices
4. **Accessibility Testing**: Verify calendar is accessible
5. **Load Testing**: Test calendar with hundreds of concurrent users
6. **Cross-Browser Testing**: Test calendar across different browsers

### Test Coverage Goals

- ✅ Time display accuracy: 100%
- ✅ Navigation consistency: 100%
- ✅ Timezone handling: 95%
- ✅ Edge cases: 90%
- ✅ Database consistency: 100%
- 🔄 Performance: 80% (planned)
- 🔄 Accessibility: 70% (planned)
- 🔄 Mobile: 60% (planned)

This comprehensive test strategy ensures the Atlas Fitness calendar functions correctly across all scenarios and provides confidence that time display issues are caught and prevented.
