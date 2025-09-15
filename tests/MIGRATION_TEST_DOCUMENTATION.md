# Migration CSV Parsing Test Suite Documentation

## Overview

This comprehensive test suite verifies the resolution of the bucket mismatch issue in the migration wizard CSV processing system. The main issue was that files were being uploaded to the "migration-uploads" bucket but the parse-csv route was attempting to download from "migration-files", causing 400 Bad Request errors.

## Test Structure

### 📁 Test Files Organization

```
tests/
├── api/
│   └── migration-parse-csv.test.ts          # API endpoint unit tests
├── unit/
│   ├── migration-file-formats.test.ts       # File format handling tests
│   ├── migration-error-handling.test.ts     # Error scenarios tests
│   └── migration-security.test.ts           # Security & isolation tests
├── integration/
│   └── migration-bucket-fix.test.ts         # Bucket fix verification tests
├── e2e/
│   └── migration-workflow.spec.ts           # End-to-end workflow tests
├── run-migration-tests.sh                   # Comprehensive test runner
└── MIGRATION_TEST_DOCUMENTATION.md          # This documentation
```

## Test Categories

### 🔧 Unit Tests

#### 1. API Endpoint Tests (`tests/api/migration-parse-csv.test.ts`)

- **Purpose**: Test the parse-csv API endpoint with comprehensive mocking
- **Focus**: Bucket fix verification, authentication, and core functionality
- **Key Test Cases**:
  - Authentication and authorization flows
  - Migration job validation
  - Bucket fix verification (migration-uploads vs migration-files)
  - CSV parsing functionality
  - Error handling for various scenarios
  - Database operations and batch processing

#### 2. File Format Tests (`tests/unit/migration-file-formats.test.ts`)

- **Purpose**: Test CSV parsing with various file formats and sizes
- **Focus**: Papa Parse configuration and edge cases
- **Key Test Cases**:
  - Standard comma-separated CSV files
  - CSV files with quoted fields containing commas
  - CSV files with escaped quotes and multiline fields
  - Unicode and special character handling
  - Various file sizes (small, medium, large)
  - Wide CSV files with many columns
  - Edge cases: empty files, malformed CSV, missing values

#### 3. Error Handling Tests (`tests/unit/migration-error-handling.test.ts`)

- **Purpose**: Test error scenarios, recovery, and graceful degradation
- **Focus**: Comprehensive error handling and logging
- **Key Test Cases**:
  - Storage access failures (service unavailable, timeouts)
  - File not found scenarios across all download methods
  - Permission denied errors
  - CSV parsing failures and corrupted files
  - Database operation failures and constraint violations
  - Resource exhaustion scenarios
  - Concurrent access issues

#### 4. Security Tests (`tests/unit/migration-security.test.ts`)

- **Purpose**: Test authentication, authorization, and organization isolation
- **Focus**: Security boundaries and data protection
- **Key Test Cases**:
  - Authentication requirements (valid/invalid tokens)
  - Organization membership validation
  - Cross-organization access prevention
  - File access security within organization boundaries
  - Permission level validation
  - Session and token security
  - Audit logging without sensitive data exposure

### 🔗 Integration Tests

#### Bucket Fix Verification (`tests/integration/migration-bucket-fix.test.ts`)

- **Purpose**: End-to-end verification that the bucket mismatch fix works
- **Focus**: Real database and storage operations
- **Key Test Cases**:
  - Complete upload → parse workflow using correct bucket
  - Bucket consistency across all operations
  - Verification that files exist in migration-uploads, not migration-files
  - Before/after fix behavior demonstration
  - Multiple download strategies using correct bucket
  - Error prevention and clear error messages
  - Regression prevention across different scenarios

### 🌐 E2E Tests

#### Migration Workflow (`tests/e2e/migration-workflow.spec.ts`)

- **Purpose**: Test complete user workflows in browser environment
- **Focus**: User experience and integration points
- **Key Test Cases**:
  - Complete migration workflow (create job → upload → parse)
  - Large file handling with progress indication
  - Error display and user feedback
  - Bucket fix verification from user perspective
  - Network request monitoring for 400 errors
  - Authentication expiry handling
  - Organization isolation in UI
  - Progress tracking and status updates

## Key Fix Verification Points

### ✅ Primary Fix Validation

1. **Bucket Consistency**: All operations use "migration-uploads" bucket
2. **No 400 Errors**: Parse-csv endpoint successfully downloads files
3. **Logging Verification**: Logs show correct bucket usage
4. **Error Messages**: Clear error messages reference correct bucket

### 🔍 Secondary Validations

