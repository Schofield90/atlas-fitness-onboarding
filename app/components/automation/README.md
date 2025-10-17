# Advanced Workflow Builder System

A comprehensive workflow automation system with advanced conditional logic, branching capabilities, and visual workflow building.

## Features

### 🎯 Advanced Condition Types

#### Lead Score Conditions
- **Greater than / Less than**: Compare lead scores against thresholds
- **Equals**: Exact score matching
- **Between ranges**: Score falls within min/max values
- **Greater/Less than or equal**: Inclusive comparisons

```typescript
{
  conditionType: 'lead_score',
  operator: 'greater_than',
  value: 50
}
```

#### Tag-Based Conditions
- **Has tag**: Lead has specific tag(s)
- **Doesn't have tag**: Lead missing specific tag(s)
- **Has any/all tags**: Flexible tag matching with AND/OR logic

```typescript
{
  conditionType: 'tags',
  operator: 'has_any',
  tags: ['hot-lead', 'website', 'social'],
  logic: 'any'
}
```

#### Time-Based Conditions
- **Business hours**: Execute only during specified hours
- **Specific days**: Target weekdays, weekends, or custom days
- **Date ranges**: Time-bounded execution periods
- **Time since events**: Relative time conditions

```typescript
{
  conditionType: 'time_based',
  timeType: 'business_hours',
  startTime: '09:00',
  endTime: '17:00',
  workDays: [1, 2, 3, 4, 5] // Mon-Fri
}
```

#### Field Comparisons
- **Email domain matching**: `@gmail.com`, `@company.com`
- **Phone area code**: Geographic targeting
- **Custom field values**: Any lead field comparison
- **Empty/not empty**: Field presence validation

```typescript
{
  conditionType: 'field_comparison',
  field: 'email',
  operator: 'ends_with',
  value: '@gmail.com'
}
```

#### Activity Conditions
- **Email opened/clicked**: Engagement tracking
- **Form submissions**: Conversion events
- **Page visits**: Behavioral triggers
- **Time-based activity**: Within X days/hours

```typescript
{
  conditionType: 'activity',
  activityType: 'email_opened',
  timeframe: { value: 7, unit: 'days' },
  operator: 'within'
}
```

#### Multi-Condition Logic
- **AND operations**: All conditions must be true
- **OR operations**: Any condition can be true
- **Nested conditions**: Complex logical expressions
- **Condition groups**: Hierarchical logic structures

```typescript
{
  conditionType: 'multi_condition',
  logic: 'AND',
  conditions: [
    { field: 'score', operator: 'greater_than', value: 50 },
    { field: 'tags', operator: 'has_tag', value: 'hot-lead' }
  ]
}
```

### 🔀 Enhanced Branching

#### Multiple Branch Paths
- **Conditional branching**: Yes/No/Alternative paths
- **Multi-way branching**: 3+ outcomes from single condition
- **Weighted routing**: Percentage-based path selection
- **A/B testing paths**: Built-in experimentation

#### Nested Conditions
- **Condition chains**: Sequential decision making
- **Hierarchical logic**: Nested if/else structures
- **Complex workflows**: Multi-level branching
- **Dynamic paths**: Runtime path determination

#### Loop Support
- **Repeat until condition**: Loop with exit criteria
- **Maximum iterations**: Safety limits
- **Break conditions**: Early loop exit
- **Progress tracking**: Loop iteration monitoring

```typescript
{
  type: 'loop',
  config: {
    maxIterations: 10,
    breakCondition: {
      field: 'engagement_score',
      operator: 'greater_than',
      value: 80
    }
  }
}
```

#### Parallel Execution
- **Multiple simultaneous paths**: Concurrent execution
- **Wait strategies**: All complete vs first complete
- **Resource optimization**: Efficient parallel processing
- **Result merging**: Combine parallel outcomes

```typescript
{
  type: 'parallel',
  config: {
    branches: 3,
    waitForAll: false, // Continue on first completion
    timeout: 30000 // 30 second timeout
  }
}
```

#### Conditional Delays
- **Dynamic wait times**: Data-driven delays
- **Business hour awareness**: Skip non-working hours
- **Escalation delays**: Increasing wait times
- **Activity-based timing**: Adjust based on engagement

