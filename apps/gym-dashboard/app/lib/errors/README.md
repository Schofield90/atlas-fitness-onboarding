# Comprehensive Error Handling System

This directory contains a comprehensive error handling system for Atlas Fitness CRM, designed for production reliability and debugging in a multi-tenant SaaS environment.

## Overview

The error handling system provides:

- **Custom Error Classes** - Typed error classes for different error scenarios
- **Centralized Error Handler** - Consistent error processing and response generation
- **Error Logging & Monitoring** - Comprehensive logging with real-time monitoring
- **User-Friendly Messages** - Localized, actionable error messages
- **Error Recovery** - Automatic retry, circuit breaker, and fallback mechanisms
- **React Error Boundaries** - Client-side error catching and recovery

## Quick Start

### 1. API Route Error Handling

```typescript
import {
  withApiErrorBoundary,
  ValidationError,
  DatabaseError,
} from "@/app/lib/errors";

async function myApiHandler(request: NextRequest) {
  // Validate input
  if (!body.email) {
    throw ValidationError.required("email");
  }

  // Database operations
  const { data, error } = await supabase.from("table").select();
  if (error) {
    throw DatabaseError.queryError("table", "select", {
      originalError: error.message,
    });
  }

  return NextResponse.json({ data });
}

// Wrap with error boundary
export const POST = withApiErrorBoundary(myApiHandler);
```

### 2. React Component Error Boundaries

```tsx
import { ErrorBoundary, AsyncErrorBoundary } from '@/app/components/errors'

// Basic component error boundary
<ErrorBoundary level="component" componentName="UserList">
  <UserListComponent />
</ErrorBoundary>

// Async operations with retry
<AsyncErrorBoundary
  componentName="DataLoader"
  retryable={true}
  maxRetries={3}
>
  <AsyncDataComponent />
</AsyncErrorBoundary>
```

### 3. Manual Error Reporting

```typescript
import { useErrorReporting } from "@/app/components/errors";

function MyComponent() {
  const { reportError } = useErrorReporting();

  const handleError = (error: Error) => {
    reportError(error, { component: "MyComponent", action: "user_action" });
  };
}
```

## Error Classes

### Base Error Class

```typescript
import { AppError } from "@/app/lib/errors";

const error = new AppError(
  "Something went wrong",
  500,
  "CUSTOM_ERROR",
  true, // isOperational
  { context: "additional info" },
);
```

### Specialized Error Classes

- **ValidationError** - Input validation failures
- **AuthenticationError** - Authentication failures
- **AuthorizationError** - Permission issues
- **NotFoundError** - Missing resources
- **RateLimitError** - Rate limiting
- **IntegrationError** - Third-party API failures
- **DatabaseError** - Database operations
- **CacheError** - Redis failures
- **AIServiceError** - AI API failures
- **MultiTenantError** - Organization isolation violations

### Error Class Examples

```typescript
// Validation errors
throw ValidationError.required("email");
throw ValidationError.invalid("phone", value, "phone number format");

// Authentication errors
throw AuthenticationError.invalidCredentials("password");
throw AuthenticationError.tokenExpired();

// Database errors
throw DatabaseError.connectionError();
throw DatabaseError.duplicateKey("users", "email", email);

// Integration errors
throw IntegrationError.serviceUnavailable("stripe");
throw IntegrationError.timeout("openai", "completion");
```

## Error Recovery

### Retry with Exponential Backoff

```typescript
import { withRetry } from "@/app/lib/errors";

const result = await withRetry(
  async () => {
    return await fetch("/api/data");
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  },
);
```

### Circuit Breaker Pattern

```typescript
import { withCircuitBreaker } from "@/app/lib/errors";

const result = await withCircuitBreaker(
  "external-api",
  async () => {
    return await externalApiCall();
  },
  {
    failureThreshold: 5,
    recoveryTimeoutMs: 60000,
  },
);
```

### Comprehensive Recovery

