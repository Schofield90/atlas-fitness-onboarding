# Automations Workflow Builder Map - gym-coach-platform
<!-- Updated: 2025-08-31T00:00:00Z -->

## Current Implementation State: NON-EXISTENT

**Critical Finding**: The automations workflow builder functionality **does not currently exist** in the gym-coach-platform codebase, despite having the underlying database schema support.

## Database Infrastructure Analysis

### Existing Workflows Table
[source: lib/supabase/schema.sql:L108-L121]
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('webhook', 'schedule', 'event')),
    trigger_config JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TypeScript Types Available
[source: lib/supabase/database.types.ts:L280-L295, types/database.ts:L13,L21,L29]
- `Workflow` type from Tables<'workflows'>
- `WorkflowInsert` type from Inserts<'workflows'>
- `WorkflowUpdate` type from Updates<'workflows'>
- Trigger types: 'webhook' | 'schedule' | 'event'
- Actions and trigger_config stored as JSONB

## Missing Components Analysis

### 1. UI Components - ALL MISSING
**Required React Flow Implementation:**
- **Main Builder Container** - DOES NOT EXIST
  - Location should be: `/app/automations/page.tsx` or `/app/dashboard/automations/page.tsx`
  - Should contain React Flow wrapper with nodes/edges state
- **Node Palette** - DOES NOT EXIST
  - Drag-and-drop component for available action types
  - Should include: Send Email, SMS, Webhook, Delay, Condition nodes
- **Node Configuration Panel** - DOES NOT EXIST
  - Side panel that opens on node selection
  - Should contain forms for: Subject, Body, Recipients, etc.
- **Node Components** - ALL MISSING
  - Email node component
  - SMS node component  
  - Webhook node component
  - Conditional logic node component
  - Delay/Wait node component

### 2. State Management - NO IMPLEMENTATION
**React Flow State Handling - MISSING:**
- `nodes` state array - Not implemented
- `edges` state array - Not implemented
- `setNodes` function - Not implemented
- `setEdges` function - Not implemented
- `onNodeClick` handler - Not implemented
- `onSelectionChange` handler - Not implemented
- Panel visibility state (isConfigOpen) - Not implemented

### 3. API Routes - ALL MISSING
**Workflow Management API:**
- `GET /api/workflows` - DOES NOT EXIST
- `POST /api/workflows` - DOES NOT EXIST
- `PUT /api/workflows/[id]` - DOES NOT EXIST
- `DELETE /api/workflows/[id]` - DOES NOT EXIST
- `POST /api/workflows/[id]/execute` - DOES NOT EXIST

### 4. Data Flow Architecture - UNDEFINED

**Expected Flow (Not Implemented):**
```
Node Click → onNodeClick(nodeId) → setSelectedNode(nodeId) → 
Panel Opens → Form Changes → Update Node Data → setNodes(updated)
```

**Current State:** None of these handlers or data flow patterns exist.

## Dependencies Analysis

### React Flow - NOT INSTALLED
[source: package.json:L22-L68]
- React Flow library not found in dependencies
- Would need: `@reactflow/core`, `@reactflow/background`, `@reactflow/controls`
- Current dependencies focus on forms, UI components, but no flow builder

### Available UI Components
[source: components/ui/]
- Dialog, Button, Input, Textarea, Select components available
- Could be used for node configuration panels
- Card component available for node styling

## Required Implementation Architecture

### 1. File Structure (All Missing)
```
app/
├── dashboard/
│   └── automations/
│       ├── page.tsx              # Main builder page - MISSING
│       └── components/           # Builder components - MISSING
│           ├── WorkflowBuilder.tsx
│           ├── NodePalette.tsx
│           ├── NodeConfigPanel.tsx
│           ├── nodes/
│           │   ├── EmailNode.tsx
│           │   ├── SmsNode.tsx
│           │   ├── WebhookNode.tsx
│           │   └── DelayNode.tsx
│           └── edges/
│               └── CustomEdge.tsx
├── api/
│   └── workflows/              # API routes - MISSING
│       ├── route.ts
│       └── [id]/
│           └── route.ts
```

