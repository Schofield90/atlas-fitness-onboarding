# Migration Bucket Verification Test Suite

This comprehensive test suite verifies that the CSV migration storage fixes are working correctly and that all migration operations use the correct `migration-uploads` bucket instead of the old `migrations` bucket.

## Overview

The main fixes that were implemented:

1. **Process Route**: Changed from `"migrations"` to `"migration-uploads"` bucket in `/app/api/migrations/process/route.ts` (line 78)
2. **Upload Route**: Changed bucket name in `/app/settings/migrations/page.tsx` upload (line 209)
3. **Analyze Route**: Fixed from `"migrations"` to `"migration-uploads"` bucket in `/app/api/migrations/analyze/route.ts` (line 48)
4. **Parse-CSV Route**: Already used `migration-uploads` (line 95)

## Test Categories

### 1. Unit Tests

#### `/tests/unit/migration-storage-bucket-verification.test.ts`

**Purpose**: Comprehensive unit tests that verify storage operations use correct bucket names.

**Key Tests**:

- ✅ Parse CSV endpoint only uses `migration-uploads` bucket
- ✅ Analyze endpoint only uses `migration-uploads` bucket
- ✅ Process endpoint uses `migration-uploads` bucket
- ✅ Tests FAIL if old bucket names (`migrations`, `migration-files`) are used
- ✅ Public URL construction uses correct bucket
- ✅ Direct URL construction uses correct bucket
- ✅ Error messages reference correct bucket

**Critical Assertions**:

```typescript
expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith(
  "migration-uploads",
);
expect(mockSupabaseAdmin.storage.from).not.toHaveBeenCalledWith("migrations");
expect(mockSupabaseAdmin.storage.from).not.toHaveBeenCalledWith(
  "migration-files",
);
```

### 2. Integration Tests

#### `/tests/integration/migration-upload-bucket-verification.test.ts`

**Purpose**: Tests file upload operations to ensure they use the correct bucket.

**Key Tests**:

- ✅ Files upload to `migration-uploads` bucket only
- ✅ Files do NOT exist in wrong buckets (`migrations`, `migration-files`)
- ✅ Multiple file uploads all use correct bucket
- ✅ Large file uploads use correct bucket
- ✅ File metadata references correct bucket path
- ✅ Cross-platform uploads (GoTeamUp, MindBody, etc.) use same bucket
- ✅ Upload path structure is correct for `migration-uploads`

**Critical Test Pattern**:

```typescript
// File should exist in correct bucket
const { data: fileInCorrectBucket, error: correctBucketError } =
  await adminClient.storage
    .from("migration-uploads")
    .download(uploadedFile.filePath);
expect(correctBucketError).toBeNull();

// File should NOT exist in wrong buckets
const { data: fileInWrongBucket, error: wrongBucketError } =
  await adminClient.storage.from("migrations").download(uploadedFile.filePath);
expect(wrongBucketError).toBeTruthy();
expect(fileInWrongBucket).toBeNull();
```

#### `/tests/integration/migration-bucket-fix.test.ts` (Existing)

**Purpose**: Existing comprehensive integration tests for the bucket mismatch fix.

**Coverage**:

- ✅ Upload to `migration-uploads` → Parse from `migration-uploads` workflow
- ✅ No 400 Bad Request errors occur
- ✅ Multiple download strategies all use correct bucket
- ✅ Error prevention and recovery
- ✅ Regression prevention tests

### 3. API Tests

#### `/tests/api/migration-parse-csv.test.ts` (Existing)

**Purpose**: Existing API tests for the parse-csv endpoint.

**Enhanced Coverage**:

- ✅ Parse CSV uses `migration-uploads` bucket
- ✅ All download methods (authenticated, public URL, direct URL) use correct bucket
- ✅ Error handling references correct bucket
- ✅ Batch processing works with correct bucket

### 4. End-to-End Tests

#### `/tests/e2e/migration-bucket-consistency-workflow.spec.ts`

**Purpose**: Complete workflow testing from UI interaction to completion.

**Key Scenarios**:

- ✅ Full migration workflow (login → upload → analyze → import) uses correct bucket
- ✅ Large CSV files processed without bucket errors
- ✅ Page reloads maintain bucket consistency
- ✅ Error messages reference correct bucket
- ✅ Multiple concurrent uploads use correct bucket
- ✅ No console errors related to bucket issues

