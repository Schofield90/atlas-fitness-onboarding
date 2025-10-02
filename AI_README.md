# 🤖 AI ASSISTANT INSTRUCTIONS - READ FIRST

> **For Claude Code / AI Assistants:** Read this file at the start of each conversation. This contains critical instructions for working with this codebase.

## Automated Logging System

This project has a comprehensive logging system. **You MUST use it.**

### When User Reports Issues

If user mentions: "error", "broken", "not working", "failing", "bug", "issue" - **IMMEDIATELY:**

1. Check logs: `view logs/error.log`
2. Get context: `bash "tail -50 logs/app.log"`
3. Search: `bash "grep -i '{keyword}' logs/app.log"`
4. Provide solution from what you found

**NEVER ask user to copy-paste console logs or errors.**

### When Writing Code

Always add logging to new API routes:

```typescript
import { apiLogger } from "@/lib/logging-helpers";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    apiLogger.request("POST", "/api/endpoint", requestId);
    // ... your code ...
    apiLogger.success("POST", "/api/endpoint", requestId, duration);
    return Response.json(result);
  } catch (error) {
    apiLogger.error("POST", "/api/endpoint", requestId, error);
    throw error;
  }
}
```

## Log File Locations

- `logs/error.log` - All errors and exceptions
- `logs/app.log` - General application logs
- `logs/api.log` - API request/response logs
- `logs/auth.log` - Authentication events
- `logs/database.log` - Database queries and errors

## Required Workflow

1. **User reports issue** → Check logs FIRST
2. **Reproduce locally** → Add logging if missing
3. **Fix code** → Verify logs show fix working
4. **Deploy** → Monitor logs for errors

## Never Do This ❌

- Ask user for console logs
- Debug without checking logs first
- Write code without logging
- Deploy without checking logs

## Always Do This ✅

- Check logs when user reports issues
- Add comprehensive logging to new code
- Use structured logging (JSON format)
- Include request IDs for tracing
- Log successes AND failures
