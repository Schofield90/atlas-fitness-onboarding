# Automations Builder Defects Inventory

## 1. Config Panel Input Value/onChange Issues

### DynamicConfigPanel.tsx - Lines 620-736
**Location**: `/app/components/automation/config/DynamicConfigPanel.tsx`

#### Primary Issues:
- **Lines 721-725**: `handleFieldChange` function uses stale closure for `onChange` callback
- **Lines 638-641**: Config state validation doesn't check for empty string vs undefined differences
- **Lines 752-760**: Text input `value` prop receives stale config data on render
- **Lines 796-813**: Select dropdown doesn't handle empty value state properly

#### Specific Defective Functions:
```typescript
// Lines 718-726 - DEFECTIVE: Stale closure issue
const handleFieldChange = (key: string, value: any) => {
  const updatedConfig = { ...config, [key]: value }
  setConfig(updatedConfig)
  // FIXED: Use updated config instead of stale closure
  if (onChange) {
    onChange(updatedConfig)  // ← This uses stale config from closure
  }
}
```

#### Props Receiving Issues:
- **Node Name Input** (line 752): Receives `value={value}` from potentially stale config
- **Description Input** (line 767): Same stale value issue
- **Action Type Dropdown** (line 798): Doesn't preserve selection on re-renders
- **Subject/Body Fields**: Custom email fields reset when switching modes

#### Missing readOnly/disabled Props:
- No `readOnly` prop support in form schema (line 18)
- No `disabled` state handling for dependent fields
- Missing validation state indicators for required fields

## 2. React Flow Canvas Issues

### WorkflowBuilder.tsx - Lines 1013-1082
**Location**: `/app/components/automation/WorkflowBuilder.tsx`

#### Canvas Configuration Defects:
- **Line 1024**: `panOnDrag={true}` - Hardcoded, no dynamic control
- **Missing**: `zoomOnScroll`, `minZoom`, `maxZoom` props entirely absent
- **Missing**: `proOptions` for removing attribution
- **Missing**: `nodesDraggable` control
- **Missing**: `snapToGrid` functionality

#### Container CSS Issues:
- **Lines 1009-1012**: Canvas container has no explicit height constraints
- **Line 1010**: `flex-1 relative` may conflict with parent layout
- Parent `DashboardLayout` may override ReactFlow canvas dimensions

#### Current Props Audit:
```typescript
// Lines 1013-1033 - INCOMPLETE PROPS
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  isValidConnection={isValidConnection}
  onInit={setReactFlowInstance}
  onNodeClick={onNodeClick}
  nodeTypes={nodeTypes}
  fitView                    // ✓ Present
  panOnDrag={true}          // ✓ Present (hardcoded)
  // ❌ MISSING: zoomOnScroll
  // ❌ MISSING: minZoom, maxZoom
  // ❌ MISSING: proOptions
  // ❌ MISSING: nodesDraggable
  // ❌ MISSING: snapToGrid
>
```

## 3. Add Node Drag-Drop Handler

### WorkflowBuilder.tsx - Lines 314-401
**Location**: `/app/components/automation/WorkflowBuilder.tsx`

#### Node ID Generation Issues:
- **Lines 361-364**: UUID generation with collision check may still fail under rapid drops
- **Line 383**: Functional state update with `concat()` instead of spread operator
- **Lines 387-388**: Console logging in production code

#### Drop Position Calculation Defects:
- **Lines 323-358**: Complex minimap avoidance logic may miscalculate positions
- **Lines 343-346**: Hardcoded minimap dimensions (200x150) may not match actual minimap
- **Lines 355-358**: Fallback position calculation doesn't use ReactFlow projection

#### Node Append vs Overwrite:
```typescript
// Lines 383-389 - POTENTIAL ISSUE
setNodes((currentNodes) => {
  console.log('Current nodes before adding:', currentNodes.length, currentNodes.map(n => n.id))
  // Ensure we're working with the latest state and properly append the node
  const updatedNodes = currentNodes.concat(newNode)  // ✓ Append (correct)
  console.log('Updated nodes array:', updatedNodes.length, updatedNodes.map(n => n.id))
  return updatedNodes
})
```

## 4. Minimap Navigation Issues

