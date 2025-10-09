# AI Agent Workflow Integration - Quick Start Guide

## 5-Minute Integration Guide

### Step 1: Create an AI Agent (if you don't have one)

```typescript
// In your application or via API
const agent = await supabase
  .from("ai_agents")
  .insert({
    organization_id: "your-org-id",
    role: "lead_scorer",
    name: "Lead Scoring Agent",
    description: "Scores and qualifies leads",
    system_prompt:
      "You are an expert at analyzing leads and providing scores from 0-100...",
    model: "gpt-4",
    temperature: 0.7,
    max_tokens: 2000,
    allowed_tools: ["lead_history", "engagement_score"],
    is_active: true,
  })
  .select()
  .single();

console.log("Agent ID:", agent.data.id); // Save this!
```

### Step 2: Add Agent Action to Your Workflow

```typescript
const workflow = {
  name: "Lead Qualification",
  trigger_type: "lead.created",
  nodes: [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "New Lead Created",
      },
    },
    {
      id: "score_lead",
      type: "action",
      position: { x: 100, y: 200 },
      data: {
        label: "Score Lead with AI",
        actionType: "ai_agent_analysis", // ← The magic happens here
        agentId: "your-agent-id-from-step-1",
        dataToAnalyze: "{{trigger.lead}}",
        analysisType: "lead_scoring",
      },
    },
    {
      id: "check_score",
      type: "condition",
      position: { x: 100, y: 300 },
      data: {
        label: "High Score?",
        conditions: [
          {
            field: "score_lead.output.analysis.score", // ← Access AI result
            operator: "greater_than",
            value: 70,
          },
        ],
      },
    },
    {
      id: "notify_sales",
      type: "action",
      position: { x: 50, y: 400 },
      data: {
        label: "Notify Sales Team",
        actionType: "create_task",
        title: "Hot Lead: {{trigger.lead.name}}",
        description:
          "Score: {{score_lead.output.analysis.score}}\n\nReasons:\n{{score_lead.output.analysis.factors}}",
      },
    },
  ],
  edges: [
    { source: "trigger", target: "score_lead" },
    { source: "score_lead", target: "check_score" },
    { source: "check_score", target: "notify_sales", data: { branch: "true" } },
  ],
};

// Save the workflow
const { data } = await supabase
  .from("workflows")
  .insert(workflow)
  .select()
  .single();
```

### Step 3: Test It!

```typescript
// Trigger the workflow
const execution = await fetch("/api/workflows/engine/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "your-workflow-id",
    triggerData: {
      lead: {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        company: "Acme Corp",
        source: "website",
        notes: "Interested in premium membership",
      },
    },
  }),
});

const result = await execution.json();
console.log("Execution Result:", result);
```

### Step 4: View Results

```typescript
// Get execution logs
const logs = await fetch(
  "/api/workflows/actions/execute-agent?workflowId=your-workflow-id&limit=10",
);
const { data } = await logs.json();

console.log("Agent Executions:", data);
// [
//   {
//     agent_id: '...',
//     tokens_used: 1500,
//     cost_usd: 0.045,
//     cost_billed_usd: 0.054,  // +20% markup
//     action_data: {
//       workflow_id: '...',
//       execution_id: '...',
//       prompt: '...',
//       result: { score: 85, factors: [...] }
//     }
//   }
// ]
```

---

## Common Use Cases

### 1. Lead Scoring

```typescript
{
  actionType: 'ai_agent_analysis',
  agentId: 'lead-scorer',
  dataToAnalyze: '{{trigger.lead}}',
  analysisType: 'lead_scoring'
}

// Access result:
// {{score_lead.output.analysis.score}} → 85
// {{score_lead.output.analysis.factors}} → ["High engagement", "Budget confirmed"]
```

### 2. Email Generation

```typescript
{
  actionType: 'ai_agent_generate_content',
  agentId: 'content-gen',
  contentType: 'email',
  targetAudience: 'fitness_enthusiasts',
  tone: 'motivational',
  additionalContext: 'Promoting new HIIT class'
}

// Access result:
// {{generate_email.output.generated_content}} → "Hi {{name}}! Ready to transform..."
```

### 3. Sentiment Analysis

```typescript
{
  actionType: 'ai_agent_analysis',
  agentId: 'sentiment-analyzer',
  dataToAnalyze: '{{trigger.support_ticket.message}}',
  analysisType: 'sentiment'
}

// Access result:
// {{analyze.output.analysis.sentiment}} → "negative"
// {{analyze.output.analysis.confidence}} → 0.92
```

### 4. Content Moderation

