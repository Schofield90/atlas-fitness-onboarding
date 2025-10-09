# AI Agent Workflow Integration Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW EXECUTION FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Trigger    │  (e.g., lead.created, campaign.started)
│   Event      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Workflow Execution Engine                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Trigger    │─▶│   Action    │─▶│  Condition  │─▶│   Action    │   │
│  │    Node     │  │    Node     │  │    Node     │  │    Node     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                          │                                               │
│                          │ actionType: 'execute_ai_agent_task'          │
│                          │ or 'ai_agent_analysis'                       │
│                          │ or 'ai_agent_generate_content'               │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Action Handler (agent-actions.ts)                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  executeAIAgentTaskAction()                                      │   │
│  │  - Validates parameters (agentId, prompt)                        │   │
│  │  - Interpolates variables {{trigger.lead.name}}                 │   │
│  │  - Calls executeAgentFromWorkflow()                             │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              Workflow Integration (workflow-integration.ts)              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  WorkflowAgentExecutor.executeFromWorkflow()                     │   │
│  │  1. Validate agent ownership (organization_id match)             │   │
│  │  2. Validate workflow ownership                                  │   │
│  │  3. Create ai_agent_tasks record                                │   │
│  │  4. Call AgentOrchestrator.executeTask()                        │   │
│  │  5. Track costs with 20% markup                                 │   │
│  │  6. Log to ai_agent_activity_log                                │   │
│  │  7. Log to ai_usage_logs for billing                            │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 Agent Orchestrator (orchestrator.ts)                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  executeTask(taskId)                                             │   │
│  │  1. Fetch task from ai_agent_tasks                              │   │
│  │  2. Fetch agent from ai_agents                                  │   │
│  │  3. Update task status: running                                 │   │
│  │  4. Execute via provider (OpenAI/Anthropic)                     │   │
│  │  5. Update task with result                                     │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼─────────┐  ┌─────▼──────────┐
         │  OpenAI Provider   │  │ Anthropic Prov │
         │  (gpt-4, etc.)     │  │ (claude-3, etc)│
         └──────────┬─────────┘  └─────┬──────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   AI Model Response  │
                    │   + Token Usage      │
                    │   + Cost Calculation │
                    └─────────┬───────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Result Processing                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  1. Calculate costs (base + 20% markup)                          │   │
│  │  2. Log to ai_agent_activity_log with workflow metadata         │   │
│  │  3. Log to ai_usage_logs for billing                            │   │
│  │  4. Return result to workflow execution                         │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  Workflow Execution Context Update                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  context.agent_score = {                                         │   │
│  │    output: {                                                     │   │
│  │      agent_response: "Lead score: 85/100...",                   │   │
│  │      agent_result: { content: "...", tool_calls: [...] },      │   │
│  │      cost: { totalTokens: 2000, costBilledCents: 5 },          │   │
│  │      execution_time_ms: 2340                                    │   │
│  │    }                                                             │   │
│  │  }                                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Next Workflow     │
                    │   Node Execution    │
                    │   (can access       │
                    │   agent results)    │
                    └─────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

Workflow Trigger
      │
      │ { lead: { id: "123", name: "John", email: "..." } }
      ▼
Action Node Config
      │
      │ {
      │   actionType: "ai_agent_analysis",
      │   agentId: "lead-scorer",
      │   dataToAnalyze: "{{trigger.lead}}",
      │   analysisType: "lead_scoring"
      │ }
      ▼
Variable Interpolation
      │
      │ dataToAnalyze becomes actual lead data
      ▼
API Call to Execute Agent
      │
      │ POST /api/workflows/actions/execute-agent
      │ {
      │   workflowId: "wf-123",
      │   stepId: "score-lead",
      │   executionId: "exec-456",
      │   agentId: "lead-scorer",
      │   prompt: "Analyze lead and score...",
      │   context: { lead: {...}, variables: {...} }
      │ }
      ▼
