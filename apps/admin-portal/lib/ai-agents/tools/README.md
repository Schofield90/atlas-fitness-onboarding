# AI Agent Tool Registry System

Complete tool registry system for AI agents with support for OpenAI and Anthropic function calling.

## Overview

The tool registry provides a centralized system for managing AI agent capabilities. Each tool represents a specific action an agent can perform, such as querying data, sending messages, or generating reports.

## Architecture

```
lib/ai-agents/tools/
├── types.ts              # Core types and base classes
├── registry.ts           # Central registry and utilities
├── data-tools.ts         # Client/member data access tools
├── analytics-tools.ts    # Reporting and analytics tools
├── messaging-tools.ts    # Communication and notification tools
├── automation-tools.ts   # Workflow and automation tools
├── index.ts              # Public API exports
└── README.md             # This file
```

## Available Tools

### Data Tools (Category: `data`)

1. **search_clients** - Search for clients by name, email, or phone
2. **get_client_profile** - Get detailed client profile with relationships
3. **list_bookings** - List class bookings with filters
4. **query_payments** - Query payment history with analytics

### Analytics Tools (Category: `analytics`)

1. **generate_revenue_report** - Comprehensive revenue analysis
2. **generate_churn_report** - Churn analysis and retention metrics
3. **generate_engagement_report** - Member engagement and attendance analysis

### Messaging Tools (Category: `messaging`)

1. **send_email** - Send emails with template support
2. **send_sms** - Send SMS messages
3. **create_support_ticket** - Create tickets for human follow-up
4. **notify_staff** - Send in-app notifications to staff

### Automation Tools (Category: `automation`)

1. **trigger_workflow** - Trigger existing automation workflows
2. **schedule_task** - Schedule one-time or recurring tasks
3. **update_client_tags** - Manage client tags and segments
4. **export_data** - Export data to CSV or JSON

## Usage

### Basic Usage

```typescript
import { toolRegistry } from "@/lib/ai-agents/tools";

// Get a specific tool
const searchTool = toolRegistry.getTool("search_clients");

// Execute a tool
const result = await toolRegistry.executeTool(
  "search_clients",
  { query: "john@example.com", limit: 10 },
  {
    organizationId: "org-123",
    agentId: "agent-456",
    userId: "user-789",
  },
);

if (result.success) {
  console.log("Found clients:", result.data);
} else {
  console.error("Error:", result.error);
}
```

### Get Tools for AI Providers

```typescript
import { toolRegistry } from '@/lib/ai-agents/tools';

// For OpenAI
const openaiTools = toolRegistry.getToolsForOpenAI([
  'search_clients',
  'send_email',
  'generate_revenue_report'
]);

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: openaiTools
});

// For Anthropic
const anthropicTools = toolRegistry.getToolsForAnthropic([
  'search_clients',
  'send_email',
  'generate_revenue_report'
]);

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [...],
  tools: anthropicTools
});
```

### Database Synchronization

```typescript
import {
  loadToolsToDatabase,
  syncToolsToDatabase,
} from "@/lib/ai-agents/tools";

// Initial load (first time setup)
const loadResult = await loadToolsToDatabase();
console.log(`Loaded ${loadResult.toolsLoaded} tools`);

// Sync updates (after code changes)
const syncResult = await syncToolsToDatabase();
console.log(
  `Updated ${syncResult.toolsUpdated} tools, created ${syncResult.toolsCreated} new tools`,
);
```

### Query Tools from Database

```typescript
import { getToolsFromDatabase } from "@/lib/ai-agents/tools";

// Get all enabled tools
const { tools } = await getToolsFromDatabase({ enabled: true });

// Get tools by category
const { tools: dataTools } = await getToolsFromDatabase({ category: "data" });

// Search tools
const { tools: searchResults } = await getToolsFromDatabase({
  search: "client",
});
```

### Browse and Discover Tools

```typescript
import { toolRegistry } from "@/lib/ai-agents/tools";

// Get all tools
const allTools = toolRegistry.getAllTools();

// Get tools by category
const analyticsTools = toolRegistry.getToolsByCategory("analytics");

// Search tools
const clientTools = toolRegistry.searchTools("client");

// Get registry stats
const stats = toolRegistry.getToolStats();
console.log(stats);
// {
//   total: 15,
//   enabled: 15,
//   disabled: 0,
//   data: 4,
//   analytics: 3,
//   messaging: 4,
//   automation: 4
// }
```

## Creating Custom Tools

### Step 1: Define the Tool Class

```typescript
import { z } from "zod";
import { BaseTool, ToolExecutionContext, ToolExecutionResult } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

export class MyCustomTool extends BaseTool {
  id = "my_custom_tool";
  name = "My Custom Tool";
  description = "Does something awesome";
  category = "data" as const;

  parametersSchema = z.object({
    param1: z.string().describe("First parameter"),
    param2: z.number().optional().describe("Optional second parameter"),
  });

  requiresPermission = "custom:execute";

  async execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const validated = this.parametersSchema.parse(params);

    try {
      // Your tool logic here
      const supabase = createAdminClient();

      // ... implementation ...

      return {
        success: true,
        data: {
          /* your data */
        },
        metadata: {
          recordsAffected: 1,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }
}
```

