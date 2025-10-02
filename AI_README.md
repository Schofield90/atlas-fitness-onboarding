# 🤖 AI ASSISTANT INSTRUCTIONS

## Automated Logging System

This project uses Pino for logging. All logs go to `logs/` directory.

### When User Reports Issues

If user mentions: "error", "broken", "not working", "failing", "bug" - **IMMEDIATELY:**

1. `bash "tail -100 logs/error.log"` - Check recent errors
2. `bash "tail -50 logs/app.log"` - Get context
3. `bash "grep -i 'keyword' logs/app.log"` - Search logs

**NEVER ask user to copy-paste logs.**

### When Writing API Routes

Always add logging:

```typescript
import { apiLogger } from "@/lib/logging-helpers";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    apiLogger.request("POST", "/api/endpoint", requestId);
    // ... code ...
    apiLogger.success("POST", "/api/endpoint", requestId, duration);
    return Response.json(result);
  } catch (error) {
    apiLogger.error("POST", "/api/endpoint", requestId, error);
    throw error;
  }
}
```

### Client-Side Logging

Use client logger for browser errors:

```typescript
import { clientLogger } from "@/lib/client-logger";

// Automatically sends to server
clientLogger.error("Failed to load data", { error, context });
```

## Log Files

- `logs/app.log` - All application logs
- `logs/error.log` - Errors only

## Available Loggers

- `apiLogger` - API requests/responses
- `dbLogger` - Database operations
- `authLogger` - Authentication events
- `integrationLogger` - Third-party calls
- `businessLogger` - Business events
- `perfLogger` - Performance metrics
- `clientLogger` - Browser-side logs
