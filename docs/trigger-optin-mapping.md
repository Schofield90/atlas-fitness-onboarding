# Website Opt-in Form Trigger Configuration Mapping

## Current Problem

The "Website Opt-in Form" trigger currently shows a generic "Trigger Type" selector instead of allowing users to select specific forms that should trigger the automation. When users drag this specific trigger, they expect form-specific configuration, not a generic dropdown.

## Key Files and Components

### Primary Trigger Configuration Component
- **File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/FormSubmittedTriggerConfig.tsx`
- **Lines**: 30-569
- **Purpose**: Comprehensive form submission trigger configuration with form selection, field filters, and conditions
- **Current State**: ✅ **CORRECTLY IMPLEMENTED** - already has proper form selection UI

### Trigger Mapping Issue
- **File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/UnifiedNodeConfigPanel.tsx`
- **Issue**: Missing case for `'website_form'` actionType
- **Current Mapping**: 
  - `actionType: 'website_form'` (from WorkflowBuilder.tsx:151) → **NO MATCHING CASE**
  - Falls back to default trigger handling
- **Fix Location**: Lines 157-291, add case for `'website_form'`

### Trigger Definition
- **File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/WorkflowBuilder.tsx`
- **Lines**: 145-152
- **Current Definition**:
  ```typescript
  {
    type: 'trigger',
    category: 'triggers', 
    name: 'Website Opt-in Form',
    description: 'Triggers when someone fills out a form on your website',
    icon: 'FileText',
    actionType: 'website_form',  // ← This needs matching case in UnifiedNodeConfigPanel
  }
  ```

### Alternative Generic Trigger Component
- **File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/LeadTriggerConfig.tsx`
- **Lines**: 35-72
- **Purpose**: Generic trigger type selector with "website_form" as one option
- **Current State**: Shows dropdown with trigger types including "Website form submitted"
- **Issue**: This is the WRONG component for Website Opt-in trigger - it's too generic

## API Endpoints

### Forms Data Fetching
- **Available Endpoints**:
  - ✅ `/api/forms/list` - Lists all forms for organization (lines 46-58 in FormSubmittedTriggerConfig)
  - ❌ `/api/forms` - **MISSING** - FormSubmittedTriggerConfig tries to fetch from here first
- **Current Implementation**: 
  - Tries `/api/forms` first, falls back to mock data if fails
  - Should use `/api/forms/list` directly

### Forms Page Navigation
- **Route**: `/forms` ✅ EXISTS
- **File**: `/Users/samschofield/atlas-fitness-onboarding/app/forms/page.tsx`
- **Navigation Strategy**: Direct navigation to `/forms` page
- **Create Form CTA**: Already implemented in FormSubmittedTriggerConfig (lines 242-248)

## Current Implementation Analysis

### FormSubmittedTriggerConfig Features ✅ ALREADY CORRECT:
1. **Multi-form Selection**: Dropdown to select specific forms or "any form"
2. **Form Type Filtering**: Website, landing page, popup, embedded options
3. **Empty State CTA**: "Create Form" link to `/forms` when no forms exist
4. **Form Display**: Shows form count and submission statistics
5. **Field-level Filters**: Required fields, field value conditions
6. **Advanced Filters**: Submission source, duplicate handling, etc.

### Missing Connection:
- Website Opt-in trigger (`actionType: 'website_form'`) not routed to FormSubmittedTriggerConfig

## Required Changes

### 1. Fix Trigger Routing (CRITICAL)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/UnifiedNodeConfigPanel.tsx`
**Location**: Add case around line 270

```typescript
case 'website_form':
  return (
    <FormSubmittedTriggerConfig
      config={config}
      onChange={handleConfigChange}
      organizationId={organizationId}
    />
  )
```

### 2. Fix API Endpoint (MINOR)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/FormSubmittedTriggerConfig.tsx`
**Location**: Line 60
**Change**: `'/api/forms'` → `'/api/forms/list'`

### 3. Update Icon Mapping (OPTIONAL)
**File**: `/Users/samschofield/atlas-fitness-onboarding/app/components/automation/config/UnifiedNodeConfigPanel.tsx`
**Location**: Around line 86
```typescript
case 'website_form':
  return <FileText className="w-6 h-6" />
```

## Form Selection Component Structure

The FormSubmittedTriggerConfig already has the EXACT functionality needed:

### Multi-Form Selection (Lines 263-297)
- Dropdown with all available forms
- "Any form" option for broad triggers
- Real-time form details display (name, type, submission count)

### Empty State with CTA (Lines 233-249)
- Detects when no forms exist
- Shows clear "Create Form" call-to-action
- Links directly to `/forms` page

### Form Type Filtering (Lines 299-325)
- Filter by form type (website, landing page, popup, embedded)
- Visual feedback for selected type

## Risk Assessment

### LOW RISK CHANGES:
1. **Add missing case in UnifiedNodeConfigPanel**: Simple routing fix
2. **Fix API endpoint path**: String change only

### NO BREAKING CHANGES:
- FormSubmittedTriggerConfig is already feature-complete
- All required UI components exist
- API endpoints are already functional
- Navigation routes are established

### TESTING FOCUS:
1. Website Opt-in trigger selection shows proper configuration panel
2. Form selection dropdown populates correctly
3. "Create Form" CTA navigates to correct page
4. Form type filtering works as expected
5. Empty state displays when no forms exist

## Implementation Sequence

1. **Phase 1**: Fix trigger routing in UnifiedNodeConfigPanel (5 minutes)
2. **Phase 2**: Test trigger configuration opens correctly  
3. **Phase 3**: Fix API endpoint if needed (2 minutes)
4. **Phase 4**: Add icon mapping for consistency (1 minute)
5. **Phase 5**: End-to-end testing of form selection flow

## Files NOT Requiring Changes

- ✅ FormSubmittedTriggerConfig.tsx - Already feature-complete
- ✅ WorkflowBuilder.tsx - Trigger definition is correct  
- ✅ Forms API routes - `/api/forms/list` works correctly
- ✅ Forms page - Navigation target exists and functional

## Conclusion

This is a **minimal-touch fix** requiring only 1-2 lines of code change. The sophisticated form selection UI already exists in FormSubmittedTriggerConfig - it just needs to be properly connected to the Website Opt-in trigger via the routing logic in UnifiedNodeConfigPanel.