```typescript
{
  type: 'delay',
  config: {
    baseDelay: { value: 2, unit: 'hours' },
    conditions: [
      {
        condition: { field: 'email_opened', operator: 'equals', value: true },
        delayModifier: { operation: 'multiply', value: 0.5 }
      }
    ]
  }
}
```

### 🎨 Visual Enhancements

#### Better Visual Representation
- **Color-coded nodes**: Type-specific colors
- **Status indicators**: Real-time execution status
- **Progress visualization**: Step completion tracking
- **Interactive elements**: Expandable node details

#### Branch Path Visualization
- **Colored connections**: Path-specific edge colors
- **Animated flows**: Live execution visualization
- **Path highlighting**: Active route emphasis
- **Branch labels**: Clear path identification

#### Collapsible Sections
- **Node details**: Expandable configuration views
- **Workflow sections**: Organized node grouping
- **Execution logs**: Detailed step information
- **Performance metrics**: Timing and success rates

#### Path Validation
- **Connection validation**: Ensure proper node linking
- **Logic validation**: Check condition completeness
- **Warning indicators**: Highlight potential issues
- **Suggestion system**: Workflow optimization tips

### 🧪 Workflow Testing

#### Test Mode Features
- **Step-by-step execution**: Manual progression control
- **Sample data injection**: Test with realistic data
- **Branch path highlighting**: Visual execution flow
- **Debug logging**: Detailed execution information

#### Execution Preview
- **Dry run capability**: Test without side effects
- **Performance estimation**: Execution time prediction
- **Resource usage**: Memory and processing requirements
- **Error simulation**: Test error handling paths

#### Branch Path Testing
- **Path coverage**: Ensure all branches are tested
- **Condition validation**: Verify logic correctness
- **Edge case testing**: Handle boundary conditions
- **Performance profiling**: Identify bottlenecks

### 📋 Workflow Templates

#### Pre-built Conditional Workflows

##### Smart Lead Nurturing Campaign
- Lead score-based routing
- Behavioral trigger responses
- Multi-channel engagement
- A/B testing capabilities

##### Complete Client Onboarding
- Progress tracking system
- Conditional task creation
- Document collection workflows
- Milestone celebrations

##### Intelligent Retention Campaign
- Churn prediction logic
- Engagement scoring
- Win-back sequences
- Personalized offers

##### Smart Appointment Booking
- Availability checking
- Automated reminders
- Rescheduling handling
- No-show follow-up

#### Industry-Specific Templates
- **Fitness/Wellness**: Member onboarding, retention
- **Real Estate**: Lead qualification, follow-up
- **E-commerce**: Cart abandonment, post-purchase
- **B2B Services**: Lead nurturing, client success

#### Customizable Condition Sets
- **Template variations**: Multiple configuration options
- **Parameter customization**: Adjustable thresholds
- **Brand personalization**: Custom messaging
- **Integration options**: External service connections

## Usage Examples

### Basic Lead Scoring Workflow

```typescript
const leadScoringWorkflow = {
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      data: {
        label: 'New Lead',
        config: { source: 'website' }
      }
    },
    {
      id: 'score_check',
      type: 'condition',
      data: {
        label: 'Score Check',
        config: {
          conditionType: 'lead_score',
          operator: 'greater_than',
          value: 70
        }
      }
    },
    {
      id: 'high_value_action',
      type: 'action',
      data: {
        label: 'Send Premium Welcome',
        config: { templateId: 'premium-welcome' }
      }
    },
    {
      id: 'standard_action',
      type: 'action',
      data: {
        label: 'Send Standard Welcome',
        config: { templateId: 'standard-welcome' }
      }
    }
  ],
  edges: [
    { source: 'trigger', target: 'score_check' },
    { source: 'score_check', target: 'high_value_action', sourceHandle: 'true' },
    { source: 'score_check', target: 'standard_action', sourceHandle: 'false' }
  ]
}
```

### Advanced Multi-Condition Workflow

```typescript
const complexConditionWorkflow = {
  nodes: [
    {
      id: 'multi_condition',
      type: 'condition',
      data: {
        label: 'Complex Qualification',
        config: {
          conditionType: 'multi_condition',
          logic: 'AND',
          conditions: [
            {
              type: 'lead_score',
              operator: 'greater_than',
              value: 50
            },
            {
              type: 'tags',
              operator: 'has_any',
              tags: ['hot-lead', 'engaged']
            },
            {
              type: 'time_based',
              timeType: 'business_hours'
            }
          ]
        }
      }
    }
  ]
}
```