Validation & Security
      │
      │ - Verify workflow exists and belongs to org
      │ - Verify agent exists and belongs to org
      │ - Create task record
      ▼
AI Execution
      │
      │ - Agent: Lead Scoring Agent (GPT-4)
      │ - Prompt: "Score this lead: {lead data}"
      │ - Tools: [get_lead_history, calculate_engagement]
      ▼
AI Response
      │
      │ {
      │   content: "Analysis: This lead shows...",
      │   score: 85,
      │   factors: ["High engagement", "Budget confirmed"],
      │   recommended_actions: ["Schedule demo", "Send pricing"]
      │ }
      ▼
Cost Calculation
      │
      │ Input: 1200 tokens @ $0.03/1k = $0.036
      │ Output: 400 tokens @ $0.06/1k = $0.024
      │ Base Cost: $0.060
      │ Markup (20%): $0.012
      │ Billed Cost: $0.072
      ▼
Logging & Tracking
      │
      │ ai_agent_tasks: Task completed
      │ ai_agent_activity_log: Workflow execution logged
      │ ai_usage_logs: Billing record created
      ▼
Result to Workflow
      │
      │ {
      │   success: true,
      │   output: {
      │     agent_response: "...",
      │     agent_result: { score: 85, factors: [...] },
      │     cost: { totalTokens: 1600, costBilledCents: 7.2 },
      │     execution_time_ms: 2340
      │   }
      │ }
      ▼
Context Update
      │
      │ context.score_lead = { output: {...} }
      ▼
Next Node Access
      │
      │ Condition: {{score_lead.output.agent_result.score}} >= 70
      │ Result: true → Route to "Create High-Value Task"
      └──────────────────────────────────────────────────────────┘
