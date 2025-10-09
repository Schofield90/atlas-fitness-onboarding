# AI Agent Workflow Integration

This integration allows automation workflows to execute AI agent tasks as part of their automation flows.

## Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│                 │      │                      │      │                 │
│  Workflow       │─────▶│  Agent Action        │─────▶│  Agent          │
│  Engine         │      │  Handler             │      │  Orchestrator   │
│                 │      │                      │      │                 │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
        │                         │                            │
        │                         │                            │
        ▼                         ▼                            ▼
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│                 │      │                      │      │                 │
│  workflow_      │      │  Workflow Agent      │      │  ai_agent_      │
│  executions     │      │  Executor            │      │  tasks          │
│                 │      │                      │      │                 │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
```

## Components

### 1. Workflow Integration Layer (`lib/ai-agents/workflow-integration.ts`)

Main integration logic that bridges workflows and AI agents.

**Key Classes:**

- `WorkflowAgentExecutor`: Executes agent tasks from workflow context
- `formatWorkflowContext()`: Converts workflow variables to agent context
- `executeAgentFromWorkflow()`: Primary execution function

**Features:**

- Organization validation
- Workflow ownership verification
- Agent access control
- Cost tracking and billing
- Activity logging

### 2. API Endpoint (`app/api/workflows/actions/execute-agent/route.ts`)

REST API for executing agents from workflows.

**Endpoints:**

#### POST /api/workflows/actions/execute-agent

Execute an AI agent task from a workflow.

**Request Body:**

```typescript
{
  workflowId: string;
  stepId: string;
  executionId: string;
  agentId: string;
  prompt: string;
  context: Record<string, any>;
}
```

**Response:**

```typescript
{
  success: boolean;
  result?: any;
  cost?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costBaseCents: number;
    costBilledCents: number;
    markupPercentage: number;
  };
  executionTimeMs?: number;
  error?: string;
}
```

#### GET /api/workflows/actions/execute-agent

Get agent execution logs for a workflow.

**Query Parameters:**

- `workflowId` (required): Workflow ID
- `executionId` (optional): Filter by specific execution
- `limit` (optional): Max results (default: 50)

### 3. Action Handlers (`app/lib/workflow/action-handlers/agent-actions.ts`)

Workflow action handlers for AI agent tasks.

**Available Actions:**

#### `execute_ai_agent_task`

Execute a general AI agent task.

**Parameters:**

- `agentId` (required): ID of the agent to execute
- `prompt` (required): Task prompt (supports variable interpolation)
- `stepId` (optional): Custom step ID

**Example:**

```typescript
{
  actionId: 'execute_ai_agent_task',
  parameters: {
    agentId: 'agent-123',
    prompt: 'Analyze lead {{trigger.lead_id}} and provide recommendation'
  }
}
```

#### `ai_agent_analysis`

Specialized action for data analysis.

**Parameters:**

- `agentId` (required): ID of the agent
- `dataToAnalyze` (required): Data to analyze (supports variable interpolation)
- `analysisType` (optional): Type of analysis
  - `sentiment`: Sentiment analysis
  - `lead_scoring`: Lead scoring
  - `content_moderation`: Content moderation
  - `data_extraction`: Extract structured data
  - `classification`: Classify data
  - `general`: General analysis (default)

**Example:**

```typescript
{
  actionId: 'ai_agent_analysis',
  parameters: {
    agentId: 'agent-456',
    dataToAnalyze: '{{trigger.form_submission}}',
    analysisType: 'lead_scoring'
  }
}
```

#### `ai_agent_generate_content`

Generate content using an AI agent.

**Parameters:**

- `agentId` (required): ID of the agent
- `contentType` (required): Type of content to generate
  - `email`, `sms`, `social_post`, `blog`, `ad_copy`, etc.
- `targetAudience` (optional): Target audience (default: 'general')
- `tone` (optional): Content tone (default: 'professional')
- `additionalContext` (optional): Extra context for generation

**Example:**

```typescript
{
  actionId: 'ai_agent_generate_content',
  parameters: {
    agentId: 'agent-789',
    contentType: 'email',
    targetAudience: 'fitness_enthusiasts',
    tone: 'motivational',
    additionalContext: 'Promoting new HIIT class'
  }
}
```

## Variable Interpolation

All prompt and data parameters support variable interpolation using `{{variable}}` syntax.

**Examples:**

```typescript
// Access trigger data
"{{trigger.lead_id}}";
"{{trigger.form_submission.email}}";

// Access workflow variables
"{{variables.campaign_name}}";
"{{variables.target_score}}";

// Access previous node outputs
"{{node_1.output.result}}";
"{{send_email.output.message_id}}";

