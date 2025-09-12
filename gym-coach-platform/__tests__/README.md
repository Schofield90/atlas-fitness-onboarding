# Messaging System Test Suite

This document provides comprehensive documentation for the messaging system tests that address the foreign key constraint violation bug.

## Bug Summary

The original bug manifested as:

1. Gym owner sends a message to gym goer (creates conversation)
2. Gym goer tries to reply but gets "Failed to initialize chat" error
3. Console shows foreign key constraint violation for conversation_id

The fix implemented:

1. Client-side code now synchronously creates and verifies conversations before sending messages
2. API improved to check for existing conversations first and handle duplicates
3. Added database verification before sending messages
4. Removed problematic retry logic that generated random UUIDs

## Test Coverage

### 1. Unit Tests

#### API Route Tests: `/api/conversations`

**Location**: `__tests__/api/conversations/conversations.test.ts`

**Test Commands**:

```bash
# Run all conversation API tests
npm test -- conversations.test.ts

# Run with coverage
npm test -- conversations.test.ts --coverage

# Watch mode for development
npm test -- conversations.test.ts --watch
```

**Expected Results**:

- ✅ Should create conversations successfully with proper RLS validation
- ✅ Should return existing conversation when duplicate creation is attempted
- ✅ Should handle authentication failures (401)
- ✅ Should validate required fields (400)
- ✅ Should check organization permissions (404)
- ✅ Should handle database errors gracefully (500)
- ✅ Should fetch conversations with proper filtering and pagination

**Key Test Scenarios**:

- Conversation creation with valid data
- Duplicate conversation handling via `get_or_create_conversation` RPC
- Foreign key constraint violation handling
- Organization membership verification
- Client existence validation

#### API Route Tests: `/api/conversations/[id]/messages`

**Location**: `__tests__/api/conversations/messages.test.ts`

**Test Commands**:

```bash
# Run all message API tests
npm test -- messages.test.ts

# Run specific test group
npm test -- messages.test.ts --testNamePattern="POST"
```

**Expected Results**:

- ✅ Should create messages successfully for both coach and client users
- ✅ Should verify conversation existence before message creation
- ✅ Should handle authentication and authorization properly
- ✅ Should validate message content requirements
- ✅ Should handle foreign key constraint violations gracefully
- ✅ Should fetch messages with proper pagination and read status updates
- ✅ Should trim message content whitespace

### 2. Integration Tests

#### Complete Messaging Flow

**Location**: `__tests__/unit/messaging/messaging-flow.integration.test.ts`

**Test Commands**:

```bash
# Run integration tests
npm test -- messaging-flow.integration.test.ts

# Run with verbose output for debugging
npm test -- messaging-flow.integration.test.ts --verbose
```

**Expected Results**:

- ✅ Complete gym owner to gym goer messaging flow without foreign key errors
- ✅ Race condition handling for concurrent conversation creation
- ✅ Message verification when conversation doesn't exist
- ✅ Conversation state maintenance across multiple message exchanges
- ✅ Graceful handling of conversation creation failures and retries
- ✅ Database consistency and referential integrity maintenance

**Key Integration Scenarios**:

- End-to-end messaging flow from coach to client
- Conversation persistence verification
- Race condition handling
- Recovery from failed conversation creation
- Database referential integrity checks

### 3. Edge Case Tests

#### Network Failures and Race Conditions

**Location**: `__tests__/unit/messaging/edge-cases.test.ts`

**Test Commands**:

```bash
# Run edge case tests
npm test -- edge-cases.test.ts

# Run specific edge case category
npm test -- edge-cases.test.ts --testNamePattern="Network Failures"
npm test -- edge-cases.test.ts --testNamePattern="Race Condition"
```

**Expected Results**:

**Network Failures**:

- ✅ Database connection timeout handling
- ✅ Database deadlock recovery
- ✅ Constraint violation error reporting
- ✅ Partial database response handling
- ✅ Malformed request data validation
- ✅ Large data value handling

**Race Conditions**:

- ✅ Concurrent conversation creation resolution
- ✅ Concurrent message creation handling
- ✅ Message sending during conversation deletion
- ✅ Session expiry during long operations
- ✅ Rapid API call rate limiting
- ✅ Data integrity maintenance

