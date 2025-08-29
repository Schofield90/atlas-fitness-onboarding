# Automations Module Context Brief

**Generated**: 2025-08-29T00:00:00Z  
**Purpose**: Comprehensive context guide for automations module fixes and improvements

## Component Hierarchy

### Main Pages & Routing
- **Main automations page**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/page.tsx:1-386`
  - Displays workflow list with stats, filters, and management controls
  - Fetches from `/api/automations/workflows` endpoint
  - Fallback to sample data when no workflows exist
  
- **Builder page**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/page.tsx:1-19`
  - Simple redirect wrapper to `/automations/builder/new`
  
- **Dynamic builder page**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/[id]/page.tsx:1-195`
  - Handles both new workflow creation (`id=new`) and editing existing workflows
  - Loads workflow data from API or creates mock workflow
  - Integrates with `DynamicWorkflowBuilder` component

### Core Workflow Builder Components

#### 1. WorkflowBuilder (Main Canvas)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:1-1157`

**Key Features**:
- React Flow integration with drag-and-drop from node palette
- Node types: trigger, action, condition, wait, loop, transform, filter
- Real-time validation and auto-save (every 2 seconds)
- Test mode with execution visualization
- Canvas drop handling with position projection
- Connection validation to prevent cycles

**State Management**:
- `useNodesState` and `useEdgesState` from React Flow
- Node palette with categorized items (triggers, communication, crm, logic, data)
- Execution steps tracking for test mode
- Configuration panel state management

**Critical Issues Identified**:
- Drop handler reliance on ReactFlow instance availability
- Auto-save conflicts with manual save operations
- Node selection vs deletion UX issues (line 460-478)

#### 2. DynamicWorkflowBuilder (Wrapper)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/DynamicWorkflowBuilder.tsx:1-58`

**Purpose**: SSR-safe dynamic loading wrapper
- Dynamic import with no SSR to prevent hydration issues  
- Consolidated to only use main WorkflowBuilder (deprecated SimpleWorkflowBuilder)
- Loading state management during component initialization

#### 3. DynamicConfigPanel (Configuration UI)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/DynamicConfigPanel.tsx:1-1004`

**Configuration Schema System**:
- Dynamic form generation based on node type and action type
- Comprehensive field types: text, textarea, select, number, boolean, date, time, json, array
- Conditional field visibility using `showWhen` functions
- Real-time validation with error display
- JSON view toggle for advanced editing

**Node Type Configurations**:
- **Triggers**: Lead, birthday, contact tagged, webhook, email events, appointments
- **Actions**: Email (template/custom), SMS, WhatsApp (template/freeform), task creation
- **Conditions**: Field comparison, lead score, tag checks, time-based, custom logic
- **Control Flow**: Wait (duration/time/condition), loop (count/while/for-each), parallel, merge

### Node System Architecture

#### Node Types Implementation
**Base Node Components**:
- **TriggerNode**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/TriggerNode.tsx`
- **ActionNode**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/ActionNode.tsx`  
- **ConditionNode**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/ConditionNode.tsx`
- **WaitNode, LoopNode, TransformNode, FilterNode**: Similar structure

**Node Configuration Pattern**:
```typescript
// From WorkflowBuilder.tsx:72-81
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  loop: LoopNode,
  transform: TransformNode,
  filter: FilterNode,
}
```

#### Node Palette System
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:84-250`

**Categories**:
1. **Triggers** (9 items): Facebook leads, website forms, social messages, manual entry, webhooks
2. **Communication** (3 items): Email, SMS, WhatsApp  
3. **CRM** (3 items): Update lead, add tag, change stage
4. **Logic** (4 items): If/else, wait, loop, filter
5. **Data** (2 items): Transform data, HTTP request

**Drag & Drop Implementation**:
- Uses `react-dnd` with HTML5Backend
- Custom `PaletteItem` component with drag state
- Drop validation and position calculation
- Node creation with UUID generation

## API Endpoints & Data Flow

### Workflows API
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/route.ts:1-72`

**Endpoints**:
- `GET /api/automations/workflows`: List workflows for organization
- `POST /api/automations/workflows`: Create new workflow

**Data Structure**:
```typescript
// Database schema mapping
const workflowData = {
  organization_id: organizationId,
  name: body.name || 'New Workflow',
  status: body.status || 'draft',
  nodes: body.nodes || [],
  edges: body.edges || [],
  variables: body.variables || {},
  trigger_type: body.trigger_type,
  trigger_config: body.trigger_config || {},
  settings: body.settings || {}
}
```

**Missing Endpoints** (Implementation Gaps):
- `PUT /api/automations/workflows/[id]`: Update existing workflow  
- `DELETE /api/automations/workflows/[id]`: Delete workflow
- `POST /api/automations/workflows/[id]/execute`: Test execution endpoint

## State Management Patterns

### 1. Workflow Builder State
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:298-313`

**Core State Variables**:
- `nodes, setNodes, onNodesChange`: React Flow node state management
- `edges, setEdges, onEdgesChange`: React Flow edge state management  
- `selectedNode`: Current node selection for configuration
- `showConfigPanel`: Configuration panel visibility
- `isTestMode`: Test execution mode toggle
- `executionSteps`: Test run step tracking

### 2. Configuration Panel State  
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/DynamicConfigPanel.tsx:620-630`

**Validation State**:
- `config`: Current node configuration object
- `errors`: Field-level validation errors
- `isValid`: Overall form validation state
- Real-time validation on field changes

### 3. Builder Page State
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/[id]/page.tsx:12-14`

