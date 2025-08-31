# Automations Node Settings Panel - Root Cause Analysis

[AGENT:mapper]
GOAL: Pinpoint exactly why the panel errors/becomes inert when editing nodes

## Files Analyzed
- `/app/components/automation/WorkflowBuilder.tsx` - Main builder component
- `/app/components/automation/config/DynamicConfigPanelEnhanced.tsx` - Configuration panel
- `/app/components/automation/nodes/*` - Node type components

## Root Causes Identified

### 1. Missing useEffect for Node Prop Changes ⚠️ CRITICAL
**Location**: `DynamicConfigPanelEnhanced.tsx` line 650
**Issue**: The config state is initialized only once with `useState(node.data?.config || {})`
**Problem**: When a different node is clicked, the component doesn't update its internal state
**Code**:
```tsx
// Current (BROKEN):
const [config, setConfig] = useState(node.data?.config || {})
// Missing: useEffect to sync when node changes
```

### 2. Node Data Not Properly Initialized
**Location**: `WorkflowBuilder.tsx` lines 386-398
**Issue**: New nodes created with minimal data structure
**Problem**: `node.data.config` may be undefined, causing panel to error
**Code**:
```tsx
const newNode: WorkflowNode = {
  id: nodeId,
  type: item.type,
  position,
  data: {
    label: item.name,
    icon: item.icon,
    actionType: item.actionType,
    config: {}, // Empty but exists
    description: item.description,
    isValid: item.type === 'trigger',
  },
}
```

### 3. Controlled Input Issues
**Location**: `DynamicConfigPanelEnhanced.tsx` lines 955-1036
**Issue**: Inputs are controlled but may receive undefined values
**Problem**: `config[field.key] || ''` can still be undefined if config itself is undefined
**Affected Inputs**:
- Text inputs (line 1012)
- Textareas (line 1022)
- Select dropdowns (line 973)
- Checkboxes (line 1035)

### 4. Node Selection State Management
**Location**: `WorkflowBuilder.tsx` lines 513-549
**Issue**: Complex state updates in onNodeClick
**Problem**: Setting both selectedNode and configNode separately can cause race conditions
**Code**:
```tsx
setSelectedNode(node.id)
setConfigNode(node as WorkflowNode)  // Different state updates
setShowConfigPanel(true)
```

### 5. Missing Error Boundaries
**Location**: Throughout the config panel
**Issue**: No error boundary to catch render errors
**Problem**: Any error in the panel crashes the entire builder

## Stack Traces
When clicking a node after another node was already selected:
```
TypeError: Cannot read properties of undefined (reading 'config')
  at DynamicConfigPanelEnhanced (DynamicConfigPanelEnhanced.tsx:650)
```

## Impact Analysis
- **Severity**: HIGH - Core functionality broken
- **User Impact**: Cannot configure automation nodes
- **Frequency**: Every time switching between nodes
- **Regression**: Yes - worked before recent changes

## Required Fixes
1. Add useEffect to sync config state when node prop changes
2. Ensure node.data.config is always initialized
3. Add defensive checks for all controlled inputs
4. Implement error boundary around config panel
5. Validate node data structure on selection

ARTIFACTS: docs/automations-settings-rca.md
JAM: Issue reproduced - panel becomes inert when switching nodes
BLOCKERS: None - root causes identified