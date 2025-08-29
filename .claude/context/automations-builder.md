# Automations Builder - Component Map

*Last updated: 2025-08-29T00:00:00Z*

## Core Builder Components

### Entry Points & Routing
- **Main Builder Route**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/page.tsx`
  - Redirects to `/automations/builder/new` for creating new workflows
  - [source: app/automations/builder/page.tsx:L6-L19]

- **Edit Workflow Route**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/[id]/page.tsx`
  - Handles both creating (`id=new`) and editing existing workflows
  - Loads workflow data from API and passes to DynamicWorkflowBuilder
  - [source: app/automations/builder/[id]/page.tsx:L186-L194]

### React Flow Integration
- **Dynamic Wrapper**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/DynamicWorkflowBuilder.tsx`
  - Client-side only loading with Suspense
  - Consolidates to use main WorkflowBuilder (SimpleWorkflowBuilder deprecated)
  - [source: app/components/automation/DynamicWorkflowBuilder.tsx:L25-L32]

- **Main React Flow Component**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx`
  - Full React Flow implementation with drag-and-drop
  - Uses HTML5Backend for DnD
  - Includes ReactFlow provider, controls, minimap, and background
  - [source: app/components/automation/WorkflowBuilder.tsx:L4-L25]

### Node System
- **Node Palette**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/NodePalette.tsx`
  - Categorized node templates (Triggers, Actions, Logic, etc.)
  - Search functionality and collapsible categories
  - Drag-and-drop source for new nodes
  - [source: app/components/automation/NodePalette.tsx:L1-L50]

- **Configuration Panel**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/NodeConfigPanel.tsx`
  - Modal/drawer for configuring node properties
  - Dynamic form fields based on node action type
  - [source: app/components/automation/NodeConfigPanel.tsx:L7-L31]

### Node Components (Individual Types)
- **Base Nodes**:
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/TriggerNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/ActionNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/ConditionNode.tsx`

- **Advanced Nodes**:
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/AdvancedTriggerNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/AdvancedActionNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/AdvancedConditionNode.tsx`

- **Logic Nodes**:
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/FilterNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/LoopNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/ParallelNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/MergeNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/DelayNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/WaitNode.tsx`
  - `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/nodes/TransformNode.tsx`

### Configuration Components
**Trigger Configs**:
- Lead Triggers: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/LeadTriggerConfig.tsx`
- Booking Triggers: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/BookingTriggerConfig.tsx`
- Contact Triggers: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/ContactTagTriggerConfig.tsx`
- Form Triggers: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/FormSubmittedTriggerConfig.tsx`

**Action Configs**:
- Email Actions: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/EmailActionConfig.tsx`
- SMS Actions: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/SMSActionConfig.tsx`
- WhatsApp Actions: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/WhatsAppConfig.tsx`
- Internal Messages: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/InternalMessageConfig.tsx`

**Unified Config**:
- `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/UnifiedNodeConfigPanel.tsx`
- `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/DynamicConfigPanel.tsx`

### State Management
- **No Dedicated Store**: Workflow state managed via React hooks in WorkflowBuilder component
- Uses React Flow's `useNodesState` and `useEdgesState`
- Workflow persistence handled through API calls
- Local state for config panels and UI interactions

### Testing Components
- **Test Runner**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowTester.tsx`
- **Validation**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowValidator.tsx`
- **Execution Visualization**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/ExecutionVisualization.tsx`

### Template System
- **Templates Page**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/templates/page.tsx`
- **Template Components**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/templates/WorkflowTemplates.tsx`
- **Enhanced Templates**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/templates/EnhancedWorkflowTemplates.tsx`

### Additional Features
- **Variable Editor**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/VariableEditor.tsx`
- **AI Integration**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/AutomationAIChat.tsx`
- **AI Toggle**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/AIToggleControl.tsx`
- **Condition Builder**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/ConditionEditor.tsx`

### Unit Tests
- **Main Test Suite**: `/Users/samschofield/atlas-fitness-onboarding/tests/unit/automation-builder.test.ts`
- **Component Tests**: Multiple files in `/Users/samschofield/atlas-fitness-onboarding/tests/unit/automations/`
- **E2E Tests**: `/Users/samschofield/atlas-fitness-onboarding/tests/e2e/automation-builder-critical-fixes.spec.ts`

## Component Hierarchy
```
DashboardLayout
└── DynamicWorkflowBuilder (Client-side wrapper)
    └── WorkflowBuilder (Main React Flow component)
        ├── ReactFlowProvider
        ├── NodePalette (Draggable node templates)
        ├── NodeConfigPanel (Configuration modal/drawer)
        ├── WorkflowValidator
        ├── ExecutionVisualization
        └── Various Node Components
```

## Key Dependencies
- **React Flow**: Primary flow chart library
- **React DnD**: Drag and drop functionality (HTML5Backend)
- **UUID**: Node ID generation
- **Lucide React**: Icons throughout the interface

*[CONTEXT-MANAGER: All paths verified as of 2025-08-29]*