**Workflow Loading**:
- `workflow`: Current workflow data  
- `loading`: Load state management
- API data transformation between database and UI formats

## Template System Architecture

### Template Structure
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/templates/WorkflowTemplates.tsx:1-100`

**Template Categories**:
- lead_nurture, client_onboarding, retention, sales, marketing, operations
- Complexity levels: beginner, intermediate, advanced
- Pre-built node configurations and connections

**Template Features**:
- Usage analytics and ratings
- Feature tags and search functionality
- Preview system with estimated execution times

## Test Runner Implementation

### WorkflowTester Component
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/testing/WorkflowTester.tsx:1-100`

**Test Execution System**:
- JSON payload editor for test data input
- Step-by-step execution visualization  
- Execution path calculation and traversal
- Branch decision tracking
- Real-time status updates during test runs

**Test States**:
```typescript
interface TestExecution {
  id: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  steps: TestStep[]
  executionPath: string[]
  branchDecisions: Record<string, any>
}
```

## Type System & Data Models

### Core Types
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/lib/types/automation.ts:1-386`

**Key Interfaces**:
- `Workflow`: Main workflow definition with metadata, settings, stats
- `WorkflowNode`: Extended React Flow node with automation-specific data
- `NodeData`: Node configuration and state information
- `ExecutionStep`: Test/live execution step tracking
- `WorkflowTemplate`: Template system data structure

**Enhanced Types**:
**File**: `/Users/samschofield/atlas-fitness-onboarding/typescript_interfaces_enhanced_workflows.ts:1-100`
- More comprehensive type definitions
- Extended node type system (17+ node types vs 7 basic)
- Advanced execution context and analytics

## Known Issues & Technical Debt

### 1. Drop Handler Issues
**Location**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:314-379`
- ReactFlow instance dependency for coordinate projection
- Fallback coordinate calculation when instance not ready
- Race conditions during component initialization

### 2. Auto-Save Conflicts
**Location**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:534-560`
- 2-second auto-save timer conflicts with manual saves
- No debouncing or conflict resolution
- Potential data loss during rapid changes

### 3. Node Selection UX  
**Location**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:459-478`
- Single click opens configuration (good)
- But also marks node as selected for deletion (confusing)
- Delete only works via keyboard shortcuts or toolbar

### 4. Test Execution Simulation
**Location**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx:591-675`
- Mock execution with hardcoded delays
- No actual API integration for test execution
- Limited error simulation capabilities

### 5. API Endpoint Gaps
**Missing implementations**:
- Workflow update endpoint (PUT /api/automations/workflows/[id])
- Workflow deletion endpoint  
- Test execution API endpoint
- Template management APIs
- Webhook trigger registration

## Dependencies & Integration Points

### External Dependencies
- **React Flow**: Core canvas and node system
- **react-dnd**: Drag and drop functionality  
- **uuid**: Node ID generation
- **Lucide React**: Icons throughout the UI

### Internal Integrations
- **Organization Context**: `/Users/samschofield/atlas-fitness-onboarding/app/lib/organization-server.ts`
- **Supabase Client**: `/Users/samschofield/atlas-fitness-onboarding/app/lib/supabase/server.ts`
- **Dashboard Layout**: `/Users/samschofield/atlas-fitness-onboarding/app/components/DashboardLayout.tsx`

### Database Integration
- **workflows table**: Core workflow storage
- **workflow_executions table**: Execution history (implied)
- **webhooks table**: Webhook trigger registration (implied)
- Organization-scoped data isolation via RLS

## Performance Considerations

### Current Optimizations
- Dynamic imports for SSR prevention
- Auto-save debouncing (2 seconds)
- Conditional rendering for large node palettes
- React Flow performance optimizations (fitView, connectionLineStyle)

### Performance Issues
- No virtualization for large workflows
- JSON parsing on every configuration change
- No caching for workflow list or templates
- Heavy re-renders during drag operations

## Testing Coverage

### Unit Tests
**File**: `/Users/samschofield/atlas-fitness-onboarding/tests/unit/automation-builder.test.ts:1-50`
- Mocked React Flow components
- Basic component rendering tests
- Drag and drop simulation setup

### Integration Tests  
**File**: `/Users/samschofield/atlas-fitness-onboarding/tests/integration/automation-builder-integration.test.ts`
- End-to-end workflow creation flows
- API endpoint integration testing

### E2E Tests
**File**: `/Users/samschofield/atlas-fitness-onboarding/tests/e2e/automation-builder-critical-fixes.spec.ts`
- Critical user journey testing
- Cross-browser compatibility testing

## Security Considerations

### Data Isolation
- Organization-scoped workflow access via `getCurrentUserOrganization()`
- Supabase RLS policies for multi-tenant data security

### Configuration Security
- No code execution in configuration panels
- JSON schema validation for configuration data
- Sanitization of user inputs in node configurations

## Migration & Versioning

### Schema Versioning
- Workflow version tracking for backwards compatibility
- Migration system in enhanced workflow types
- Template system with version management

### Breaking Changes
- SimpleWorkflowBuilder deprecated in favor of main WorkflowBuilder
- Enhanced type system migration path defined
- Configuration schema evolution support

---

**Next Steps for Fixes**:
1. Implement missing API endpoints (PUT, DELETE)
2. Fix drop handler race conditions  
3. Resolve auto-save conflicts with proper debouncing
4. Improve test execution with real API integration  
5. Add workflow validation and error recovery
6. Implement proper node selection UX patterns