**Workflow Steps Tested**:

1. User login
2. Navigate to migrations page
3. Upload CSV file
4. Start AI analysis
5. Complete import process
6. Verify no bucket-related errors

#### `/tests/e2e/migration-workflow.spec.ts` (Existing)

**Purpose**: Existing comprehensive workflow tests.

## Test Execution

### Running Individual Test Suites

```bash
# Unit tests
npm test tests/unit/migration-storage-bucket-verification.test.ts

# Integration tests
npm test tests/integration/migration-upload-bucket-verification.test.ts
npm test tests/integration/migration-bucket-fix.test.ts

# API tests
npm test tests/api/migration-parse-csv.test.ts

# E2E tests
npx playwright test tests/e2e/migration-bucket-consistency-workflow.spec.ts
```

### Running Complete Verification Suite

```bash
# Run all migration bucket verification tests
./tests/migration-bucket-verification-suite.sh
```

### Test Results

The test suite will provide:

- ✅ **PASS**: All operations use `migration-uploads` bucket correctly
- ❌ **FAIL**: Some operations still use old bucket names

## Key Verification Points

### 1. File Upload Verification

- Files are uploaded to `migration-uploads` bucket
- Files do NOT exist in `migrations` or `migration-files` buckets
- Upload paths are structured correctly

### 2. File Download Verification

- Parse CSV downloads from `migration-uploads` bucket
- Analyze endpoint downloads from `migration-uploads` bucket
- Process endpoint downloads from `migration-uploads` bucket
- All fallback download methods use correct bucket

### 3. Error Handling Verification

- Error messages reference `migration-uploads` bucket
- No references to old bucket names in errors
- Graceful handling when files are missing

### 4. Regression Prevention

- Tests would FAIL if old bucket names were reintroduced
- Consistent bucket usage across all platforms
- No hardcoded references to wrong buckets

## Expected Test Outcomes

### ✅ If All Tests Pass:

- All migration operations use `migration-uploads` bucket
- No 400 Bad Request errors occur
- File upload → parse workflow works seamlessly
- Old bucket names are not referenced anywhere
- Error messages are helpful and reference correct bucket

### ❌ If Tests Fail:

- Some endpoints may still use old bucket names
- Bucket mismatch issues may still occur
- Manual code review required to identify issues
- Additional fixes needed

## Critical Test Patterns

### 1. Bucket Usage Verification

```typescript
// Verify correct bucket is used
expect(storageClient.from).toHaveBeenCalledWith("migration-uploads");

// Verify wrong buckets are NOT used
expect(storageClient.from).not.toHaveBeenCalledWith("migrations");
expect(storageClient.from).not.toHaveBeenCalledWith("migration-files");
```

### 2. File Accessibility Test

```typescript
// File should be accessible in correct bucket
const { data: correctFile, error: correctError } = await client.storage
  .from("migration-uploads")
  .download(filePath);
expect(correctError).toBeNull();

// File should NOT be accessible in wrong bucket
const { data: wrongFile, error: wrongError } = await client.storage
  .from("migrations")
  .download(filePath);
expect(wrongError).toBeTruthy();
```

### 3. Error Message Verification

```typescript
// Error messages should reference correct bucket
if (errorMessage.includes("bucket")) {
  expect(errorMessage).toContain("migration-uploads");
  expect(errorMessage).not.toContain("migrations");
}
```

## Environment Requirements

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for user operations

## Troubleshooting

### Common Issues:

1. **Tests fail with "bucket not found"**:
   - Verify `migration-uploads` bucket exists in Supabase Storage
   - Check RLS policies allow test operations

2. **Authentication errors**:
   - Verify service role key is correct
   - Check test user creation permissions

3. **File upload failures**:
   - Check bucket permissions
   - Verify file size limits
   - Ensure proper file types are accepted

### Debug Steps:

1. Check bucket configuration in Supabase dashboard
2. Verify RLS policies for `migration-uploads` bucket
3. Test individual API endpoints manually
4. Review server logs for detailed error messages

## Success Criteria

✅ **Complete Success**: All tests pass, indicating:

- No bucket naming inconsistencies
- No 400 Bad Request errors
- Seamless file upload → parse workflow
- Proper error handling and messaging

This test suite provides comprehensive coverage to ensure the migration bucket fixes are working correctly and prevent regression to the old bucket naming scheme.