### 4. End-to-End Tests

#### Foreign Key Constraint Bug Simulation

**Location**: `__tests__/e2e/messaging/foreign-key-bug.spec.ts`

**Test Commands**:

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- foreign-key-bug.spec.ts

# Run E2E tests with UI mode for debugging
npm run test:e2e:ui
```

**Expected Results**:

- ✅ Complete messaging flow without foreign key constraint violations
- ✅ Network failure handling during conversation creation
- ✅ Message sending prevention when conversation verification fails
- ✅ Concurrent conversation creation handling in browser
- ✅ Proper synchronization of conversation creation before message sending
- ✅ Appropriate error message display for different failure scenarios

## Running All Tests

### Sequential Test Execution

```bash
# Run all tests in sequence
npm run test:all

# Run unit tests only
npm test

# Run E2E tests only
npm run test:e2e

# Run tests with coverage report
npm run test:coverage
```

### Parallel Test Execution (Faster)

```bash
# Run unit and integration tests in parallel
npm test -- --maxWorkers=4

# Run with coverage and parallel execution
npm run test:coverage -- --maxWorkers=4
```

## Expected Test Results Summary

### Unit Tests

- **Total Tests**: ~45 test cases
- **Coverage Target**: >90% for messaging system components
- **Expected Runtime**: <30 seconds
- **All tests should pass**: ✅

### Integration Tests

- **Total Tests**: ~8 comprehensive integration scenarios
- **Expected Runtime**: <45 seconds
- **All tests should pass**: ✅

### E2E Tests

- **Total Tests**: ~6 end-to-end scenarios
- **Expected Runtime**: 2-3 minutes (depends on browser startup)
- **All tests should pass**: ✅

## Debugging Failed Tests

### Common Issues and Solutions

1. **Foreign Key Constraint Violations**

   ```bash
   # Check if conversation exists before message creation
   npm test -- --testNamePattern="should ensure conversation exists"
   ```

2. **Race Condition Failures**

   ```bash
   # Run race condition tests in isolation
   npm test -- --testNamePattern="concurrent" --runInBand
   ```

3. **E2E Test Timeouts**

   ```bash
   # Increase timeout for slower environments
   npm run test:e2e -- --timeout=60000
   ```

4. **Database Connection Issues**
   ```bash
   # Verify mock database state in integration tests
   npm test -- --testNamePattern="Database Consistency" --verbose
   ```

### Test Environment Setup

Ensure these are configured before running tests:

1. **Jest Configuration**: `jest.config.js` is properly configured
2. **Playwright Configuration**: `playwright.config.ts` includes correct base URLs
3. **Mock Database**: Integration tests use proper mock database state
4. **Environment Variables**: Test environment has required variables set

## Continuous Integration

### GitHub Actions / CI Configuration

Add these scripts to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm test -- --coverage --watchAll=false

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# Run messaging system tests before commit
npm test -- --testPathPattern=messaging --passWithNoTests=false
```

## Performance Expectations

### Test Execution Times

- **Unit Tests**: <30 seconds
- **Integration Tests**: <45 seconds
- **E2E Tests**: 2-3 minutes
- **Total Test Suite**: <5 minutes

### Coverage Targets

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%
- **Statement Coverage**: >90%

## Monitoring and Alerting

### Test Failure Notifications

Set up alerts for:

- Foreign key constraint violations in logs
- Message sending failures above threshold
- Conversation creation timeout increases
- Database connection errors

### Performance Monitoring

Track:

- Conversation creation success rate
- Message delivery success rate
- API response times for messaging endpoints
- Database query performance for messaging operations

## Conclusion

This comprehensive test suite ensures that the foreign key constraint violation bug is permanently resolved and provides robust protection against regression. The tests cover:

✅ **Unit Level**: API endpoints and individual functions  
✅ **Integration Level**: Complete messaging workflows  
✅ **E2E Level**: Real user scenarios and browser interactions  
✅ **Edge Cases**: Network failures, race conditions, and data integrity

Run these tests regularly and especially before deploying any changes to the messaging system.
