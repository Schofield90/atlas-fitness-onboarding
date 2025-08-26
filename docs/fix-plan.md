# Atlas Fitness CRM - Surgical Fix Plan

## Executive Summary
This plan addresses 7 critical issues with minimal, surgical patches grouped into 5 PRs.
Each PR is independently deployable with rollback capability.

---

## PR-1: Critical Production Fixes (URGENT)
**Risk**: High | **Impact**: Production Breaking | **Time**: 2 hours

### 1.1 Fix Public Booking 404
- [ ] **File**: Create `/app/book/public/[organizationId]/page.tsx`
  - Copy from `/app/(authenticated)/book/public/[organizationId]/page.tsx`
  - Remove auth wrapper, keep public access
- [ ] **Test**: Manual booking flow for org `63589490-8f55-4157-bd3a-e141594b748e`
- [ ] **Jam**: Record successful booking through public URL
- [ ] **Rollback**: Delete file, revert to 404

### 1.2 Fix Staff API 500 Error
- [ ] **File**: `/app/api/staff/route.ts`
  ```typescript
  // Line 45-50: Fix join syntax
  - .leftJoin('timesheets', 'timesheets.staff_id', '=', 'staff.id')
  + .leftJoin('timesheets', 'staff.id', 'timesheets.staff_id')
  ```
- [ ] **Test**: `curl -X GET /api/staff` with auth headers
- [ ] **Jam**: Record staff list loading
- [ ] **Rollback**: Revert join syntax

**Verification**: 
```bash
# Test endpoints
curl https://atlas-fitness-onboarding.vercel.app/api/public-api/booking-data/63589490-8f55-4157-bd3a-e141594b748e
curl -H "Authorization: Bearer $TOKEN" https://atlas-fitness-onboarding.vercel.app/api/staff
```

---

## PR-2: Automation Builder Consolidation
**Risk**: Medium | **Impact**: Data Loss Prevention | **Time**: 3 hours

### 2.1 Create Canonical Automation Builder
- [ ] **File**: `/app/components/automation/AutomationBuilder.tsx`
  - Use version from `/app/(authenticated)/dashboard/automations/builder/page.tsx`
  - Add state persistence to localStorage
  - Add auto-save every 30 seconds
  
### 2.2 Replace All Duplicates with Redirect
- [ ] **Files to Update** (7 total):
  ```
  /app/(authenticated)/automations/builder/page.tsx
  /app/(authenticated)/dashboard/automations/[id]/page.tsx
  /app/(authenticated)/dashboard/automations/new/page.tsx
  /app/(authenticated)/dashboard/builder/page.tsx
  /app/(authenticated)/settings/automations/builder/page.tsx
  /app/automations/builder/page.tsx
  /builder/page.tsx
  ```
  - Replace content with:
  ```typescript
  import { redirect } from 'next/navigation'
  export default function Page() {
    redirect('/dashboard/automations/builder')
  }
  ```

### 2.3 Add State Recovery
- [ ] **File**: `/app/lib/services/automation-recovery.ts`
  ```typescript
  export const saveAutomationState = (state: any) => {
    localStorage.setItem('automation_draft', JSON.stringify({
      ...state,
      timestamp: Date.now()
    }))
  }
  
  export const recoverAutomationState = () => {
    const saved = localStorage.getItem('automation_draft')
    if (saved) {
      const { timestamp, ...state } = JSON.parse(saved)
      // Only recover if less than 24 hours old
      if (Date.now() - timestamp < 86400000) {
        return state
      }
    }
    return null
  }
  ```

- [ ] **Test**: Create automation, force close browser, recover on return
- [ ] **Jam**: Record state recovery after browser crash
- [ ] **Rollback**: Remove redirects, restore individual files

---

## PR-3: Add Missing UI Elements
**Risk**: Low | **Impact**: UX Improvement | **Time**: 1 hour

### 3.1 Add "New Conversation" Button
- [ ] **File**: `/app/(authenticated)/dashboard/conversations/page.tsx`
  ```typescript
  // Line 180 (after search bar)
  + <Button
  +   onClick={() => setShowNewConversationModal(true)}
  +   className="bg-blue-600 hover:bg-blue-700"
  + >
  +   <Plus className="w-4 h-4 mr-2" />
  +   New Conversation
  + </Button>
  ```