```typescript
import { withRecovery } from "@/app/lib/errors";

const result = await withRecovery(
  "critical-operation",
  async () => {
    return await criticalOperation();
  },
  {
    useRetry: true,
    useCircuitBreaker: true,
    useFallback: true,
    fallback: {
      fallbackValue: "default-result",
    },
  },
);
```

## Monitoring & Alerting

### Error Statistics API

```bash
# Recent errors
GET /api/errors/recent?limit=50&time_range=24h

# Error statistics
GET /api/errors/stats?time_range=day&include_trends=true

# Report client errors
POST /api/errors/report
```

### Monitoring Dashboard Data

```typescript
import { errorMonitor } from "@/app/lib/errors";

// Get dashboard data
const dashboardData = await errorMonitor.getDashboardData("org-id");

// Get error trends
const trends = await errorMonitor.getErrorTrends("day", "org-id");
```

## Configuration

### Environment Variables

```bash
# Error monitoring
ERROR_RATE_THRESHOLD=10
RESPONSE_TIME_THRESHOLD=5000
CRITICAL_ERROR_ALERTS=true
ERROR_RATE_ALERTS=true

# Alerting
ALERT_RECIPIENTS=admin@example.com,dev@example.com
ALERT_CHANNELS=email,slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# External services
SENTRY_DSN=https://...
DATADOG_API_KEY=...

# Support
SUPPORT_EMAIL=support@atlasfitness.com
SUPPORT_URL=https://help.atlasfitness.com
STATUS_URL=https://status.atlasfitness.com
```

### Alert Configuration

```typescript
const monitoringConfig = {
  errorRateThreshold: 10, // errors per minute
  responseTimeThreshold: 5000, // milliseconds
  criticalErrorAlert: {
    enabled: true,
    threshold: 1,
    timeWindow: 1, // minutes
    recipients: ["admin@example.com"],
    channels: ["email", "slack"],
  },
};
```

## Database Schema

The system creates the following tables:

- `error_logs` - Server-side error logs
- `client_error_reports` - Client-side error reports
- `alert_history` - Alert history
- `realtime_metrics` - Real-time metrics for monitoring
- `daily_reports` - Daily error reports

Run the database migration:

```sql
-- Apply the schema
\i supabase/error-logging-tables.sql
```

## React Error Boundaries

### Global Error Boundary

Catches app-level errors and provides recovery options:

```tsx
import { ErrorBoundaryProvider } from "@/app/components/errors";

<ErrorBoundaryProvider userId={user.id} organizationId={org.id}>
  <App />
</ErrorBoundaryProvider>;
```

### Component Error Boundary

Catches component-specific errors:

```tsx
import { ErrorBoundary } from "@/app/components/errors";

<ErrorBoundary
  level="section"
  componentName="UserDashboard"
  showErrorDetails={isDev}
  onError={(error) => console.error("Dashboard error:", error)}
>
  <UserDashboard />
</ErrorBoundary>;
```

### Async Error Boundary

Handles async operations with loading states and retries:

```tsx
import { AsyncErrorBoundary } from "@/app/components/errors";

<AsyncErrorBoundary
  componentName="DataLoader"
  operationName="load-user-data"
  retryable={true}
  maxRetries={3}
  onRetry={() => refetchData()}
  loadingFallback={<Loading />}
>
  <AsyncDataComponent />
</AsyncErrorBoundary>;
```

## User-Friendly Messages

### Localized Error Messages

```typescript
import { getUserFriendlyMessage } from "@/app/lib/errors";

const friendlyMessage = getUserFriendlyMessage(
  error,
  "staff", // user role
  "en", // locale
  {
    showTechnicalDetails: false,
    includeRecoverySteps: true,
  },
);
```

### Supported Locales

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)

## Best Practices

### 1. Error Classification

Use appropriate error classes:

```typescript
// ✅ Good - Specific error class
throw ValidationError.required("email");

// ❌ Bad - Generic error
throw new Error("Email is required");
```

### 2. Error Context

Provide useful context:

```typescript
// ✅ Good - Rich context
throw DatabaseError.queryError("users", "select", {
  organizationId: "org-123",
  filters: { status: "active" },
  originalError: error.message,
});

// ❌ Bad - No context
throw new Error("Query failed");
```