1. **File Upload**: Files stored in migration-uploads bucket
2. **File Download**: All download strategies use migration-uploads
3. **Database Consistency**: File paths stored correctly
4. **Organization Isolation**: Bucket paths include organization context

## Running the Tests

### Quick Start

```bash
# Run all migration tests
./tests/run-migration-tests.sh

# Run specific test categories
pnpm test:api tests/api/migration-parse-csv.test.ts
pnpm test:unit tests/unit/migration-*.test.ts
pnpm test:integration tests/integration/migration-bucket-fix.test.ts
pnpm test:e2e tests/e2e/migration-workflow.spec.ts
```

### Prerequisites

1. **Environment Variables**:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Database Setup**: Ensure migration tables exist:
   - `organizations`
   - `user_organizations`
   - `migration_jobs`
   - `migration_files`
   - `migration_records`

3. **Storage Setup**: Ensure "migration-uploads" bucket exists with appropriate permissions

### Test Runner Output

The test runner provides:

- ✅ Pass/fail status for each test category
- 📊 Summary statistics
- 🔍 Debugging tips for failures
- 🎉 Success confirmation when all tests pass

## Expected Test Results

### Success Criteria

When all tests pass, you can be confident that:

1. **✅ Bucket Fix Works**: No more 400 Bad Request errors
2. **✅ File Processing**: CSV files upload and parse correctly
3. **✅ Error Handling**: Graceful degradation for edge cases
4. **✅ Security**: Organization isolation and authentication work
5. **✅ User Experience**: Complete workflows function smoothly

### Failure Investigation

If tests fail, check:

1. **Environment**: Correct environment variables and database setup
2. **Bucket Configuration**: migration-uploads bucket exists with correct permissions
3. **Code Changes**: Ensure parse-csv route uses "migration-uploads"
4. **Network**: Stable connection to Supabase services

## Test Scenarios Coverage

### 📋 File Upload Scenarios

- [x] Small CSV files (< 1KB)
- [x] Medium CSV files (1KB - 1MB)
- [x] Large CSV files (> 1MB)
- [x] Wide CSV files (many columns)
- [x] CSV files with special characters
- [x] CSV files with quotes and escapes
- [x] Malformed CSV files

### 📋 Error Scenarios

- [x] File not found in storage
- [x] Storage service unavailable
- [x] Permission denied errors
- [x] Network timeouts
- [x] Database connection failures
- [x] Invalid authentication
- [x] Cross-organization access attempts

### 📋 Security Scenarios

- [x] Unauthenticated requests
- [x] Invalid tokens
- [x] Expired sessions
- [x] Cross-organization data access
- [x] File access outside organization
- [x] Permission level validation

### 📋 Integration Scenarios

- [x] Complete upload → parse workflow
- [x] Multiple file uploads
- [x] Concurrent processing attempts
- [x] Progress tracking
- [x] Status updates
- [x] Error recovery

## Maintenance

### Adding New Tests

1. **Unit Tests**: Add to appropriate category in `tests/unit/`
2. **Integration Tests**: Add to `tests/integration/`
3. **E2E Tests**: Add to `tests/e2e/` using Playwright
4. **Update Runner**: Add new tests to `run-migration-tests.sh`

### Updating for Changes

When modifying the migration system:

1. **API Changes**: Update `migration-parse-csv.test.ts`
2. **New Error Cases**: Add to `migration-error-handling.test.ts`
3. **Security Changes**: Update `migration-security.test.ts`
4. **UI Changes**: Update `migration-workflow.spec.ts`

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Solution: Check `.env.local` or environment configuration

2. **Database Tables Missing**
   - Solution: Run database migrations

3. **Storage Bucket Missing**
   - Solution: Create "migration-uploads" bucket in Supabase

4. **Permission Errors**
   - Solution: Check RLS policies and bucket permissions

5. **Test Timeouts**
   - Solution: Increase timeout values for slow environments

### Debug Mode

Enable verbose logging:

```bash
DEBUG=1 ./tests/run-migration-tests.sh
```

## Contributing

When contributing to the migration test suite:

1. **Follow Patterns**: Use existing test structure and naming
2. **Mock Appropriately**: Unit tests should mock external dependencies
3. **Integration Tests**: Should use real services when possible
4. **Documentation**: Update this file for significant changes
5. **Error Messages**: Ensure clear, actionable error messages

## Conclusion

This comprehensive test suite ensures that the migration wizard bucket fix is working correctly and prevents regression. The tests cover all critical paths, error scenarios, and security considerations, providing confidence in the system's reliability and correctness.

For questions or issues with the test suite, refer to the troubleshooting section or check the individual test files for detailed implementation notes.
