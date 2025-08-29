# Automation Builder - Developer Documentation

**Atlas Fitness CRM - Technical Implementation Guide**  
**Version:** 1.3.3+ (8 Critical Fixes Applied)  
**Last Updated:** August 29, 2025

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Critical Fixes Implementation](#critical-fixes-implementation)
4. [State Management Patterns](#state-management-patterns)
5. [Adding New Node Types](#adding-new-node-types)
6. [Testing Approaches](#testing-approaches)
7. [Performance Optimizations](#performance-optimizations)
8. [Security Considerations](#security-considerations)

## Architecture Overview

The automation builder is built using React Flow with a custom node and configuration system. The architecture follows a modular pattern with clear separation of concerns.

### Core Technologies

- **React Flow**: Visual workflow canvas and node management
- **TypeScript**: Type-safe development with comprehensive interfaces
- **React DnD**: Drag-and-drop functionality for node palette
- **Tailwind CSS**: Utility-first styling system
- **Nanoid/UUID**: Unique identifier generation for nodes
- **Zustand**: Lightweight state management (future implementation)

### System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   WorkflowBuilder   │◄──►│  ConfigurationPanel │◄──►│   NodePalette      │
│   (Main Container)  │    │  (Dynamic Forms)    │    │   (Drag Source)     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   React Flow        │    │   Validation        │    │   Node Factory      │
│   Canvas & Nodes    │    │   System            │    │   (Type Creation)   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Component Structure

### Primary Components

#### `/app/components/automation/WorkflowBuilder.tsx`
**Purpose:** Main workflow builder component with consolidated functionality

**Key Features:**
- React Flow integration with custom node types
- Drag-and-drop node palette
- Auto-save functionality with conflict resolution
- Canvas controls (pan, zoom, minimap)
- Node configuration management

**Critical Fixes Applied:**
- Fixed stale closure bugs in configuration handling
- Enhanced unique ID generation for nodes
- Improved canvas controls and minimap safety
- Auto-focus functionality for new nodes

#### `/app/components/automation/config/DynamicConfigPanel.tsx`
**Purpose:** Dynamic configuration forms for all node types

**Key Features:**
- Type-based form field generation
- Real-time validation with error display
- Variable syntax support and validation
- Sticky footer positioning for buttons
- Auto-save with debouncing

**Critical Fixes Applied:**
- Fixed single-character input bug through proper state management
- Enhanced datetime-local input support
- Improved variable syntax handling for different channels
- Fixed save button visibility during modal scrolling

### Node Components

All custom nodes are located in `/app/components/automation/nodes/`:

```typescript
// Node Type Mapping
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

## Critical Fixes Implementation

### Fix 1: Single-Character Input Bug

**Problem:** React closure bug preventing form inputs from accepting single characters

**Solution Implementation:**
```typescript
// Before (Problematic)
const [config, setConfig] = useState(initialConfig)
const handleInputChange = (field: string, value: any) => {
  setConfig(prev => ({ ...prev, [field]: value })) // Stale closure issue
}

// After (Fixed)
const [config, setConfig] = useState(initialConfig)
const handleInputChange = useCallback((field: string, value: any) => {
  setConfig(prev => ({
    ...prev,
    [field]: value
  }))
}, []) // Proper dependency array

// Enhanced with controlled inputs
const handleControlledInput = useCallback((field: string) => (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const value = event.target.value
  setConfig(prev => ({
    ...prev,
    [field]: value
  }))
}, [])
```

**Key Changes:**
- Added `useCallback` hooks with proper dependency arrays
- Implemented controlled input components
- Fixed state synchronization issues
- Added input validation and error handling

### Fix 2: Node Label Updates

**Problem:** Canvas node labels not updating after configuration changes

**Solution Implementation:**
```typescript
const handleNodeConfigSave = useCallback((nodeId: string, config: any) => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            config,
            // Real-time label update from config
            label: config.label || node.data.label,
            isValid: validateNodeConfig(config),
          },
        }
      }
      return node
    })
  )
  
  // Trigger canvas re-render
  if (onChange) {
    onChange(config)
  }
}, [setNodes, onChange])
```

**Key Changes:**
- Immediate label synchronization on config save
- Added validation state updates
- Implemented proper React Flow state updates
- Enhanced visual feedback for configuration changes

### Fix 3: DateTime Scheduling Support

**Problem:** Lack of proper datetime-local input support for scheduling

**Solution Implementation:**
```typescript
// Enhanced field type support
interface FormField {
  type: 'text' | 'textarea' | 'select' | 'datetime-local' | 'email' // Added datetime-local
  validation?: {
    min?: string // ISO date string for datetime-local
    max?: string
    required?: boolean
  }
}

