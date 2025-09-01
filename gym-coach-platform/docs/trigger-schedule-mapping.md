# Schedule Trigger Implementation Mapping

## Current State Analysis

### 1. Schedule Trigger Location
**File**: `/Users/samschofield/atlas-fitness-onboarding/gym-coach-platform/components/automations/AutomationBuilder.tsx`
- **Lines 33**: Schedule trigger defined in `triggerTypes` array
- **Lines 242-248**: Schedule trigger falls through to `GenericTriggerConfig` (not implemented)
- **Problem**: Shows "Trigger Type" placeholder with "Configuration Coming Soon" message

### 2. Automation Builder Architecture
**Main Component**: `AutomationBuilder.tsx`
- Uses `GenericTriggerConfig` for unsupported triggers (lines 37-96)
- Has working example: `FormSubmittedTriggerConfig.tsx` (imported line 8)
- **Pattern**: Trigger configs are separate components with standardized interface:
  ```typescript
  interface TriggerConfigProps {
    value?: any
    onChange?: (data: any) => void
    onSave?: () => void
    onCancel?: () => void
  }
  ```

### 3. Database Schema
**Table**: `workflows` (from `database.types.ts`)
```typescript
{
  trigger_type: 'webhook' | 'schedule' | 'event'
  trigger_config: Json  // Schedule configuration will be stored here
  // ... other fields
}
```

### 4. Existing Date/Time Infrastructure
**Available Libraries**:
- `moment`: Used in `BookingCalendar.tsx` (line 4, 14)
- `date-fns`: Available in package.json (line 48)
- `react-big-calendar`: Used for calendar UI (line 4 in BookingCalendar.tsx)

**Existing Time Components**:
- Basic HTML time inputs in calendar settings (lines 468, 469 in `calendar/page.tsx`)
- Timezone selector dropdown (lines 475-480 in `calendar/page.tsx`)
- **No dedicated date/time picker components found**

### 5. Timezone Configuration
**Location**: `/Users/samschofield/atlas-fitness-onboarding/gym-coach-platform/app/dashboard/calendar/page.tsx`
- **Lines 475-480**: Hardcoded timezone selector
- **Default**: "GMT (London)" suggests Europe/London timezone
- **Organization Settings**: Timezone likely stored in `organizations.settings` JSON field

### 6. Existing Job/Scheduling Infrastructure
**File**: `/Users/samschofield/atlas-fitness-onboarding/gym-coach-platform/lib/jobs/lead-qualification-job.ts`
- **Architecture**: Custom job scheduler using `setInterval`
- **Pattern**: Job classes with start/stop/config methods
- **No cron job infrastructure** - uses simple interval timing

## Implementation Plan

### 1. Create ScheduleTriggerConfig Component
**New File**: `/Users/samschofield/atlas-fitness-onboarding/gym-coach-platform/components/automations/ScheduleTriggerConfig.tsx`

**Required Interface**:
```typescript
interface ScheduleConfig {
  scheduleType: 'one-time' | 'daily' | 'weekly'
  datetime?: string  // ISO string for one-time
  time?: string      // HH:MM for recurring
  dayOfWeek?: number // 0-6 for weekly (0=Sunday)
  timezone?: string  // e.g., 'Europe/London'
}
```

### 2. Integration Points
**AutomationBuilder.tsx modifications**:
- **Line 8**: Add import for `ScheduleTriggerConfig`
- **Lines 242-248**: Replace `GenericTriggerConfig` condition to handle `'schedule'` case
- **Pattern**: Follow `FormSubmittedTriggerConfig` integration example (lines 229-241)

### 3. Date/Time Widget Requirements
**Need to Build**:
- Date picker component (using HTML date input or custom)
- Time picker component (using HTML time input)
- Day of week selector for weekly schedules
- Timezone selector (can reuse from calendar settings)

**Reusable Components from Calendar**:
- Time input pattern from lines 468-469 in `calendar/page.tsx`
- Timezone selector from lines 475-480 in `calendar/page.tsx`

### 4. Schedule Execution Infrastructure
**Current**: No schedule executor exists
**Need to Build**:
- Schedule evaluation engine
- Next run time calculation
- Timezone-aware scheduling
- Integration with existing workflow execution system

### 5. Data Storage
**workflows.trigger_config** will store:
```json
{
  "scheduleType": "daily|weekly|one-time",
  "datetime": "2024-01-15T10:30:00Z",  // for one-time
  "time": "10:30",                      // for recurring
  "dayOfWeek": 1,                       // for weekly
  "timezone": "Europe/London"
}
```

### 6. Validation & Preview
**Required Features**:
- Form validation for required fields
- "Next run" time preview
- Timezone conversion display
- Invalid time handling (past dates for one-time)

## Risk Assessment

### Low Risk
- Reusing existing UI components (Input, Select, Card, Button)
- Following established trigger config pattern
- Using existing database schema (trigger_config JSON field)

### Medium Risk
- **No existing date/time picker**: Need to build or import library
- **Timezone handling**: Need robust timezone conversion logic
- **Form validation**: Complex validation rules for different schedule types

### High Risk
- **No schedule execution engine**: Major infrastructure component missing
- **Database triggers**: May need database-level scheduling or background jobs
- **Timezone edge cases**: DST transitions, leap years, invalid times

## Minimal Touch Implementation Path

### Phase 1: UI Component Only
1. Create `ScheduleTriggerConfig.tsx` with basic form
2. Update `AutomationBuilder.tsx` to use new component
3. Store configuration in `trigger_config` (no execution yet)
4. Add validation and "Next run" preview

### Phase 2: Execution Engine
1. Build schedule evaluation service
2. Add background job runner
3. Integrate with existing workflow execution
4. Add proper error handling and logging

## Dependencies

### Required Libraries (Already Available)
- `date-fns` or `moment` for date manipulation
- `@radix-ui/react-select` for dropdowns
- Existing UI components

### Optional Enhancements
- `@radix-ui/react-calendar` for better date picking
- `cron` library for cron expression support
- `luxon` for advanced timezone handling

## File Structure

```
components/automations/
├── AutomationBuilder.tsx           # Update trigger routing
├── FormSubmittedTriggerConfig.tsx  # Reference implementation
└── ScheduleTriggerConfig.tsx       # NEW: Schedule configuration

lib/
├── jobs/
│   ├── lead-qualification-job.ts   # Reference job implementation
│   └── schedule-executor.ts        # NEW: Schedule evaluation engine
└── utils/
    └── schedule-utils.ts           # NEW: Date/time utilities

docs/
└── trigger-schedule-mapping.md     # THIS FILE
```

## Next Steps

1. **Create ScheduleTriggerConfig component** following FormSubmittedTriggerConfig pattern
2. **Update AutomationBuilder** to route schedule triggers to new component
3. **Add date/time picker widgets** using HTML inputs or custom components
4. **Implement validation and preview** for schedule configurations
5. **Build schedule executor** as separate phase for actual automation execution