### 3.2 Add New Conversation Modal
- [ ] **File**: `/app/components/conversations/NewConversationModal.tsx`
  ```typescript
  export function NewConversationModal({ 
    isOpen, 
    onClose, 
    onSuccess 
  }: Props) {
    // Minimal modal with:
    // - Contact selector
    // - Channel selector (SMS/WhatsApp)
    // - Initial message input
    // - Send button
  }
  ```

- [ ] **Test**: Click button, create conversation, verify in list
- [ ] **Jam**: Record new conversation creation flow
- [ ] **Rollback**: Remove button and modal

---

## PR-4: Feature Flags for Incomplete Features
**Risk**: Low | **Impact**: Hide Broken Features | **Time**: 2 hours

### 4.1 Create Feature Flag System
- [ ] **File**: `/app/lib/feature-flags.ts`
  ```typescript
  export const FEATURE_FLAGS = {
    MARKETING_CAMPAIGNS: process.env.NEXT_PUBLIC_FF_MARKETING === 'true',
    SURVEY_BUILDER: process.env.NEXT_PUBLIC_FF_SURVEYS === 'true',
    AI_FORM_BUILDER: process.env.NEXT_PUBLIC_FF_AI_FORMS === 'true',
    ADVANCED_ANALYTICS: false, // Always off until ready
  }
  
  export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS) => {
    return FEATURE_FLAGS[feature] || false
  }
  ```

### 4.2 Hide Marketing Campaigns
- [ ] **File**: `/app/(authenticated)/dashboard/marketing/campaigns/page.tsx`
  ```typescript
  // Line 1
  + import { isFeatureEnabled } from '@/app/lib/feature-flags'
  + import { redirect } from 'next/navigation'
  
  // Line 10
  + if (!isFeatureEnabled('MARKETING_CAMPAIGNS')) {
  +   redirect('/dashboard/marketing')
  + }
  ```

### 4.3 Hide Survey Builder
- [ ] **File**: `/app/(authenticated)/dashboard/surveys/page.tsx`
  ```typescript
  // Similar pattern as above
  + if (!isFeatureEnabled('SURVEY_BUILDER')) {
  +   return <ComingSoonBanner feature="Survey Builder" />
  + }
  ```

### 4.4 Add Toggle for AI Forms
- [ ] **File**: `/app/(authenticated)/dashboard/forms/builder/page.tsx`
  ```typescript
  // Wrap AI generation in feature flag
  + {isFeatureEnabled('AI_FORM_BUILDER') && (
      <Button onClick={generateWithAI}>Generate with AI</Button>
  + )}
  ```

### 4.5 Update Navigation
- [ ] **File**: `/app/components/navigation/Sidebar.tsx`
  ```typescript
  // Filter menu items based on feature flags
  const menuItems = getMenuItems().filter(item => {
    if (item.href === '/dashboard/marketing/campaigns') {
      return isFeatureEnabled('MARKETING_CAMPAIGNS')
    }
    if (item.href === '/dashboard/surveys') {
      return isFeatureEnabled('SURVEY_BUILDER')
    }
    return true
  })
  ```

- [ ] **Test**: Verify features hidden when flags off
- [ ] **Jam**: Record navigation with features disabled
- [ ] **Rollback**: Remove feature flag checks

---

## PR-5: Error Handling Standardization
**Risk**: Low | **Impact**: Better Debugging | **Time**: 2 hours

### 5.1 Create Error Boundary Component
- [ ] **File**: `/app/components/ErrorBoundary.tsx`
  ```typescript
  export class ErrorBoundary extends Component {
    state = { hasError: false, error: null }
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error }
    }
    
    componentDidCatch(error: Error, info: ErrorInfo) {
      console.error('Error boundary caught:', error, info)
      // Send to monitoring service
    }
    
    render() {
      if (this.state.hasError) {
        return <ErrorFallback error={this.state.error} />
      }
      return this.props.children
    }
  }
  ```

### 5.2 Wrap High-Risk Components
- [ ] **Files to Update**:
  - `/app/(authenticated)/dashboard/automations/builder/page.tsx`
  - `/app/(authenticated)/dashboard/forms/builder/page.tsx`
  - `/app/(authenticated)/dashboard/conversations/page.tsx`
  
  ```typescript
  // Wrap component in ErrorBoundary
  + <ErrorBoundary>
      <ExistingComponent />
  + </ErrorBoundary>
  ```

