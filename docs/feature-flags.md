# Feature Flags Documentation

The feature flags system provides comprehensive control over platform features, enabling graceful rollouts and fallback mechanisms.

## Quick Start

Feature flags are managed in `/app/lib/feature-flags.ts` and control access to incomplete or experimental features throughout the platform.

## System Overview

### Core Architecture
The system uses a TypeScript interface to define all available feature flags with default values and environment overrides:

```typescript
export interface FeatureFlags {
  // Marketing & Campaigns
  campaigns: boolean
  campaignsCreate: boolean
  campaignsAnalytics: boolean
  campaignsActions: boolean
  
  // Surveys  
  surveys: boolean
  surveysCreate: boolean
  surveysResponses: boolean
  surveysAnalytics: boolean
  surveysActions: boolean
  
  // Analytics & Reporting
  advancedAnalytics: boolean
  customReports: boolean
  betaAnalytics: boolean
  
  // AI Features
  aiInsights: boolean
  aiIntelligenceFallback: boolean
  
  // Forms & SOPs
  formsUploadDocument: boolean
  sopsMinimalView: boolean
  
  // Staff & Payroll
  staffFallback: boolean
  payrollExplainer: boolean
  
  // Billing & Payments
  billingMswStub: boolean
  billingRetryButton: boolean
  
  // Conversations & Contacts
  conversationsNewButton: boolean
  contactsExportFeedback: boolean
  
  // Automation Builder Hardening (7 PRs)
  automationBuilderControlledConfig: boolean
  automationBuilderCanvasImproved: boolean
  automationBuilderNanoidNodes: boolean
  automationBuilderMinimapSafety: boolean
  automationBuilderValidation: boolean
  automationBuilderAutoSave: boolean
  automationBuilderTemplateModal: boolean
}
```

## Marketing & Campaigns Flags

### `campaigns`
- **Default**: `true`
- **Purpose**: Controls visibility of campaigns in navigation
- **Effect**: Shows campaigns module with limited functionality when enabled

### `campaignsCreate`
- **Default**: `false` 
- **Purpose**: Controls campaign creation functionality
- **Effect**: Enables new campaign creation workflow
- **Fallback**: Shows "Campaign creation is coming soon!" toast when disabled

### `campaignsAnalytics`
- **Default**: `false`
- **Purpose**: Controls analytics tab functionality
- **Effect**: Enables campaign performance analytics and reporting
- **Fallback**: Shows placeholder content when disabled

### `campaignsActions`
- **Default**: `false`
- **Purpose**: Controls edit/delete button functionality
- **Effect**: Enables campaign modification and deletion
- **Fallback**: Shows "Campaign editing coming soon!" toast when disabled

## Surveys & Feedback Flags

### `surveys`
- **Default**: `true`
- **Purpose**: Controls visibility of surveys in navigation
- **Effect**: Shows surveys module with mock data functionality

### `surveysCreate`
- **Default**: `false`
- **Purpose**: Controls survey creation functionality
- **Effect**: Enables survey builder and template system
- **Fallback**: Shows waitlist modal with early access signup

### `surveysResponses`
- **Default**: `false`
- **Purpose**: Controls response viewing functionality
- **Effect**: Enables individual response analysis and filtering
- **Fallback**: Shows "Response Analysis Coming Soon" message

### `surveysAnalytics`
- **Default**: `false`
- **Purpose**: Controls analytics dashboard functionality
- **Effect**: Enables survey performance metrics and visualization
- **Fallback**: Shows demo badge and limited functionality

### `surveysActions`
- **Default**: `false`
- **Purpose**: Controls edit/delete/send button functionality
- **Effect**: Enables survey management actions
- **Fallback**: Shows appropriate "coming soon" toast messages

## Analytics & Reporting Flags

### `advancedAnalytics`
- **Default**: `false`
- **Purpose**: Controls access to advanced analytics features
- **Effect**: Enables detailed business intelligence and reporting
- **Fallback**: Shows "Analytics features coming soon..." placeholder