### Parallel Processing Example

```typescript
const parallelWorkflow = {
  nodes: [
    {
      id: 'parallel_engagement',
      type: 'parallel',
      data: {
        label: 'Multi-Channel Outreach',
        config: {
          branches: 3,
          waitForAll: false
        }
      }
    },
    {
      id: 'email_branch',
      type: 'action',
      data: {
        label: 'Send Email',
        config: { templateId: 'follow-up' }
      }
    },
    {
      id: 'sms_branch',
      type: 'action',
      data: {
        label: 'Send SMS',
        config: { message: 'Quick follow-up message' }
      }
    },
    {
      id: 'task_branch',
      type: 'action',
      data: {
        label: 'Create Task',
        config: { title: 'Personal follow-up call' }
      }
    }
  ],
  edges: [
    { source: 'parallel_engagement', target: 'email_branch', sourceHandle: 'branch-0' },
    { source: 'parallel_engagement', target: 'sms_branch', sourceHandle: 'branch-1' },
    { source: 'parallel_engagement', target: 'task_branch', sourceHandle: 'branch-2' }
  ]
}
```

## Architecture

### Component Structure
```
app/components/automation/
├── AdvancedWorkflowBuilder.tsx     # Main builder interface
├── nodes/                          # Node components
│   ├── AdvancedConditionNode.tsx   # Enhanced condition node
│   ├── AdvancedActionNode.tsx      # Enhanced action node
│   ├── AdvancedTriggerNode.tsx     # Enhanced trigger node
│   ├── LoopNode.tsx               # Loop execution node
│   ├── ParallelNode.tsx           # Parallel execution node
│   ├── MergeNode.tsx              # Branch merge node
│   └── DelayNode.tsx              # Conditional delay node
├── conditions/
│   └── ConditionBuilder.tsx        # Advanced condition editor
├── testing/
│   └── WorkflowTester.tsx         # Enhanced testing framework
└── templates/
    └── WorkflowTemplates.tsx       # Pre-built templates
```

### Execution Engine
```
app/lib/workflow/
├── execution-engine.ts             # Original execution engine
└── advanced-execution-engine.ts    # Enhanced execution engine
```

## Integration

### Using the Advanced Workflow Builder

```tsx
import AdvancedWorkflowBuilder from '@/app/components/automation/AdvancedWorkflowBuilder'

function WorkflowPage() {
  const handleSave = (workflow) => {
    // Save workflow to database
    console.log('Saving workflow:', workflow)
  }

  return (
    <AdvancedWorkflowBuilder
      initialWorkflow={existingWorkflow}
      onSave={handleSave}
    />
  )
}
```

### Executing Advanced Workflows

```typescript
import { AdvancedWorkflowExecutionEngine } from '@/app/lib/workflow/advanced-execution-engine'

const engine = AdvancedWorkflowExecutionEngine.createAdvanced()

await engine.executeWorkflow({
  workflowId: 'workflow-123',
  organizationId: 'org-456',
  triggerData: {
    type: 'lead_created',
    lead: { id: '789', score: 85, tags: ['hot-lead'] }
  },
  context: {
    source: 'website',
    campaign: 'summer-promotion'
  }
})
```

## Performance Considerations

- **Parallel Execution**: Optimized for concurrent processing
- **Memory Management**: Efficient context handling
- **Timeout Protection**: Prevents runaway executions
- **Resource Limits**: Configurable execution constraints
- **Caching**: Intelligent template and data caching

## Security Features

- **Input Validation**: Comprehensive data sanitization
- **Permission Checks**: Role-based access control
- **Execution Limits**: Rate limiting and quotas
- **Audit Logging**: Complete execution tracking
- **Data Privacy**: Secure variable replacement

## Future Enhancements

- **AI-Powered Optimization**: Automatic workflow improvements
- **Advanced Analytics**: Detailed performance insights
- **Custom Node Types**: Extensible node system
- **External Integrations**: Third-party service connections
- **Version Control**: Workflow versioning and rollback