// Field rendering with datetime support
const renderField = (field: FormField, value: any, onChange: (val: any) => void) => {
  switch (field.type) {
    case 'datetime-local':
      return (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
          min={field.validation?.min}
          max={field.validation?.max}
          className="w-full px-3 py-2 border rounded-md"
          required={field.required}
        />
      )
    // ... other field types
  }
}
```

**Key Changes:**
- Added HTML5 datetime-local input support
- Implemented proper date/time validation
- Added timezone handling for scheduling
- Enhanced field type system

### Fix 4: Variable Syntax Support

**Problem:** Limited variable support with inconsistent syntax across channels

**Solution Implementation:**
```typescript
// Variable syntax definitions
const VARIABLE_PATTERNS = {
  whatsapp: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, // {{variable}}
  sms: /\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g,         // [variable]
  email: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,   // {{variable}}
}

// Variable validation with channel-specific syntax
const validateVariables = (text: string, channel: 'whatsapp' | 'sms' | 'email'): boolean => {
  const pattern = VARIABLE_PATTERNS[channel]
  const matches = text.match(pattern)
  
  if (!matches) return true
  
  return matches.every(match => {
    const variable = match.replace(/[\{\[\}\]]/g, '')
    return AVAILABLE_VARIABLES.includes(variable)
  })
}