```typescript
{
  actionType: 'ai_agent_analysis',
  agentId: 'moderator',
  dataToAnalyze: '{{trigger.user_post.content}}',
  analysisType: 'content_moderation'
}

// Access result:
// {{moderate.output.analysis.is_appropriate}} → false
// {{moderate.output.analysis.categories}} → ["spam", "promotional"]
```

### 5. Data Extraction

```typescript
{
  actionType: 'ai_agent_analysis',
  agentId: 'extractor',
  dataToAnalyze: '{{trigger.form_submission.raw_text}}',
  analysisType: 'data_extraction',
  extractionSchema: {
    name: 'string',
    email: 'string',
    phone: 'string',
    goals: 'array'
  }
}

// Access result:
// {{extract.output.analysis.name}} → "John Doe"
// {{extract.output.analysis.goals}} → ["lose weight", "build muscle"]
```

---

## Available Actions

### 1. `execute_ai_agent_task`

**Purpose**: General-purpose AI task execution

**Required Parameters**:

- `agentId`: ID of the agent to use
- `prompt`: The task prompt (supports `{{variables}}`)

**Optional Parameters**:

- `stepId`: Custom step identifier

**Example**:

```typescript
{
  actionType: 'execute_ai_agent_task',
  agentId: 'general-assistant',
  prompt: 'Summarize this lead interaction: {{trigger.interaction_log}}'
}
```

**Output Format**:

```typescript
{
  agent_response: "Summary text...",
  agent_result: {
    content: "Full response...",
    tool_calls: [...]
  },
  cost: { totalTokens: 1500, costBilledCents: 4.5 },
  execution_time_ms: 2340
}
```

---

### 2. `ai_agent_analysis`

**Purpose**: Structured data analysis

**Required Parameters**:

- `agentId`: ID of the agent
- `dataToAnalyze`: Data to analyze (supports `{{variables}}`)

**Optional Parameters**:

- `analysisType`: Type of analysis (default: 'general')
  - `sentiment` - Sentiment analysis
  - `lead_scoring` - Lead qualification
  - `content_moderation` - Content review
  - `data_extraction` - Extract structured data
  - `classification` - Categorize data
  - `general` - General analysis

**Example**:

```typescript
{
  actionType: 'ai_agent_analysis',
  agentId: 'analyzer',
  dataToAnalyze: '{{trigger.customer_feedback}}',
  analysisType: 'sentiment'
}
```

**Output Format (Sentiment)**:

```typescript
{
  analysis: {
    sentiment: "positive" | "negative" | "neutral",
    confidence: 0.95,
    key_phrases: ["loved the service", "great experience"]
  },
  analysis_type: "sentiment",
  cost: {...}
}
```

**Output Format (Lead Scoring)**:

```typescript
{
  analysis: {
    score: 85,
    factors: [
      "High engagement rate",
      "Budget confirmed",
      "Decision maker contact"
    ],
    recommended_actions: [
      "Schedule demo call within 24 hours",
      "Send pricing information"
    ]
  },
  analysis_type: "lead_scoring",
  cost: {...}
}
```

---

### 3. `ai_agent_generate_content`

**Purpose**: AI-powered content generation

**Required Parameters**:

- `agentId`: ID of the agent
- `contentType`: Type of content to generate

**Optional Parameters**:

- `targetAudience`: Target audience (default: 'general')
- `tone`: Content tone (default: 'professional')
- `additionalContext`: Extra context for generation

**Example**:

```typescript
{
  actionType: 'ai_agent_generate_content',
  agentId: 'content-gen',
  contentType: 'social_post',
  targetAudience: 'fitness_enthusiasts',
  tone: 'energetic',
  additionalContext: 'Announcing new 6am bootcamp class'
}
```

**Output Format**:

```typescript
{
  generated_content: "Rise and grind! 🏋️ We're launching...",
  content_type: "social_post",
  target_audience: "fitness_enthusiasts",
  tone: "energetic",
  cost: {...}
}
```

---

## Variable Interpolation

All parameters support variable interpolation using `{{path.to.variable}}` syntax.

### Available Scopes

```typescript
// Trigger data
{
  {
    trigger.lead.name;
  }
}
{
  {
    trigger.lead.email;
  }
}
{
  {
    trigger.campaign.id;
  }
}

// Workflow variables
{
  {
    variables.agent_id;
  }
}
{
  {
    variables.score_threshold;
  }
}

// Previous node outputs
{
  {
    score_lead.output.analysis.score;
  }
}
{
  {
    generate_email.output.generated_content;
  }
}

// Special variables
{
  {
    organizationId;
  }
}
{
  {
    workflowId;
  }
}
{
  {
    executionId;
  }
}
```

### Examples

