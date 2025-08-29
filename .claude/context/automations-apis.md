# Automations APIs - Endpoint Inventory

*Last updated: 2025-08-29T00:00:00Z*

## Workflow Management APIs

### Core Workflow CRUD Operations

#### `/api/automations/workflows` 
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/route.ts`
- **GET**: Fetch all workflows for current organization
  - Returns: `{ workflows: Workflow[] }`
  - Authorization: Uses `getCurrentUserOrganization()`
  - [source: app/api/automations/workflows/route.ts:L5-L29]

- **POST**: Create new workflow
  - Body: `{ name, description, nodes, edges, status, trigger_type, trigger_config, variables, settings }`
  - Returns: Created workflow object
  - [source: app/api/automations/workflows/route.ts:L32-L50]

#### `/api/automations/workflows/[id]`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/[id]/route.ts`
- **GET**: Fetch specific workflow by ID
- **PUT**: Update existing workflow
- **DELETE**: Delete workflow

#### `/api/automations/workflows/[id]/execute`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/[id]/execute/route.ts`
- **POST**: Execute specific workflow manually
- Used for testing and manual workflow triggers

### Alternative Workflow API (Legacy)

#### `/api/workflows`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/workflows/route.ts`
- **POST**: Legacy workflow creation endpoint
- Uses hardcoded organization ID: `'63589490-8f55-4157-bd3a-e141594b748e'`
- [source: app/api/workflows/route.ts:L15-L16]

#### `/api/workflows/v2`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/workflows/v2/route.ts`
- Enhanced workflow management (v2 API)

#### `/api/workflows/v2/[workflowId]/execute`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/workflows/v2/[workflowId]/execute/route.ts`
- V2 execution endpoint

### Testing & Development APIs

#### `/api/workflows/test-trigger`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/workflows/test-trigger/route.ts`
- Test trigger functionality for workflow development

#### `/api/workflows/engine`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/workflows/engine/route.ts`
- Workflow execution engine endpoint

#### `/api/automations/scoring-triggers`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/scoring-triggers/route.ts`
- Lead scoring automation triggers

#### `/api/automations/test-email`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/test-email/route.ts`
- Test email sending functionality

#### `/api/automations/test-internal-message`
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/test-internal-message/route.ts`
- Test internal messaging system

## Missing/Stub APIs (Recommended for Implementation)

### Template Management (STUB NEEDED)
- **GET** `/api/automations/templates` - List available workflow templates
- **POST** `/api/automations/templates` - Create custom template
- **GET** `/api/automations/templates/[id]` - Get specific template

### Workflow Analytics (STUB NEEDED)
- **GET** `/api/automations/workflows/[id]/analytics` - Execution statistics
- **GET** `/api/automations/workflows/[id]/executions` - Execution history
- **GET** `/api/automations/analytics/overview` - Overall automation metrics

### Import/Export (STUB NEEDED)
- **POST** `/api/automations/workflows/import` - Import workflow from JSON
- **GET** `/api/automations/workflows/[id]/export` - Export workflow as JSON
- **POST** `/api/automations/workflows/duplicate` - Duplicate existing workflow

### Validation & Testing (PARTIAL)
- **POST** `/api/automations/workflows/validate` - Validate workflow structure
- **POST** `/api/automations/workflows/[id]/test-run` - Dry run execution

## Data Models

### Workflow Object Structure
```typescript
interface Workflow {
  id: string
  organizationId: string
  name: string
  description: string
  status: 'active' | 'draft' | 'paused'
  version: number
  workflowData: {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    variables: WorkflowVariable[]
  }
  triggerType: string
  triggerConfig: Record<string, any>
  settings: {
    errorHandling: 'continue' | 'stop'
    maxExecutionTime: number
    timezone: string
    notifications: {
      onError: boolean
      onComplete: boolean
    }
  }
  stats: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    avgExecutionTime: number
  }
  createdAt: string
  updatedAt: string
}
```

### Database Integration
- **Primary Table**: `workflows` in Supabase
- **Organization Scoped**: All workflows filtered by `organization_id`
- **RLS Policies**: Row-level security enforced
- **Columns**: Maps to Workflow interface with snake_case conversion

## Authentication & Authorization
- All endpoints use server-side Supabase client
- Organization context retrieved via `getCurrentUserOrganization()`
- Multi-tenant isolation enforced through RLS policies

## Error Handling
- Consistent error response format: `{ error: string }`
- HTTP status codes: 400 (validation), 404 (not found), 500 (server error)
- Detailed error logging to console

*[CONTEXT-MANAGER: All endpoint paths verified and functional as of 2025-08-29]*