```

## Database Schema Interaction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE OPERATIONS                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   workflows          │
│  ┌────────────────┐  │     Validated during execution
│  │ id             │──┼────▶ Ensure workflow exists
│  │ organization_id│──┼────▶ Ensure org ownership
│  │ name           │  │     Check is_active
│  │ is_active      │  │
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│   ai_agents          │
│  ┌────────────────┐  │     Validated during execution
│  │ id             │──┼────▶ Ensure agent exists
│  │ organization_id│──┼────▶ Ensure org ownership
│  │ model          │──┼────▶ Determine provider
│  │ system_prompt  │──┼────▶ Used in execution
│  │ allowed_tools  │──┼────▶ Tool selection
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│   ai_agent_tasks     │     Created for each execution
│  ┌────────────────┐  │
│  │ id             │◀─┼──── Generated UUID
│  │ agent_id       │◀─┼──── From request
│  │ organization_id│◀─┼──── From workflow
│  │ title          │◀─┼──── "Workflow Task: {id}"
│  │ task_type      │◀─┼──── 'automation'
│  │ context        │◀─┼──── { workflow_id, step_id, ... }
│  │ status         │──┼──── pending → running → completed
│  │ result         │──┼──── AI response stored
│  │ tokens_used    │──┼──── From provider
│  │ cost_usd       │──┼──── Calculated
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│ ai_agent_activity_log│     Activity tracking
│  ┌────────────────┐  │
│  │ agent_id       │◀─┼──── Agent that executed
│  │ organization_id│◀─┼──── For billing
│  │ task_id        │◀─┼──── Links to task
│  │ action_type    │◀─┼──── 'workflow_agent_execution'
│  │ action_data    │◀─┼──── { workflow_id, execution_id, step_id }
│  │ tokens_used    │──┼──── Token count
│  │ cost_usd       │──┼──── Base cost
│  │ cost_billed_usd│──┼──── Cost + markup
│  │ execution_time │──┼──── Duration in ms
│  │ success        │──┼──── true/false
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│   ai_usage_logs      │     Billing records
│  ┌────────────────┐  │
│  │ organization_id│◀─┼──── For invoicing
│  │ agent_id       │◀─┼──── Which agent
│  │ task_id        │◀─┼──── Which task
│  │ action_type    │◀─┼──── 'workflow_automation'
│  │ model          │◀─┼──── AI model used
│  │ input_tokens   │──┼──── Tokens in
│  │ output_tokens  │──┼──── Tokens out
│  │ total_tokens   │──┼──── Sum
│  │ cost_base_usd  │──┼──── Provider cost
│  │ cost_billed_usd│──┼──── Customer charge
│  │ metadata       │◀─┼──── { workflow_id, execution_id }
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│ workflow_executions  │     Execution tracking
│  ┌────────────────┐  │
│  │ id             │──┼────▶ Links to agent context
│  │ workflow_id    │  │
│  │ status         │  │      Updates as nodes execute
│  │ execution_steps│──┼────▶ Array includes agent steps
│  └────────────────┘  │
└──────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SECURITY VALIDATION                            │
└─────────────────────────────────────────────────────────────────────────┘

Request Received
      │
      ▼
┌──────────────────────┐
│ 1. Organization      │  Verify workflow.organization_id exists
│    Validation        │  Extract from workflow or context
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Workflow          │  Check workflows table
│    Ownership         │  WHERE id = workflowId
│    Validation        │  AND organization_id = organizationId
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Agent             │  Check ai_agents table
│    Ownership         │  WHERE id = agentId
│    Validation        │  AND organization_id = organizationId
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. Task Creation     │  Use createAdminClient()
│    (Admin Client)    │  Bypasses RLS for system operations
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. Execution         │  Agent executes with org context
│    Isolation         │  Tools only access org data
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. Activity          │  All actions logged with
│    Logging           │  organization_id for audit
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 7. Cost              │  Billing tied to organization
│    Attribution       │  Cannot access other org's costs
└──────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ERROR HANDLING                                │
└─────────────────────────────────────────────────────────────────────────┘

Request
  │
  ├─▶ Missing Parameters ─────▶ 400 Bad Request
  │                             { success: false, error: "Missing..." }
  │
  ├─▶ Workflow Not Found ─────▶ 404 Not Found
  │                             { success: false, error: "Workflow not found" }
  │
  ├─▶ Agent Not Found ────────▶ 403 Forbidden
  │                             { success: false, error: "Agent not found..." }
  │
  ├─▶ Organization Mismatch ──▶ 403 Forbidden
  │                             { success: false, error: "Access denied" }
  │
  ├─▶ Task Creation Failed ───▶ 500 Internal Error
  │                             { success: false, error: "Failed to create..." }
  │
  ├─▶ AI Execution Failed ────▶ 500 Internal Error
  │   │                         { success: false, error: "Agent execution..." }
  │   │
  │   ├─▶ API Rate Limit ──────▶ Logged, task marked failed, retry queued
  │   ├─▶ Timeout ─────────────▶ Logged, task marked failed, no retry
  │   ├─▶ Invalid Response ────▶ Logged, task marked failed, retry queued
  │   └─▶ Unknown Error ───────▶ Logged, task marked failed, retry queued
  │
  └─▶ Success ────────────────▶ 200 OK
                                {
                                  success: true,
                                  result: {...},
                                  cost: {...},
                                  executionTimeMs: 2340
                                }
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE NOTES                               │
└─────────────────────────────────────────────────────────────────────────┘

Timeouts:
  - API Endpoint: 60 seconds (maxDuration)
  - AI Provider: Inherits from provider settings
  - Database Queries: Default Supabase timeout

Concurrency:
  - Multiple agents can execute in parallel
  - No global locks
  - Database handles concurrent writes

Caching:
  - Agent configs: Not cached (always fresh)
  - Workflow configs: Not cached (always fresh)
  - AI Responses: Not cached (future enhancement)

Retries:
  - Task retry_count tracked
  - max_retries: 3 (configurable)
  - Exponential backoff possible (future)

Optimization Opportunities:
  1. Cache agent system prompts
  2. Batch multiple agent calls
  3. Stream long responses
  4. Pre-warm common agent contexts
  5. Deduplicate identical prompts
```