### Step 2: Register the Tool

```typescript
// Add to the appropriate tool file (e.g., data-tools.ts)
export const DATA_TOOLS = [
  new SearchClientsTool(),
  new GetClientProfileTool(),
  new MyCustomTool(), // Add here
];
```

The tool will be automatically registered when the registry is instantiated.

## Tool Execution Context

Every tool receives a `ToolExecutionContext` object:

```typescript
interface ToolExecutionContext {
  organizationId: string; // Organization the agent belongs to
  agentId: string; // ID of the agent executing the tool
  userId?: string; // Staff member if chatting (optional)
  conversationId?: string; // Current conversation ID (optional)
  taskId?: string; // Current task ID (optional)
  metadata?: Record<string, any>; // Additional context
}
```

## Tool Execution Result

Tools return a standardized result:

```typescript
interface ToolExecutionResult {
  success: boolean;
  data?: any; // Result data (if successful)
  error?: string; // Error message (if failed)
  metadata?: {
    recordsAffected?: number;
    executionTimeMs?: number;
    cached?: boolean;
  };
}
```

## Best Practices

### 1. Validation

Always use Zod schemas for parameter validation:

```typescript
parametersSchema = z.object({
  email: z.string().email().describe("Valid email address"),
  amount: z.number().positive().describe("Amount must be positive"),
});
```

### 2. Error Handling

Always wrap execution in try-catch and return structured errors:

```typescript
try {
  // Tool logic
} catch (error: any) {
  return {
    success: false,
    error: error.message,
    metadata: { executionTimeMs: Date.now() - startTime },
  };
}
```

### 3. Execution Time Tracking

Track execution time for monitoring and optimization:

```typescript
const startTime = Date.now();
// ... logic ...
return {
  success: true,
  data: result,
  metadata: {
    executionTimeMs: Date.now() - startTime,
  },
};
```

### 4. Permission Checking

Specify required permissions for sensitive operations:

```typescript
requiresPermission = "payments:write"; // Will be checked before execution
```

### 5. Organization Isolation

Always filter by `context.organizationId` to ensure data isolation:

```typescript
const { data } = await supabase
  .from("clients")
  .select("*")
  .eq("organization_id", context.organizationId); // Critical!
```

### 6. Descriptive Parameters

Use `.describe()` to provide clear parameter descriptions for AI models:

```typescript
parametersSchema = z.object({
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  endDate: z.string().describe("End date in YYYY-MM-DD format"),
});
```

## Database Schema

Tools are stored in the `ai_agent_tools` table:

```sql
CREATE TABLE ai_agent_tools (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  parameters_schema JSONB NOT NULL,
  requires_permission VARCHAR(100),
  is_system BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Sync Tools to Database

```bash
POST /api/admin/tools/sync
```

Response:

```json
{
  "success": true,
  "toolsUpdated": 12,
  "toolsCreated": 3,
  "errors": []
}
```

### Get Tools

```bash
GET /api/agents/tools?category=data&enabled=true&search=client
```

Response:

```json
{
  "success": true,
  "tools": [
    {
      "id": "search_clients",
      "name": "Search Clients",
      "category": "data",
      "description": "Search for clients...",
      "enabled": true
    }
  ]
}
```

## Testing

```typescript
import { toolRegistry } from "@/lib/ai-agents/tools";

describe("Tool Registry", () => {
  it("should execute search_clients tool", async () => {
    const result = await toolRegistry.executeTool(
      "search_clients",
      { query: "test@example.com", limit: 1 },
      {
        organizationId: "test-org",
        agentId: "test-agent",
      },
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Performance Considerations

1. **Caching**: Implement Redis caching for frequently accessed data
2. **Pagination**: Always limit query results (default: 10-50 items)
3. **Indexes**: Ensure database indexes exist for filtered columns
4. **Async**: All tools are async for non-blocking execution
5. **Timeouts**: Consider adding execution timeouts for long-running operations

## Security

1. **RLS Policies**: Use admin client but filter by organization
2. **Input Validation**: All inputs validated via Zod schemas
3. **Permission Checks**: Implement `requiresPermission` for sensitive tools
4. **Audit Logging**: Log all tool executions to `ai_agent_activity_log`
5. **Rate Limiting**: Implement rate limits on expensive operations

## Monitoring

Track tool usage in the `ai_agent_activity_log` table:

```sql
SELECT
  action_type,
  COUNT(*) as execution_count,
  AVG(execution_time_ms) as avg_time_ms,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count
FROM ai_agent_activity_log
WHERE action_type = 'tool_execution'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action_type;
```

## Roadmap

- [ ] Add more CRM-specific tools (update client, create booking, etc.)
- [ ] Implement permission checking system
- [ ] Add tool execution rate limiting
- [ ] Create tool usage analytics dashboard
- [ ] Add tool execution caching layer
- [ ] Implement tool versioning
- [ ] Add webhook tools for external integrations
- [ ] Create visual tool builder for custom tools

## Support

For issues or questions:

1. Check the tool execution logs in `ai_agent_activity_log`
2. Review the tool's parameter schema for correct usage
3. Ensure database permissions are correctly configured
4. Verify organization isolation is working correctly