### `customReports`
- **Default**: `false`
- **Purpose**: Controls custom reporting functionality
- **Effect**: Enables report generation and customization
- **Fallback**: Standard reporting only

### `betaAnalytics`
- **Default**: `false`
- **Purpose**: Controls access to beta analytics dashboard
- **Effect**: Enables password-protected advanced dashboard at `/analytics-dashboard`
- **Fallback**: Shows access request or waitlist functionality

## AI Features Flags

### `aiInsights`
- **Default**: `true`
- **Purpose**: Controls AI insights and intelligence features
- **Effect**: Enables AI-powered business insights and recommendations
- **Fallback**: Basic analytics without AI enhancement

### `aiIntelligenceFallback`
- **Default**: `true`
- **Purpose**: Controls demo data option when organization fetch fails
- **Effect**: Shows sample AI insights when real data unavailable
- **Fallback**: Error state without demo data

## Forms & SOPs Flags

### `formsUploadDocument`
- **Default**: `false`
- **Purpose**: Controls document upload functionality
- **Effect**: Enables file upload and document processing
- **Fallback**: Shows "File upload functionality will be implemented soon!" message

### `sopsMinimalView`
- **Default**: `true`
- **Purpose**: Controls SOP list view after creation
- **Effect**: Shows simplified list view after SOP creation
- **Alternative**: Full detailed view when disabled

## Staff & Payroll Flags

### `staffFallback`
- **Default**: `true`
- **Purpose**: Controls demo data option when staff API fails
- **Effect**: Shows placeholder staff member when API unavailable
- **Fallback**: Error state without demo data

### `payrollExplainer`
- **Default**: `true`
- **Purpose**: Controls payroll explainer page visibility
- **Effect**: Shows comprehensive payroll coming soon page
- **Alternative**: Basic placeholder when disabled

## Billing & Payments Flags

### `billingMswStub`
- **Default**: `true`
- **Purpose**: Enables MSW (Mock Service Worker) stub support
- **Effect**: Shows demo billing data when API fails in development
- **Environment**: Only active in development mode

### `billingRetryButton`
- **Default**: `true`
- **Purpose**: Controls retry functionality visibility
- **Effect**: Shows "Try Again" button on billing error states
- **Alternative**: Error message only when disabled

## Conversations & Contacts Flags

### `conversationsNewButton`
- **Default**: `true`
- **Purpose**: Controls "New Conversation" button functionality
- **Effect**: Gates button based on contact availability
- **Logic**: `isFeatureEnabled('conversationsNewButton') && contactsCount > 0`

### `contactsExportFeedback`
- **Default**: `true`
- **Purpose**: Controls toast notifications for export operations
- **Effect**: Shows success/failure feedback for data exports
- **Integration**: Works with customer export functionality

## Automation Builder Hardening Flags (7 PRs)

### `automationBuilderControlledConfig`
- **Default**: `false`
- **Purpose**: PR-1 - Controls enhanced configuration panel with proper React state management
- **Effect**: Enables fully reactive form inputs with real-time validation across all node types
- **Impact**: Fixes stale closure bug preventing form inputs from accepting user input
- **Testing**: 50+ unit tests verify form handling for email, SMS, WhatsApp, condition, and wait nodes

### `automationBuilderCanvasImproved`
- **Default**: `false`
- **Purpose**: PR-2 - Controls advanced canvas controls with pan/zoom and scroll-bleed prevention
- **Effect**: Enables proper event handling separation between pan mode and drag operations
- **Performance**: Optimized for workflows with 100+ nodes using debounced state updates
- **Features**: Click+drag pan, Space+drag dedicated pan mode, mouse wheel zoom, scroll-bleed prevention

### `automationBuilderNanoidNodes`
- **Default**: `false`
- **Purpose**: PR-3 - Controls robust node ID generation using nanoid/UUID with conflict detection
- **Effect**: Prevents node ID conflicts that cause new nodes to replace existing ones
- **Migration**: Automatic upgrade system for existing workflows on first edit
- **Testing**: Concurrent node creation tests verify ID uniqueness under rapid creation scenarios