// Enhanced variable input with syntax highlighting
const VariableInput = ({ value, onChange, channel, placeholder }: {
  value: string
  onChange: (value: string) => void
  channel: 'whatsapp' | 'sms' | 'email'
  placeholder?: string
}) => {
  const [isValid, setIsValid] = useState(true)
  
  const handleChange = useCallback((newValue: string) => {
    const valid = validateVariables(newValue, channel)
    setIsValid(valid)
    onChange(newValue)
  }, [channel, onChange])
  
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 border rounded-md",
          isValid ? "border-gray-300" : "border-red-500"
        )}
      />
      {!isValid && (
        <p className="text-sm text-red-600">
          Invalid variables detected. Use {
            channel === 'sms' ? '[variable]' : '{{variable}}'
          } syntax.
        </p>
      )}
      <VariableSuggestions channel={channel} onInsert={handleChange} />
    </div>
  )
}
```

**Key Changes:**
- Implemented channel-specific variable syntax
- Added real-time validation with visual feedback
- Created variable suggestion system
- Enhanced syntax highlighting

### Fix 5: Modal Save Button Visibility

**Problem:** Save buttons becoming inaccessible during modal scrolling

**Solution Implementation:**
```typescript
// Sticky footer with proper z-index
const ConfigurationModal = ({ children, onSave, onClose }: {
  children: React.ReactNode
  onSave: () => void
  onClose: () => void
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold">Configure Node</h2>
        </div>
        
        {/* Scrollable Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {children}
        </div>
        
        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 sticky bottom-0 bg-white z-10">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Key Changes:**
- Implemented sticky footer positioning
- Added proper z-index layering
- Enhanced modal structure with flex layout
- Fixed scrolling behavior with overflow controls

### Fix 6: Full-Row Node Dragging

**Problem:** Nodes could only be dragged from specific small areas

**Solution Implementation:**
```typescript
// Enhanced drag implementation for full-card dragging
const PaletteItem = ({ item }: { item: NodePaletteItem }) => {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'node',
    item: { 
      type: item.type,
      actionType: item.actionType,
      name: item.name,
      category: item.category
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Apply drag to entire card
  return (
    <div
      ref={drag as any}
      className={cn(
        "p-3 bg-gray-700 rounded-lg transition-all cursor-move", // cursor-move for full card
        "hover:bg-gray-600 hover:scale-105", // Enhanced hover feedback
        isDragging && "opacity-50 scale-95" // Dragging state
      )}
      style={{ touchAction: 'none' }} // Prevent touch scrolling
    >
      <div className="flex items-start space-x-3 pointer-events-none"> {/* Prevent child interference */}
        <Icon className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  )
}
```

**Key Changes:**
- Applied drag functionality to entire card element
- Added cursor-move styling across full component
- Enhanced visual feedback with hover states
- Prevented child element interference with pointer-events

### Fix 7: Auto-Focus New Nodes

**Problem:** Newly dropped nodes not automatically centered in canvas view

**Solution Implementation:**
```typescript
// Enhanced drop handler with auto-focus
const onDrop = useCallback((event: React.DragEvent) => {
  event.preventDefault()
  
  const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
  if (!reactFlowBounds) return

  const type = event.dataTransfer.getData('application/reactflow')
  if (!type) return

  const position = reactFlowInstance?.project({
    x: event.clientX - reactFlowBounds.left,
    y: event.clientY - reactFlowBounds.top,
  })

  // Create new node with unique ID
  const newNode = createNode(type, position)
  
  // Add node to workflow
  setNodes((nds) => nds.concat(newNode))
  
  // Auto-focus with smooth animation
  if (reactFlowInstance) {
    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: [{ id: newNode.id }], // Focus on new node only
        duration: 800, // Smooth animation duration
        padding: 0.3, // Padding around focused node
        includeHiddenNodes: false,
        minZoom: 0.5,
        maxZoom: 1.5
      })
    }, 100) // Small delay to ensure node is rendered
  }
}, [reactFlowInstance, setNodes])
```

**Key Changes:**
- Implemented ReactFlow fitView integration
- Added smooth animation with customizable duration
- Enhanced viewport calculations with padding
- Added timeout for proper node rendering

### Fix 8: Facebook "All Forms" Option

**Problem:** Facebook integration not properly handling "All Forms" selection

**Solution Implementation:**
```typescript
// Enhanced Facebook integration configuration
const FacebookLeadFormConfig = ({ config, onChange }: {
  config: any
  onChange: (config: any) => void
}) => {
  const [forms, setForms] = useState<FacebookForm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFacebookForms = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/integrations/facebook/forms')
        const data = await response.json()
        
        // Add "All Forms" option at the beginning
        const formsWithAll = [
          { id: 'all', name: 'All Forms', page_id: 'all' },
          ...data.forms
        ]
        
        setForms(formsWithAll)
      } catch (error) {
        console.error('Failed to fetch Facebook forms:', error)
        setForms([{ id: 'all', name: 'All Forms', page_id: 'all' }])
      } finally {
        setLoading(false)
      }
    }

    fetchFacebookForms()
  }, [])

  const handleFormSelection = useCallback((formId: string) => {
    const selectedForm = forms.find(f => f.id === formId)
    
    onChange({
      ...config,
      form_id: formId,
      form_name: selectedForm?.name || 'Unknown Form',
      triggers_all_forms: formId === 'all' // Special handling for "All Forms"
    })
  }, [config, onChange, forms])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Lead Form
        </label>
        <select
          value={config.form_id || 'all'}
          onChange={(e) => handleFormSelection(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={loading}
        >
          {loading ? (
            <option>Loading forms...</option>
          ) : (
            forms.map(form => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))
          )}
        </select>
      </div>
      
      {config.triggers_all_forms && (
        <div className="p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            This trigger will activate for any Facebook lead form submission 
            from your connected pages.
          </p>
        </div>
      )}
    </div>
  )
}
```

**Key Changes:**
- Added "All Forms" option to Facebook form dropdown
- Implemented proper form fetching with error handling
- Added special handling for "All Forms" selection
- Enhanced UI feedback for form selection state

## State Management Patterns

### React Flow State Management

```typescript
// Proper node and edge state management
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

// Configuration state with proper closure handling
const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
const [configPanelOpen, setConfigPanelOpen] = useState(false)