// Complex paths
"{{trigger.lead.metadata.source}}";
```

## Usage in Workflows

### Example 1: Lead Scoring Workflow

```typescript
const workflow = {
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      data: {
        eventType: "lead.created",
      },
    },
    {
      id: "score_lead",
      type: "action",
      data: {
        actionType: "ai_agent_analysis",
        agentId: "lead-scoring-agent",
        dataToAnalyze: "{{trigger.lead}}",
        analysisType: "lead_scoring",
      },
    },
    {
      id: "check_score",
      type: "condition",
      data: {
        conditions: [
          {
            field: "score_lead.output.analysis.score",
            operator: "greater_than",
            value: 70,
          },
        ],
      },
    },
    {
      id: "send_to_sales",
      type: "action",
      data: {
        actionType: "create_task",
        assignTo: "sales-team",
        title: "High-value lead: {{trigger.lead.name}}",
        description: "{{score_lead.output.analysis.recommended_actions}}",
      },
    },
  ],
  edges: [
    { source: "trigger", target: "score_lead" },
    { source: "score_lead", target: "check_score" },
    {
      source: "check_score",
      target: "send_to_sales",
      data: { branch: "true" },
    },
  ],
};
```

### Example 2: Content Generation Workflow

```typescript
const workflow = {
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      data: {
        eventType: "campaign.scheduled",
      },
    },
    {
      id: "generate_email",
      type: "action",
      data: {
        actionType: "ai_agent_generate_content",
        agentId: "content-generator-agent",
        contentType: "email",
        targetAudience: "{{trigger.campaign.target_segment}}",
        tone: "motivational",
        additionalContext: "{{trigger.campaign.description}}",
      },
    },
    {
      id: "send_email",
      type: "action",
      data: {
        actionType: "send_email",
        to: "{{trigger.campaign.recipients}}",
        subject: "{{trigger.campaign.subject}}",
        body: "{{generate_email.output.generated_content}}",
      },
    },
  ],
  edges: [
    { source: "trigger", target: "generate_email" },
    { source: "generate_email", target: "send_email" },
  ],
};
```

### Example 3: Customer Support Automation

```typescript
const workflow = {
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      data: {
        eventType: "support.ticket.created",
      },
    },
    {
      id: "categorize",
      type: "action",
      data: {
        actionType: "ai_agent_analysis",
        agentId: "support-agent",
        dataToAnalyze: "{{trigger.ticket.message}}",
        analysisType: "classification",
        categories: ["billing", "technical", "general", "urgent"],
      },
    },
    {
      id: "generate_response",
      type: "action",
      data: {
        actionType: "execute_ai_agent_task",
        agentId: "support-agent",
        prompt:
          "Generate a helpful response to this support ticket:\n\nTicket: {{trigger.ticket.message}}\nCategory: {{categorize.output.analysis.category}}",
      },
    },
    {
      id: "send_response",
      type: "action",
      data: {
        actionType: "send_email",
        to: "{{trigger.ticket.customer_email}}",
        subject: "Re: {{trigger.ticket.subject}}",
        body: "{{generate_response.output.agent_response}}",
      },
    },
  ],
  edges: [
    { source: "trigger", target: "categorize" },
    { source: "categorize", target: "generate_response" },
    { source: "generate_response", target: "send_response" },
  ],
};
```

## Cost Tracking

All agent executions are tracked for billing:

1. **Base Cost**: Actual API cost from provider (OpenAI/Anthropic)
2. **Markup**: 20% markup applied to base cost
3. **Billed Cost**: Final cost charged to organization

**Cost Details:**

```typescript
{
  model: 'gpt-4',
  inputTokens: 1500,
  outputTokens: 500,
  totalTokens: 2000,
  costBaseCents: 4,      // $0.04
  costBilledCents: 5,    // $0.05 (with 20% markup)
  markupPercentage: 20
}
```

## Activity Logging

All agent executions are logged to `ai_agent_activity_log` table with:

- Agent ID
- Organization ID
- Task ID
- Workflow ID
- Execution ID
- Step ID
- Action type
- Tokens used
- Cost (base and billed)
- Execution time
- Success/failure status
- Error messages

**Query logs:**

```typescript
GET /api/workflows/actions/execute-agent?workflowId=wf-123&limit=100
```

## Error Handling

The integration handles errors at multiple levels:

1. **Validation Errors**: Missing parameters, invalid IDs
2. **Permission Errors**: Organization access, agent ownership
3. **Execution Errors**: API failures, timeout
4. **Cost Errors**: Billing issues

All errors include:

- Descriptive error message
- Execution time
- Context about the failure

## Performance Considerations

- **Timeout**: 60 seconds per agent execution
- **Retry**: Tasks support up to 3 retries
- **Concurrency**: Multiple agents can execute in parallel
- **Caching**: Consider caching agent responses for identical prompts

## Security

- ✅ Organization-level isolation enforced
- ✅ Agent ownership validated
- ✅ Workflow ownership validated
- ✅ Admin client for database access
- ✅ Sensitive data logged in activity log only
- ✅ Cost tracking prevents billing fraud

## Future Enhancements

- [ ] Agent response caching
- [ ] Streaming responses for long-running tasks
- [ ] Multi-agent coordination (agent chains)
- [ ] Agent-to-agent communication
- [ ] Visual workflow builder UI for agents
- [ ] Real-time execution monitoring
- [ ] Advanced retry strategies
- [ ] Agent performance analytics

## Testing

```typescript
// Test execution
const response = await fetch("/api/workflows/actions/execute-agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "wf-123",
    stepId: "step-456",
    executionId: "exec-789",
    agentId: "agent-abc",
    prompt: "Test prompt",
    context: {
      organizationId: "org-xyz",
      test: true,
    },
  }),
});

const result = await response.json();
console.log(result);
```

## Support

For issues or questions:

1. Check the activity logs
2. Review error messages in workflow execution logs
3. Verify agent configuration
4. Check organization permissions