### `automationBuilderMinimapSafety`
- **Default**: `false`
- **Purpose**: PR-4 - Controls minimap click interference prevention system
- **Effect**: Prevents unintended navigation away from builder while maintaining minimap functionality
- **Safety**: Event prevention system with comprehensive click handling and route protection
- **Testing**: 15+ navigation prevention tests verify no route changes during minimap interactions

### `automationBuilderValidation`
- **Default**: `false`
- **Purpose**: PR-5 - Controls comprehensive test runner with strict pre-execution validation
- **Effect**: Enables detailed workflow validation with field-level error reporting before test execution
- **Validation**: Trigger detection, required field validation, connection verification, quality scoring
- **Error reporting**: Field-level validation messages with node IDs and severity levels

### `automationBuilderAutoSave`
- **Default**: `false`
- **Purpose**: PR-6 - Controls enhanced save/publish system with hydration recovery
- **Effect**: Enables auto-save with persistent state management across browser sessions
- **Features**: 2-second auto-save interval, retry mechanisms, conflict resolution, network failure recovery
- **Reliability**: Intelligent change detection preventing unnecessary API calls with session persistence

### `automationBuilderTemplateModal`
- **Default**: `false`
- **Purpose**: PR-7 - Controls template system with modal preview and one-click cloning
- **Effect**: Enables template browser with preview functionality and organization isolation
- **Security**: Organization-level template separation with proper data sanitization during cloning
- **Features**: Template preview, one-click cloning, metadata display, usage statistics

## Environment Configuration

### Environment Variable Overrides
Override flags using environment variables:

```bash
# Enable full campaigns functionality
NEXT_PUBLIC_FEATURE_CAMPAIGNS=true

# Enable full surveys functionality  
NEXT_PUBLIC_FEATURE_SURVEYS=true

# Enable automation builder hardening features
NEXT_PUBLIC_AUTOMATION_BUILDER_CONTROLLED_CONFIG=true
NEXT_PUBLIC_AUTOMATION_BUILDER_CANVAS_IMPROVED=true
NEXT_PUBLIC_AUTOMATION_BUILDER_NANOID_NODES=true
NEXT_PUBLIC_AUTOMATION_BUILDER_MINIMAP_SAFETY=true
NEXT_PUBLIC_AUTOMATION_BUILDER_VALIDATION=true
NEXT_PUBLIC_AUTOMATION_BUILDER_AUTO_SAVE=true
NEXT_PUBLIC_AUTOMATION_BUILDER_TEMPLATE_MODAL=true
```

### Development Environment
In development mode, features are automatically shown but actions remain disabled:

```typescript
if (process.env.NODE_ENV === 'development') {
  overrides.campaigns = true
  overrides.surveys = true
}
```

## Usage Patterns

### React Components
Use the hook for reactive feature checking:

```typescript
import { useFeatureFlag } from '@/app/lib/feature-flags'

function CampaignButton() {
  const canCreate = useFeatureFlag('campaignsCreate')
  
  return (
    <button 
      onClick={canCreate ? handleCreate : showComingSoonToast}
      disabled={!canCreate}
    >
      Create Campaign
    </button>
  )
}
```

### Server-Side Checking
Use the function for server-side feature checking:

```typescript
import { isFeatureEnabled } from '@/app/lib/feature-flags'

export async function GET() {
  if (!isFeatureEnabled('advancedAnalytics')) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
  }
  
  // Feature logic here
}
```

### Conditional Rendering
Gate entire components or sections:

```typescript
{isFeatureEnabled('betaAnalytics') && (
  <AdvancedAnalyticsDashboard />
)}

{!isFeatureEnabled('campaignsActions') && (
  <ComingSoon feature="Campaign Management" />
)}
```

## Best Practices

