# Automation Triggers Context Map

*Generated: 2025-08-31T00:00:00Z*

## Overview
This document maps the complete automation triggers implementation in the atlas-fitness-onboarding repository, focusing on the builder interface, state management, and trigger configuration system.

## Builder Architecture

### Entry Points & Routing
- **Main Builder Route**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/page.tsx`
  - Redirects to `/automations/builder/new` for creating workflows
  - [source: app/automations/builder/page.tsx:L6-L19]

- **Dynamic Builder Route**: `/Users/samschofield/atlas-fitness-onboarding/app/automations/builder/[id]/page.tsx`
  - Handles both new workflows (`id=new`) and editing existing workflows
  - Loads workflow data via API `/api/automations/workflows/[id]`
  - Passes workflow to DynamicWorkflowBuilder component
  - [source: app/automations/builder/[id]/page.tsx:L27-L117]

### React Flow Implementation
- **Dynamic Wrapper**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/DynamicWorkflowBuilder.tsx`
  - Client-side only loading with Suspense fallback
  - Always uses main WorkflowBuilder (SimpleWorkflowBuilder deprecated)
  - [source: app/components/automation/DynamicWorkflowBuilder.tsx:L40-L57]

- **Main Builder**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx`
  - React Flow with ReactFlowProvider, HTML5Backend for DnD
  - Node types mapping: trigger, action, condition, wait, loop, transform, filter
  - [source: app/components/automation/WorkflowBuilder.tsx:L77-L85]

## State Management Architecture

### Node Selection State
- **selectedNode**: `useState<string | null>(null)` in WorkflowBuilder
  - Set via `onNodeClick` handler when user clicks nodes
  - Used to determine which node to configure
  - [source: app/components/automation/WorkflowBuilder.tsx:L183]

### Configuration Panel State  
- **showConfigPanel**: `useState<boolean>(false)` controls panel visibility
- **configNode**: `useState<WorkflowNode | null>(null)` stores selected node data
- Panel opens on node click, closes on save/cancel
- [source: app/components/automation/WorkflowBuilder.tsx:L182-L184]

### Node Click Handler
```typescript
const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  setConfigNode(node as WorkflowNode)
  setShowConfigPanel(true)
  // Ensure node isn't marked as selected for deletion
}, [setNodes])
```
- Opens config panel immediately on single click
- [source: app/components/automation/WorkflowBuilder.tsx:L321-L334]

## Node Palette System

### Node Templates
- **Palette Component**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/NodePalette.tsx`
  - Contains categorized node templates with drag-and-drop support
  - Categories: triggers, communication, crm, logic, data, integration, ai, advanced
  - [source: app/components/automation/NodePalette.tsx:L59-L418]

### Trigger Node Templates
Available trigger types in palette:
- **New Lead**: `lead_trigger` subtype
- **Birthday**: `birthday_trigger` subtype  
- **Contact Tagged**: `contact_tagged` subtype
- **Webhook**: `webhook_received` subtype
- **Email Event**: `email_event` subtype
- **Appointment**: `appointment_status` subtype
- **Booking Confirmed**: `booking_confirmed` subtype (NEW)
- **Missed Session**: `missed_session` subtype
- [source: app/components/automation/NodePalette.tsx:L61-L157]

## Trigger Configuration System

### Dynamic Configuration Panel
- **Main Config Panel**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/DynamicConfigPanelEnhanced.tsx`
  - Dynamically renders forms based on node type and actionType/subtype
  - Handles all trigger configuration with type-specific field schemas
  - [source: app/components/automation/config/DynamicConfigPanelEnhanced.tsx:L64-L120]

### Trigger Configuration Detection Logic
```typescript
const getTriggerFields = (subtype: string, dynamicData?: any): FormField[] => {
  // For specific trigger types, don't show the dropdown
  const hideDropdown = ['facebook_lead_form', 'form_submitted', 'scheduled_time'].includes(subtype)
  
  // Common fields only shown for generic triggers
  const commonFields = hideDropdown ? [] : [
    {
      key: 'subtype',
      label: 'Trigger Type',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'lead_trigger', label: 'New Lead' },
        { value: 'scheduled_time', label: 'Schedule' },
        // ... other options
      ]
    }
  ]
}
```
- [source: app/components/automation/config/DynamicConfigPanelEnhanced.tsx:L122-L141]

### Specific Trigger Configuration Components

#### Website Opt-in Form Trigger
- **Component**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/FormSubmittedTriggerConfig.tsx`
- **Configuration Options**:
  - Form selection (specific form vs any form)
  - Form type filtering (website, landing_page, popup, embedded)
  - Submission source filtering (direct, referral, social, email, ads)
  - Required fields validation
  - Field value conditions
  - Duplicate handling (allow, skip, update)
  - Minimum fields completed threshold