// Auto-save state management
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [lastSaved, setLastSaved] = useState<Date | null>(null)
const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
```

### Configuration State Pattern

```typescript
// Proper configuration state management
const useNodeConfiguration = (node: WorkflowNode) => {
  const [config, setConfig] = useState(node.data.config || {})
  const [isDirty, setIsDirty] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // Controlled update function
  const updateConfig = useCallback((field: string, value: any) => {
    setConfig(prev => {
      const updated = { ...prev, [field]: value }
      setIsDirty(true)
      
      // Real-time validation
      const errors = validateNodeConfig(updated)
      setValidationErrors(errors)
      
      return updated
    })
  }, [])

  // Save function with error handling
  const saveConfig = useCallback(async () => {
    if (validationErrors.length > 0) {
      throw new Error('Configuration has validation errors')
    }

    try {
      await onSave(node.id, config)
      setIsDirty(false)
      return true
    } catch (error) {
      console.error('Failed to save configuration:', error)
      return false
    }
  }, [node.id, config, validationErrors, onSave])

  return {
    config,
    updateConfig,
    saveConfig,
    isDirty,
    validationErrors,
    isValid: validationErrors.length === 0
  }
}
```

## Adding New Node Types

### 1. Define Node Type Interface

```typescript
// Add to /app/lib/types/automation.ts
export interface CustomActionNode extends WorkflowNode {
  type: 'action'
  data: {
    actionType: 'custom_action'
    config: {
      customField: string
      customOptions: string[]
      // ... other configuration fields
    }
  }
}
```

### 2. Create Node Component

```typescript
// Create /app/components/automation/nodes/CustomActionNode.tsx
import React from 'react'
import { Handle, Position } from 'reactflow'

const CustomActionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500">
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label || 'Custom Action'}</div>
          <div className="text-gray-500">{data.config?.customField}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="success" />
    </div>
  )
}

export default CustomActionNode
```

### 3. Add Configuration Schema

```typescript
// Add to /app/components/automation/config/schemas.ts
const getCustomActionFields = (): FormField[] => [
  {
    key: 'customField',
    label: 'Custom Field',
    type: 'text',
    required: true,
    placeholder: 'Enter custom value',
    description: 'This field does something custom'
  },
  {
    key: 'customOptions',
    label: 'Options',
    type: 'select',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' }
    ]
  }
]
```

### 4. Register Node Type

```typescript
// Update /app/components/automation/WorkflowBuilder.tsx
import CustomActionNode from './nodes/CustomActionNode'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  loop: LoopNode,
  transform: TransformNode,
  filter: FilterNode,
  custom_action: CustomActionNode, // Add new type
}
```

### 5. Add to Node Palette

```typescript
// Update node palette in WorkflowBuilder.tsx
const nodePalette = {
  // ... existing categories
  custom: [
    {
      type: 'action',
      category: 'custom',
      name: 'Custom Action',
      description: 'Performs a custom action',
      icon: 'Settings',
      actionType: 'custom_action',
    }
  ]
}
```

## Testing Approaches

### Unit Testing

```typescript
// Example: Configuration panel tests
import { render, screen, fireEvent } from '@testing-library/react'
import DynamicConfigPanel from '../config/DynamicConfigPanel'

describe('DynamicConfigPanel', () => {
  it('should accept single character input', async () => {
    const mockNode = {
      id: 'test-node',
      type: 'action',
      data: { actionType: 'send_email', config: {} }
    }

    const mockOnSave = jest.fn()
    const mockOnChange = jest.fn()

    render(
      <DynamicConfigPanel
        node={mockNode}
        onClose={() => {}}
        onSave={mockOnSave}
        onChange={mockOnChange}
        organizationId="test-org"
      />
    )

    const subjectInput = screen.getByLabelText(/subject/i)
    
    // Test single character input
    fireEvent.change(subjectInput, { target: { value: 'a' } })
    expect(subjectInput.value).toBe('a')
    
    // Test continued typing
    fireEvent.change(subjectInput, { target: { value: 'ab' } })
    expect(subjectInput.value).toBe('ab')
  })

  it('should update node labels after saving', async () => {
    // ... test implementation
  })
})
```

### Integration Testing

```typescript
// Example: Workflow builder integration tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkflowBuilder from '../WorkflowBuilder'

describe('WorkflowBuilder Integration', () => {
  it('should create workflow with drag and drop', async () => {
    render(<WorkflowBuilder organizationId="test-org" />)
    
    // Simulate drag and drop
    const emailAction = screen.getByText('Send Email')
    const canvas = screen.getByTestId('react-flow-canvas')
    
    // Drag from palette to canvas
    fireEvent.dragStart(emailAction)
    fireEvent.dragOver(canvas)
    fireEvent.drop(canvas)
    
    await waitFor(() => {
      expect(screen.getByText('Email Action')).toBeInTheDocument()
    })
  })
})
```

### E2E Testing

```typescript
// Example: Playwright E2E tests
import { test, expect } from '@playwright/test'