```typescript
// Simple variable
prompt: "Analyze {{trigger.lead.name}}";

// Nested path
dataToAnalyze: "{{trigger.form.responses.question_1}}";

// Multiple variables
prompt: "Score lead {{trigger.lead.name}} from {{trigger.lead.company}}";

// Using node outputs
prompt: "Generate email based on score: {{score_lead.output.analysis.score}}";
```

---

## Cost Tracking

Every agent execution includes detailed cost information:

```typescript
{
  cost: {
    model: "gpt-4",
    inputTokens: 1200,      // Tokens in prompt
    outputTokens: 400,      // Tokens in response
    totalTokens: 1600,      // Sum
    costBaseCents: 4,       // Actual API cost ($0.04)
    costBilledCents: 5,     // With 20% markup ($0.05)
    markupPercentage: 20
  },
  execution_time_ms: 2340   // Execution time
}
```

**Cost Calculation Example** (GPT-4):

```
Input:  1200 tokens × $0.03/1k = $0.036
Output:  400 tokens × $0.06/1k = $0.024
                Base Cost Total = $0.060
                      Markup 20% = $0.012
                 Billed Cost Total = $0.072
```

---

## Error Handling

### Common Errors

**1. Agent Not Found**

```typescript
{
  success: false,
  error: "Agent not found or access denied"
}
```

**Solution**: Verify `agentId` is correct and belongs to your organization

**2. Missing Parameters**

```typescript
{
  success: false,
  error: "Missing required fields: agentId, prompt"
}
```

**Solution**: Ensure all required parameters are provided

**3. Execution Failed**

```typescript
{
  success: false,
  error: "Agent execution failed: Rate limit exceeded"
}
```

**Solution**: Task will retry automatically (up to 3 times)

### Handling Errors in Workflows

```typescript
{
  id: 'score_lead',
  type: 'action',
  data: {
    actionType: 'ai_agent_analysis',
    agentId: '{{variables.agent_id}}',
    dataToAnalyze: '{{trigger.lead}}',
    continueOnError: true,  // ← Continue workflow even if agent fails
    retryConfig: {
      enabled: true,
      maxAttempts: 3,
      backoffType: 'exponential'
    }
  }
}
```

---

## Testing

### 1. Test Agent Directly

```bash
curl -X POST http://localhost:3000/api/workflows/actions/execute-agent \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "wf-test-123",
    "stepId": "test-step",
    "executionId": "exec-test-456",
    "agentId": "your-agent-id",
    "prompt": "Test prompt: analyze this data",
    "context": {
      "organizationId": "your-org-id",
      "test": true
    }
  }'
```

### 2. View Execution Logs

```bash
curl http://localhost:3000/api/workflows/actions/execute-agent?workflowId=wf-123&limit=10
```

### 3. Check Database

```sql
-- View recent agent tasks
SELECT * FROM ai_agent_tasks
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;

-- View activity logs
SELECT * FROM ai_agent_activity_log
WHERE action_type = 'workflow_agent_execution'
ORDER BY created_at DESC
LIMIT 10;

-- View cost/usage
SELECT * FROM ai_usage_logs
WHERE organization_id = 'your-org-id'
AND action_type = 'workflow_automation'
ORDER BY created_at DESC;
```

---

## Best Practices

### 1. Agent Selection

- ✅ Use specialized agents for specific tasks
- ✅ One agent per workflow type (lead scoring, content gen, etc.)
- ❌ Don't use general-purpose agents for everything

### 2. Prompt Engineering

- ✅ Be specific and clear
- ✅ Include relevant context
- ✅ Use structured formats for structured output
- ❌ Don't include sensitive data unless necessary

### 3. Cost Optimization

- ✅ Use smaller models (GPT-3.5) for simple tasks
- ✅ Limit max_tokens on agents
- ✅ Cache frequently used responses (future feature)
- ❌ Don't use GPT-4 for simple classification

### 4. Error Handling

- ✅ Always set `continueOnError: true` for non-critical paths
- ✅ Configure retry logic for flaky operations
- ✅ Log errors for debugging
- ❌ Don't fail entire workflow on agent errors

---

## Next Steps

1. **Create Your First Agent**: Go to AI Agents section in dashboard
2. **Build a Workflow**: Add agent actions to your automation
3. **Test Thoroughly**: Use test triggers before going live
4. **Monitor Costs**: Check usage logs regularly
5. **Iterate**: Refine prompts based on results

## Support

- **Documentation**: `/lib/ai-agents/WORKFLOW_INTEGRATION.md`
- **Examples**: `/lib/ai-agents/workflow-integration.example.ts`
- **Architecture**: `/lib/ai-agents/ARCHITECTURE_DIAGRAM.md`
- **API Logs**: `/api/workflows/actions/execute-agent?workflowId=X`

Happy Automating! 🚀
