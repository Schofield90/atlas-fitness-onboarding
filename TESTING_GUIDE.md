# Atlas Fitness Testing Guide

## 🧪 Overview

This project includes comprehensive automated testing for database security, API endpoints, and performance optimization.

## 📦 Test Structure

```
tests/
├── setup/
│   ├── test-database.ts      # Test database configuration
│   ├── jest.setup.ts         # Jest configuration
│   └── database-helpers.sql  # SQL helper functions
├── security/
│   └── organization-isolation.test.ts  # Multi-tenant security tests
├── api/
│   └── auth-middleware.test.ts        # API authentication tests
└── database/
    └── performance.test.ts            # Database performance tests
```

## 🚀 Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:security    # Organization isolation tests
npm run test:api        # API endpoint tests  
npm run test:db         # Database structure tests
npm run test:perf       # Performance tests
```

### Interactive Test Runner
```bash
npm run test:suite
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## 🔧 Test Environment Setup

1. **Environment Variables**
   - Copy `.env.test` for test-specific configuration
   - Tests use mocked external services (Twilio, Stripe, etc.)

2. **Database Setup**
   - Tests can run against a local Supabase instance
   - Or use mocked database responses
   - Run `database-helpers.sql` in your test database for helper functions

## 📋 Test Categories

### 1. Security Tests (`test:security`)
- **Organization Isolation**: Ensures data is properly isolated between organizations
- **Row Level Security**: Validates RLS policies are enforced
- **Cross-Organization Access**: Prevents unauthorized data access
- **Authentication**: Tests auth middleware and token validation

### 2. API Tests (`test:api`)
- **Auth Middleware**: Tests `requireAuth()` and `createOrgScopedClient()`
- **API Endpoints**: Validates proper authentication and organization filtering
- **Error Handling**: Ensures proper error responses
- **Input Validation**: Tests request validation

### 3. Database Tests (`test:db`)
- **Schema Validation**: Ensures required columns exist
- **Constraints**: Tests NOT NULL and foreign key constraints
- **Indexes**: Validates performance indexes are in place
- **Functions**: Tests custom SQL functions

### 4. Performance Tests (`test:perf`)
- **Query Performance**: Ensures queries complete within threshold (100ms)
- **Index Coverage**: Validates indexes on frequently queried columns
- **Bulk Operations**: Tests performance of batch inserts/updates
- **Complex Queries**: Tests multi-condition query performance

## 🎯 Key Test Scenarios

### Organization Isolation
```typescript
// Should prevent cross-organization access
const lead = await createTestLead(orgA.id)
const result = await db
  .from('leads')
  .select()
  .eq('id', lead.id)
  .eq('organization_id', orgB.id) // Different org!
  
expect(result.data).toBeNull()
```

### Auth Middleware
```typescript
// Should add organization_id automatically
const scopedClient = createOrgScopedClient(orgId)
await scopedClient
  .from('leads')
  .insert({ name: 'Test' }) // org_id added automatically
```

### Performance Benchmarks
- Simple queries: < 100ms
- Complex queries: < 150ms  
- Bulk operations: < 500ms

## 📊 Coverage Requirements

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🔍 Debugging Tests

### View SQL Queries
```bash
DEBUG=supabase npm test
```

### Run Single Test
```bash
npm test -- --testNamePattern="should prevent cross-organization"
```

### Test Database State
```sql
-- Check test data
SELECT * FROM organizations WHERE id LIKE 'test-%';
SELECT * FROM users WHERE id LIKE 'test-%';
```

## 🚨 Common Issues

### 1. "Cannot connect to database"
- Ensure Supabase is running locally
- Check `.env.test` has correct credentials

### 2. "RLS policy violations"
- This is expected! Tests verify RLS works
- Check test is using correct user context

### 3. "Performance test failures"
- May indicate missing indexes
- Run `npm run validate-db` to check

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## 📝 Writing New Tests

### Test Template
```typescript
import { describe, it, expect } from '@jest/globals'
import { testDb, setupTestData } from '../setup/test-database'

describe('Feature Name', () => {
  beforeAll(async () => {
    await setupTestData()
  })
  
  it('should do something', async () => {
    // Arrange
    const testData = await createTestData()
    
    // Act
    const result = await performAction(testData)
    
    // Assert
    expect(result).toBeDefined()
  })
})
```

### Best Practices
1. Use descriptive test names
2. Test both success and failure cases
3. Clean up test data after tests
4. Mock external services
5. Test edge cases

## 🎉 Next Steps

1. Add integration tests for complete workflows
2. Add E2E tests with Playwright
3. Set up performance monitoring
4. Add visual regression tests
5. Implement contract testing for APIs