- **API Integration**: Loads forms via `/api/forms`
- [source: app/components/automation/config/FormSubmittedTriggerConfig.tsx:L30-L569]

#### Schedule Trigger  
- **Configuration**: Handled in DynamicConfigPanelEnhanced for `scheduled_time` subtype
- **Options**: Daily/Weekly/Monthly scheduling, specific times
- Hides generic "Trigger Type" dropdown for schedule-specific triggers
- [source: app/components/automation/config/DynamicConfigPanelEnhanced.tsx:L206-L250]

#### Webhook Trigger
- **Component**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/WebhookTriggerConfig.tsx`
- **Configuration Options**:
  - Webhook source selection (any endpoint, specific URL, new endpoint)
  - Endpoint creation and management
  - Payload validation (none, required fields, JSON schema)
  - Secret validation toggle
  - Additional payload filters
- **API Integration**: 
  - Creates endpoints via `/api/webhooks/endpoints`
  - Manages existing webhook endpoints
- [source: app/components/automation/config/WebhookTriggerConfig.tsx:L21-L473]

### Other Trigger Configuration Components
- **Birthday**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/BirthdayTriggerConfig.tsx`
- **Contact Tagged**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/ContactTagTriggerConfig.tsx`
- **Email Events**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/EmailEventTriggerConfig.tsx`
- **Appointments**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/AppointmentTriggerConfig.tsx`
- **Lead Triggers**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/LeadTriggerConfig.tsx`
- **Booking**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/BookingTriggerConfig.tsx`

## Current Implementation Issues

### Generic "Trigger Type" Selector Problem
- **Location**: DynamicConfigPanelEnhanced.tsx, getTriggerFields function
- **Issue**: Generic trigger nodes show a "Trigger Type" dropdown instead of opening specific configuration panels
- **Problem**: When users drag a specific trigger (e.g., "Website Opt-in Form") they expect to see form-specific config, not a generic dropdown
- **Root Cause**: Logic checks for specific subtypes but falls back to showing dropdown for unrecognized types
- [source: app/components/automation/config/DynamicConfigPanelEnhanced.tsx:L124-L141]

### Workflow API Structure
- **Workflows API**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/route.ts`
- **Individual Workflow**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/[id]/route.ts`
- **Workflow Execution**: `/Users/samschofield/atlas-fitness-onboarding/app/api/automations/workflows/[id]/execute/route.ts`

### Related API Endpoints
- **Forms**: `/Users/samschofield/atlas-fitness-onboarding/app/api/forms/submit/route.ts`
- **Webhooks**:
  - Endpoints: `/Users/samschofield/atlas-fitness-onboarding/app/api/webhooks/endpoints/`
  - Facebook Leads: `/Users/samschofield/atlas-fitness-onboarding/app/api/webhooks/facebook-leads/route.ts`
  - Form Submitted: `/Users/samschofield/atlas-fitness-onboarding/app/api/webhooks/form-submitted/route.ts`
  - Lead Created: `/Users/samschofield/atlas-fitness-onboarding/app/api/webhooks/lead-created/route.ts`

## Feature Flags
- **Feature Flag System**: `/Users/samschofield/atlas-fitness-onboarding/app/lib/feature-flags.ts`
- **Builder Features**: Controlled via `useFeatureFlag` hook in WorkflowBuilder
- **Flag Names**: Check `.claude/context/flags` for current automation-related flags

## Test Coverage
- **Unit Tests**: `/Users/samschofield/atlas-fitness-onboarding/tests/unit/automation-builder.test.tsx`
- **Config Panel Tests**: `/Users/samschofield/atlas-fitness-onboarding/tests/unit/automation-node-config.test.tsx`
- **E2E Tests**: `/Users/samschofield/atlas-fitness-onboarding/tests/e2e/automation-builder-critical-fixes.spec.ts`

## File Structure Summary
```
app/
├── automations/
│   ├── builder/page.tsx (redirects to new)
│   └── builder/[id]/page.tsx (main builder entry)
├── components/automation/
│   ├── DynamicWorkflowBuilder.tsx (client wrapper)
│   ├── WorkflowBuilder.tsx (main React Flow component)
│   ├── NodePalette.tsx (draggable node templates)
│   └── config/
│       ├── DynamicConfigPanelEnhanced.tsx (main config logic)
│       ├── WebhookTriggerConfig.tsx (webhook configuration)
│       ├── FormSubmittedTriggerConfig.tsx (form trigger config)
│       └── [Other specific trigger configs...]
└── api/
    ├── automations/workflows/ (workflow CRUD)
    ├── webhooks/ (various webhook handlers)
    └── forms/ (form management)
```

*[CONTEXT-MANAGER: All file paths verified and accessible as of 2025-08-31]*