### Feature Flag Naming
- **Hierarchical**: Use module prefixes (`campaigns`, `surveys`, `billing`)
- **Descriptive**: Include functionality purpose (`Actions`, `Create`, `Fallback`)
- **Consistent**: Follow established patterns across modules

### User Experience
- **Graceful Degradation**: Always provide fallbacks or alternatives
- **Clear Communication**: Use toast messages and banners to explain limitations
- **Professional Messaging**: Maintain professional tone in "coming soon" messages
- **Visual Indicators**: Use badges, tooltips, and styling to indicate feature status

### Development Workflow
- **Default to Disabled**: New features should default to `false` until ready
- **Environment Testing**: Use environment variables for testing feature combinations
- **Mock Data**: Provide realistic mock data for UI development
- **Documentation**: Update feature flag documentation when adding new flags

## Troubleshooting

### Feature Not Working Despite Flag Being True
1. Check if there are multiple related flags that need to be enabled
2. Verify environment variables aren't overriding expected values
3. Check browser cache - refresh may be needed
4. Confirm component is using the feature flag correctly

### Environment Overrides Not Working
1. Verify environment variable names match exactly (case sensitive)
2. Ensure variables start with `NEXT_PUBLIC_` for client-side access
3. Restart development server after adding new environment variables
4. Check that override logic is implemented in `getEnvironmentFlags()`

### Mock Data Not Showing
1. Verify fallback flags are enabled (`billingMswStub`, `staffFallback`, etc.)
2. Check that mock data is properly implemented in components
3. Ensure development environment is properly configured
4. Confirm API failure conditions are triggering fallback logic

### Coming Soon Messages Not Displaying
1. Check that toast provider is properly initialized
2. Verify feature flag checks are implemented in button/action handlers
3. Ensure toast messages are imported and used correctly
4. Confirm component is checking flags before executing actions

### Automation Builder Hardening Flags Issues

#### Configuration Panel Not Working (PR-1)
1. Verify `automationBuilderControlledConfig=true` is set
2. Check that React component state is properly managed with useCallback dependencies  
3. Confirm form inputs are using controlled input patterns
4. Test all node types (email, SMS, WhatsApp, condition, wait) for input responsiveness

#### Canvas Controls Not Functioning (PR-2)  
1. Verify `automationBuilderCanvasImproved=true` is enabled
2. Test pan functionality with click+drag on empty canvas areas
3. Check Space+drag dedicated pan mode is working
4. Confirm scroll-bleed prevention is active during pan operations
5. Verify performance with workflows containing 50+ nodes

#### Node ID Conflicts Still Occurring (PR-3)
1. Verify `automationBuilderNanoidNodes=true` is enabled  
2. Check that existing workflows are automatically upgraded on first edit
3. Test concurrent node creation scenarios for ID uniqueness
4. Confirm nanoid/UUID generation is working properly

#### Minimap Navigation Issues (PR-4)
1. Verify `automationBuilderMinimapSafety=true` is enabled
2. Test that minimap clicks do not cause navigation away from builder
3. Check that preventDefault and stopPropagation are working
4. Confirm minimap still provides workflow overview functionality

#### Validation Not Running (PR-5)
1. Verify `automationBuilderValidation=true` is enabled
2. Check that test mode button shows enhanced validation
3. Confirm pre-execution validation runs before test execution
4. Test field-level validation for all action types
5. Verify error reporting shows node IDs and severity levels

#### Auto-Save Not Working (PR-6)
1. Verify `automationBuilderAutoSave=true` is enabled
2. Check that 2-second auto-save interval is functioning
3. Test state persistence across browser refresh
4. Confirm retry mechanisms work during network failures
5. Verify intelligent change detection prevents unnecessary API calls

#### Template System Not Available (PR-7)
1. Verify `automationBuilderTemplateModal=true` is enabled
2. Check that Templates button opens modal browser
3. Confirm template preview functionality works
4. Test one-click cloning with organization isolation
5. Verify template security and data sanitization during cloning