### 5.3 Add API Error Handler
- [ ] **File**: `/app/lib/api/error-handler.ts`
  ```typescript
  export function handleApiError(error: unknown): Response {
    console.error('API Error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  ```

- [ ] **Test**: Trigger errors, verify graceful handling
- [ ] **Jam**: Record error recovery flows
- [ ] **Rollback**: Remove error boundaries

---

## Testing Strategy

### Unit Tests Required
```typescript
// /app/__tests__/booking-public.test.ts
describe('Public Booking', () => {
  it('loads without auth')
  it('fetches organization data')
  it('creates booking without login')
})

// /app/__tests__/staff-api.test.ts
describe('Staff API', () => {
  it('returns staff list with timesheets')
  it('handles missing timesheets gracefully')
})

// /app/__tests__/automation-state.test.ts
describe('Automation State', () => {
  it('saves draft to localStorage')
  it('recovers draft after reload')
  it('expires old drafts')
})
```

### Integration Tests
```bash
# Create test script
npm run test:integration

# Tests:
# 1. Public booking end-to-end
# 2. Staff API with database
# 3. Automation builder state persistence
# 4. Feature flag toggling
```

---

## Rollback Strategy

### Per-PR Rollback
Each PR can be reverted independently:

```bash
# PR-1: Revert critical fixes
git revert <pr-1-commit>

# PR-2: Restore individual automation builders
git revert <pr-2-commit>

# PR-3: Remove UI additions
git revert <pr-3-commit>

# PR-4: Remove feature flags
git revert <pr-4-commit>

# PR-5: Remove error handling
git revert <pr-5-commit>
```

### Database Rollback
No database changes required - all fixes are code-only.

### Environment Rollback
```bash
# Remove feature flags from .env
NEXT_PUBLIC_FF_MARKETING=
NEXT_PUBLIC_FF_SURVEYS=
NEXT_PUBLIC_FF_AI_FORMS=
```

---

## Monitoring & Validation

### Success Metrics
- [ ] Public booking URL returns 200
- [ ] Staff API returns data without errors
- [ ] Automation builder saves state
- [ ] No duplicate automation builders in navigation
- [ ] Feature flags hide incomplete features
- [ ] Error boundaries catch and report errors

### Monitoring Dashboard
```javascript
// Add to monitoring service
const metrics = {
  publicBookingSuccess: 0,
  staffApiErrors: 0,
  automationStateLoss: 0,
  featureFlagMisses: 0,
  uncaughtErrors: 0
}
```

---

## Implementation Order

1. **Day 1**: PR-1 (Critical fixes) - Deploy immediately
2. **Day 2**: PR-3 (UI elements) - Quick win
3. **Day 3**: PR-4 (Feature flags) - Hide broken features
4. **Day 4**: PR-2 (Automation consolidation) - Careful testing
5. **Day 5**: PR-5 (Error handling) - Final safety net

---

## Risk Matrix

| PR | Risk | Impact | Mitigation |
|----|------|--------|------------|
| PR-1 | High | Fixes production breaks | Immediate rollback capability |
| PR-2 | Medium | Prevents data loss | LocalStorage backup |
| PR-3 | Low | Improves UX | Feature flag if issues |
| PR-4 | Low | Hides incomplete features | Environment variable control |
| PR-5 | Low | Better error visibility | Can disable if noisy |

---

## Sign-off Checklist

### Before Each PR
- [ ] Code review by senior developer
- [ ] Manual testing in staging
- [ ] Jam video recorded
- [ ] Rollback tested locally
- [ ] Monitoring alerts configured

### After Each PR
- [ ] Production smoke test
- [ ] Error rates monitored for 1 hour
- [ ] User feedback collected
- [ ] Documentation updated
- [ ] Team notified in Slack

---

## Notes

1. All fixes are surgical - no refactoring
2. Each PR < 200 lines of code changes
3. No database migrations required
4. All changes are reversible
5. Feature flags use environment variables for instant toggle

**Total Estimated Time**: 10 hours across 5 PRs
**Risk Level**: Low to Medium (with mitigation)
**Business Impact**: High (fixes critical user-facing issues)

---

_Last Updated: August 2025_
_Document Version: 1.0_
_Author: Atlas Fitness CRM Fixer Agent_