test('Complete workflow creation flow', async ({ page }) => {
  await page.goto('/automations/builder/new')
  
  // Wait for builder to load
  await page.waitForSelector('[data-testid="workflow-builder"]')
  
  // Drag Facebook trigger to canvas
  await page.dragAndDrop(
    '[data-testid="facebook-lead-trigger"]',
    '[data-testid="react-flow-canvas"]'
  )
  
  // Configure the trigger
  await page.click('[data-testid="facebook-lead-node"]')
  await page.selectOption('[data-testid="form-select"]', 'all')
  await page.click('[data-testid="save-config"]')
  
  // Verify node appears configured
  await expect(page.locator('[data-testid="facebook-lead-node"]')).toContainText('All Forms')
})
```

## Performance Optimizations

### React Optimizations

```typescript
// Memoized components to prevent unnecessary re-renders
const MemoizedNode = React.memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`node ${selected ? 'selected' : ''}`}>
      {data.label}
    </div>
  )
})

// Debounced configuration updates
const useDebouncedConfig = (config: any, delay: number = 300) => {
  const [debouncedConfig, setDebouncedConfig] = useState(config)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedConfig(config), delay)
    return () => clearTimeout(timer)
  }, [config, delay])
  
  return debouncedConfig
}
```

### Canvas Optimizations

```typescript
// Viewport culling for large workflows
const useViewportCulling = (nodes: Node[], viewport: Viewport) => {
  return useMemo(() => {
    const viewportBounds = {
      x: -viewport.x / viewport.zoom,
      y: -viewport.y / viewport.zoom,
      width: window.innerWidth / viewport.zoom,
      height: window.innerHeight / viewport.zoom
    }
    
    return nodes.filter(node => {
      return (
        node.position.x + 200 > viewportBounds.x &&
        node.position.x < viewportBounds.x + viewportBounds.width &&
        node.position.y + 100 > viewportBounds.y &&
        node.position.y < viewportBounds.y + viewportBounds.height
      )
    })
  }, [nodes, viewport])
}
```

## Security Considerations

### Input Sanitization

```typescript
// Sanitize user input in configuration
const sanitizeConfig = (config: any): any => {
  const sanitized = { ...config }
  
  // Sanitize text fields
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = DOMPurify.sanitize(sanitized[key])
    }
  })
  
  return sanitized
}
```

### Variable Validation

```typescript
// Prevent code injection through variables
const validateVariableContent = (text: string): boolean => {
  // Prevent script injection
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(text))
}
```

### API Security

```typescript
// Secure workflow execution
const executeWorkflow = async (workflowId: string, organizationId: string) => {
  // Verify organization access
  const hasAccess = await verifyOrganizationAccess(workflowId, organizationId)
  if (!hasAccess) {
    throw new Error('Unauthorized access to workflow')
  }
  
  // Sanitize execution context
  const sanitizedContext = sanitizeExecutionContext(context)
  
  // Execute with rate limiting
  await rateLimitCheck(organizationId, 'workflow_execution')
  
  return await executeWorkflowSecure(workflowId, sanitizedContext)
}
```

## Migration and Upgrade Guide

### Upgrading from Previous Versions

If upgrading from a version before 1.3.3, follow these steps:

1. **Clear Browser Cache**: Force refresh to load new components
2. **Check Node Configurations**: Re-save any workflows with configuration issues
3. **Test Variable Syntax**: Update any hardcoded variable syntax to use proper channel formats
4. **Verify Facebook Integration**: Reconnect Facebook if "All Forms" option is missing

### Breaking Changes

- Variable syntax now enforces channel-specific formats
- Configuration panel structure has changed (backward compatible)
- Node ID generation method updated (existing workflows unaffected)

---

## Support and Contributing

### Development Setup

```bash
# Clone and setup
git clone [repository]
cd atlas-fitness-onboarding
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests  
npm run test:e2e
```

### Code Standards

- Follow TypeScript strict mode
- Use proper React patterns (hooks, memo, callback)
- Add comprehensive JSDoc comments
- Include unit tests for new features
- Update this documentation for significant changes

### Debugging

Enable debug logging:
```typescript
// Add to development environment
localStorage.setItem('automation-builder-debug', 'true')
```

---

**Last Updated:** August 29, 2025  
**Contributors:** Atlas Fitness Development Team  
**Document Version:** 2.0 (Post 8-Critical-Fixes)