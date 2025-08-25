# Automation Builder Inventory

## Current State Analysis

### 🔴 CRITICAL ISSUE: Two Separate Builders
We have TWO completely different builder implementations causing confusion:

1. **Light Builder** (EnhancedWorkflowBuilder)
   - Route: `/automations/builder` (no ID)
   - Component: `EnhancedWorkflowBuilderWrapper`
   - Location: `/app/components/automation/EnhancedWorkflowBuilder.tsx`
   - Theme: Light mode with white background
   - Status: Partially functional

2. **Dark Builder** (DynamicWorkflowBuilder)
   - Route: `/automations/builder/[id]` (with ID)
   - Component: `DynamicWorkflowBuilder`
   - Location: `/app/components/automation/DynamicWorkflowBuilder.tsx`
   - Theme: Dark mode with gray background
   - Status: More feature-complete but broken

## File Inventory

### Page Routes
```
/app/automations/builder/page.tsx          -> Uses EnhancedWorkflowBuilderWrapper (light)
/app/automations/builder/[id]/page.tsx     -> Uses DynamicWorkflowBuilder (dark)
```

### Core Builder Components
```
/app/components/automation/
├── EnhancedWorkflowBuilder.tsx           # Light builder (955 lines)
├── EnhancedWorkflowBuilderV2.tsx         # Another version! (739 lines)
├── DynamicWorkflowBuilder.tsx            # Dark builder (simplified wrapper)
├── ResponsiveWorkflowBuilder.tsx         # Wrapper using V2
├── WorkflowBuilder.tsx                   # Original builder (728 lines)
├── AdvancedWorkflowBuilder.tsx           # Yet another builder (259 lines)
└── SimpleWorkflowBuilder.tsx             # Minimal version (146 lines)
```

### Shared Components (27 files total)
```
/app/components/automation/
├── NodePalette.tsx                       # Drag source for nodes
├── NodeConfigPanel.tsx                   # Basic config panel
├── WorkflowValidator.tsx                 # Validation logic
├── WorkflowTester.tsx                    # Test execution
├── VariableEditor.tsx                    # Variable management
├── ConditionEditor.tsx                   # Condition builder
├── ExecutionVisualization.tsx            # Execution display
└── AutomationAIChat.tsx                  # AI assistant
```

### Node Components
```
/app/components/automation/nodes/
├── TriggerNode.tsx                       # Basic trigger
├── ActionNode.tsx                        # Basic action
├── ConditionNode.tsx                     # Basic condition
├── WaitNode.tsx                          # Delay node
├── LoopNode.tsx                          # Loop control
├── EnhancedNodes.tsx                     # Enhanced versions
├── AdvancedTriggerNode.tsx               # Advanced trigger
├── AdvancedActionNode.tsx                # Advanced action
└── AdvancedConditionNode.tsx             # Advanced condition
```

### Configuration Panels
```
/app/components/automation/config/
├── DynamicConfigPanel.tsx                # Main config dispatcher
├── UnifiedNodeConfigPanel.tsx            # Unified config
├── LeadTriggerConfig.tsx                 # Lead trigger config
├── EmailActionConfig.tsx                 # Email action config
├── SMSActionConfig.tsx                   # SMS action config
├── BookingTriggerConfig.tsx              # Booking trigger
└── [20+ more specific configs]
```

## State Management

### React Flow
- Both builders use React Flow for visualization
- Version: "^11.10.0" (from package.json)
- Custom node types registered differently in each builder

### Local State
- Light builder: Uses React state + useCallback
- Dark builder: Uses simplified state management
- No centralized store (no zustand/redux)

## API Endpoints

### Workflow Management
```
POST   /api/automations/workflows          # Create workflow
GET    /api/automations/workflows          # List workflows
GET    /api/automations/workflows/[id]     # Get workflow
PUT    /api/automations/workflows/[id]     # Update workflow
DELETE /api/automations/workflows/[id]     # Delete workflow
POST   /api/automations/workflows/[id]/test # Test workflow
```

## Navigation Flow

### Current User Journey
1. User clicks "Create Workflow" → Goes to `/automations/builder` (light)
2. User clicks existing workflow → Goes to `/automations/builder/[id]` (dark)
3. **CONFUSION**: Different UIs for create vs edit!

### Routes That Link to Builders
- `/automations/page.tsx` - Main automation list
- `/automations/templates/page.tsx` - Template selection
- `/settings/workflows/page.tsx` - Settings page
- `/auth-check/page.tsx` - Auth redirect
- `/automations-simple/page.tsx` - Simple mode

## Problems Identified

### 1. Multiple Builder Implementations
- **7 different builder components** found!
- Each with different features and UI
- No clear hierarchy or purpose

### 2. Inconsistent Routing
- New workflows: `/automations/builder`
- Edit workflows: `/automations/builder/[id]`
- Different components for each!

### 3. Duplicate Node Types
- Basic nodes (TriggerNode, ActionNode)
- Enhanced nodes (EnhancedTriggerNode, etc.)
- Advanced nodes (AdvancedTriggerNode, etc.)
- No clear which to use when

### 4. Configuration Chaos
- DynamicConfigPanel.tsx (619 lines!)
- UnifiedNodeConfigPanel.tsx (another approach)
- DeepNodeConfigPanel.tsx (yet another)
- Individual configs for each trigger/action type

## Recommendation for Phase 1

### Immediate Actions
1. **Redirect all routes to dark builder**
   - Update `/automations/builder/page.tsx` to redirect to `/automations/builder/new`
   - Ensure consistent experience

2. **Use DynamicWorkflowBuilder as single source**
   - It's simpler and already handles both create/edit
   - Fix its issues rather than maintain multiple

3. **Archive unused builders**
   - Move to `/deprecated/` folder
   - Keep for reference but remove from active codebase

### Files to Modify in Phase 1
1. `/app/automations/builder/page.tsx` - Redirect to dark
2. `/app/automations/page.tsx` - Update create button link
3. `/app/automations/templates/page.tsx` - Update template links
4. All other files linking to `/automations/builder`

## Success Metrics
- [ ] Single builder UI for all operations
- [ ] Consistent dark theme throughout
- [ ] No more user confusion about different UIs
- [ ] Simplified codebase with clear component hierarchy