### WorkflowBuilder.tsx - Lines 1035-1048
**Location**: `/app/components/automation/WorkflowBuilder.tsx`

#### Attribution/Anchor Handler:
- **Lines 1035-1048**: MiniMap component lacks `onClick` handler override
- **No custom attribution removal** - still shows ReactFlow attribution
- **Line 1045**: `maskColor="transparent"` may cause visual confusion

#### Missing Props:
```typescript
// Lines 1035-1048 - INCOMPLETE MINIMAP
<MiniMap 
  nodeColor={(node) => { /* color logic */ }}
  className="bg-gray-800"
  maskColor="transparent"
  // ❌ MISSING: onClick handler to prevent navigation
  // ❌ MISSING: pannable={false}
  // ❌ MISSING: zoomable={false}
/>
```

## 5. Run Test Pre-run Logic & Validation

### WorkflowBuilder.tsx - Lines 612-676
**Location**: `/app/components/automation/WorkflowBuilder.tsx`

#### Validation Logic Defects:
- **Lines 619-627**: Basic trigger/action count validation only
- **Lines 630-667**: Action-specific validation has hardcoded field names
- **Lines 641-647**: Email validation checks for `config.mode` but field may be undefined

#### Required Fields Per Action Type:
```typescript
// Lines 640-667 - HARDCODED VALIDATION
switch (actionType) {
  case 'send_email':
    if (config.mode === 'custom') {
      if (!config.subject?.trim()) invalidNodes.push(`${node.data?.label || node.id}: Email subject is required`)
      if (!config.body?.trim()) invalidNodes.push(`${node.data?.label || node.id}: Email body is required`)
    } else if (config.mode === 'template' && !config.templateId) {
      invalidNodes.push(`${node.data?.label || node.id}: Email template must be selected`)
    }
    break
    // More hardcoded cases...
}
```

#### Missing Validation Areas:
- No connection path validation (orphaned nodes)
- No circular dependency detection in validation phase
- No variable reference validation

## 6. Save/Publish API Status

### API Endpoints Analysis:
**Location**: `/app/api/automations/workflows/`

#### Present APIs:
- **GET /api/automations/workflows** - ✓ Exists (route.ts:5-30)
- **POST /api/automations/workflows** - ✓ Exists (route.ts:32-72)
- **GET /api/automations/workflows/[id]** - ✓ Exists ([id]/route.ts:5-35)
- **PUT /api/automations/workflows/[id]** - ✓ Exists ([id]/route.ts:37-84)
- **DELETE /api/automations/workflows/[id]** - ✓ Exists ([id]/route.ts:86-116)

#### Missing Publish Functionality:
- **No separate publish endpoint** for workflow activation
- **No versioning system** for published vs draft workflows
- **No workflow validation endpoint** before publish

## 7. Templates Page Alert Sources

### WorkflowTemplatesPage - Lines 176-180
**Location**: `/app/automations/templates/page.tsx`

#### Alert Sources Identified:
- **Line 178**: `alert()` call in `handleUseTemplate` function
- **Line 308**: `alert()` call in Preview button onClick
- **Line 341**: `alert()` call in Request Custom Template button

#### Alert Content:
```typescript
// Line 178 - Template Usage Alert
alert(`Creating workflow from template: ${template.name}\n\nThis will open the workflow builder with pre-configured nodes and settings.`)

// Line 308 - Preview Alert  
alert(`Template Preview: ${template.name}\n\nThis would show a detailed preview of the workflow structure, nodes, and configuration options.`)

// Line 341 - Custom Template Request Alert
alert('🤝 Custom Template Request\n\nOur team can help create custom templates for your specific needs.\n\nContact: support@atlasfitness.com')
```

## Critical Dependencies & Architecture Issues

### Missing CSS Collisions:
- ReactFlow styles imported globally (globals.css:2) but may conflict with Tailwind
- DashboardLayout wrapper may constrain ReactFlow canvas dimensions
- Dark theme conflicts between ReactFlow default styles and custom theme

### State Management Issues:
- Config panel state not persisted between panel open/close
- Node selection state conflicts with configuration panel state
- Auto-save timer may cause race conditions with manual save

### Performance Bottlenecks:
- Console.log statements in production builds
- Excessive re-renders due to stale closure dependencies
- Large node palette re-rendered on every search term change