### 2. Key Functions Needed

**Node Management:**
```typescript
// All functions missing:
const addNode = (type: string, position: {x: number, y: number}) => void
const updateNode = (nodeId: string, data: any) => void  
const deleteNode = (nodeId: string) => void
const onNodeClick = (event: React.MouseEvent, node: Node) => void
```

**Panel Management:**
```typescript
// All functions missing:
const openConfigPanel = (nodeId: string) => void
const closeConfigPanel = () => void
const updateNodeConfig = (nodeId: string, config: any) => void
```

**Workflow Persistence:**
```typescript
// All functions missing:  
const saveWorkflow = (nodes: Node[], edges: Edge[]) => Promise<void>
const loadWorkflow = (workflowId: string) => Promise<{nodes: Node[], edges: Edge[]}>
```

## Current Issues & Blockers

### 1. Missing Infrastructure
- **No React Flow dependency** - Cannot build visual workflow builder
- **No automation page route** - Users cannot access builder
- **No API endpoints** - Cannot save/load workflows
- **No node type definitions** - Cannot create typed nodes

### 2. State Management Gaps
- **No centralized state** - No Zustand store or context for workflow state
- **No selection handling** - Cannot track which node is selected
- **No data persistence layer** - Cannot save workflow progress

### 3. Node Configuration Issues
- **No panel state management** - Cannot track panel open/closed
- **No form validation** - Cannot validate node configuration
- **No dynamic forms** - Cannot render different forms per node type

## Recommended Implementation Plan

### Phase 1: Foundation Setup
1. Install React Flow dependencies
2. Create base automations page at `/app/dashboard/automations/page.tsx`
3. Implement basic workflow API routes
4. Set up workflow state management (Zustand or Context)

### Phase 2: Core Builder
1. Implement WorkflowBuilder component with React Flow
2. Create node palette with drag-and-drop
3. Build node configuration panel with dynamic forms
4. Add basic node types (Email, SMS, Webhook)

### Phase 3: Advanced Features  
1. Add conditional logic nodes
2. Implement workflow execution engine
3. Add workflow templates and presets
4. Build workflow testing and preview

## Technical Recommendations

### State Architecture
```typescript
interface WorkflowState {
  nodes: Node[]
  edges: Edge[]  
  selectedNodeId: string | null
  isPanelOpen: boolean
  currentWorkflow: Workflow | null
}
```

### Node Data Structure
```typescript
interface NodeData {
  type: 'email' | 'sms' | 'webhook' | 'delay' | 'condition'
  config: {
    // Email node
    subject?: string
    body?: string
    recipients?: string[]
    // SMS node  
    message?: string
    phoneNumbers?: string[]
    // Webhook node
    url?: string
    method?: 'GET' | 'POST' | 'PUT'
    headers?: Record<string, string>
    // Condition node
    condition?: string
    operator?: 'equals' | 'contains' | 'greater_than'
  }
}
```

## Navigation Integration

The sidebar navigation should include:
```typescript
// Add to components/layout/sidebar.tsx
{ name: 'Automations', href: '/dashboard/automations', icon: Workflow },
```

## Priority Issues to Address

1. **CRITICAL**: No visual workflow builder exists despite database schema
2. **HIGH**: Missing React Flow dependency blocks all builder functionality  
3. **HIGH**: No API routes prevent workflow persistence
4. **MEDIUM**: No navigation link to automation features
5. **LOW**: No workflow execution engine for testing flows

---
**Status**: Ready for implementation - Database schema exists, but all UI and API components missing
**Dependencies**: React Flow, additional API routes, workflow execution engine  
**Estimated Effort**: Large (4-6 weeks for full implementation)