### 3. Error Boundaries

Use appropriate boundary levels:

```tsx
// ✅ Good - Specific boundaries for different levels
<ErrorBoundary level="page">
  {" "}
  {/* Page-level errors */}
  <ErrorBoundary level="section">
    {" "}
    {/* Section-level errors */}
    <ErrorBoundary level="component">
      {" "}
      {/* Component-level errors */}
      <MyComponent />
    </ErrorBoundary>
  </ErrorBoundary>
</ErrorBoundary>
```

### 4. Recovery Strategies

Implement appropriate recovery:

```typescript
// ✅ Good - Retry with fallback
const result = await withRecovery("api-call", apiCall, {
  useRetry: true,
  useFallback: true,
  fallback: { fallbackValue: cachedData },
});

// ✅ Good - Circuit breaker for external services
const result = await withCircuitBreaker("payment-service", paymentCall);
```

### 5. Monitoring

Monitor error rates and patterns:

```typescript
// ✅ Good - Monitor critical operations
await processErrorForMonitoring(error, organizationId);

// ✅ Good - Set up alerts for critical errors
if (error.errorCode === "PAYMENT_FAILURE") {
  await sendCriticalAlert(error);
}
```

## Testing Error Handling

### 1. Unit Tests

```typescript
describe("Error Handling", () => {
  it("should throw ValidationError for missing email", () => {
    expect(() => validateEmail("")).toThrow(ValidationError);
  });

  it("should retry failed operations", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue("success");

    const result = await withRetry(mockFn, { maxAttempts: 2 });
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
```

### 2. Integration Tests

```typescript
describe("API Error Handling", () => {
  it("should return user-friendly error for validation failure", async () => {
    const response = await request(app)
      .post("/api/leads")
      .send({}) // Missing required fields
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.userMessage).toContain("required");
  });
});
```

### 3. Error Boundary Tests

```tsx
describe("ErrorBoundary", () => {
  it("should catch and display component errors", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

1. **Error not caught by boundary**
   - Ensure error occurs during render, not in event handlers
   - Use `reportError` hook for manual error reporting

2. **Database errors not properly categorized**
   - Check error codes and map to appropriate DatabaseError types
   - Add context for debugging

3. **Circuit breaker not triggering**
   - Verify failure threshold configuration
   - Check that errors are properly classified as retryable

4. **Missing error logs**
   - Ensure database tables are created
   - Check RLS policies for service role permissions

### Debug Mode

Enable detailed error information in development:

```typescript
// In development, show technical details
const config = {
  showTechnicalDetails: process.env.NODE_ENV === "development",
  includeStackTrace: process.env.NODE_ENV === "development",
};
```

## Migration Guide

### From Legacy Error Handling

1. **Replace generic Error classes:**

```typescript
// Before
throw new Error("User not found");

// After
throw NotFoundError.resource("user", userId);
```

2. **Update API error responses:**

```typescript
// Before
return NextResponse.json({ error: "Failed" }, { status: 500 });

// After
throw DatabaseError.queryError("table", "operation", { context });
```

3. **Add error boundaries to components:**

```tsx
// Before
function App() {
  return <MyComponent />;
}

// After
function App() {
  return (
    <ErrorBoundaryProvider>
      <MyComponent />
    </ErrorBoundaryProvider>
  );
}
```

## Performance Considerations

- Error logs are indexed for fast queries
- Circuit breakers prevent cascade failures
- Real-time metrics use efficient aggregation
- Client error reports have rate limiting
- Materialized views for statistics queries

## Security

- Error messages are sanitized before display
- No sensitive data in error logs
- Organization-scoped error access via RLS
- Rate limiting on error reporting endpoint
- Input sanitization for client error reports

## Support

For issues with the error handling system:

1. Check the error logs in `/api/errors/recent`
2. Review monitoring dashboard at `/api/errors/stats`
3. Check database error logs table
4. Contact the development team with error ID references
