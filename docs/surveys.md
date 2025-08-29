# Surveys & Feedback Guide

The surveys module provides comprehensive survey management with analytics integration, waitlist CTAs, and feature-gated row actions.

## Quick Start

Navigate to `/surveys` to access survey management with mock data and feature-controlled functionality.

## Analytics Integration

### Demo Badge System
- **Visual Indicator**: Yellow warning badge on analytics tab when using mock data
- **Read-only Preview**: Clear indication when viewing sample surveys
- **Coming Soon Messages**: Professional messaging for unavailable features

### SurveyAnalytics Component
- **Real-time Charts**: Interactive visualizations when enabled
- **Mock Data Support**: Sample analytics for development and testing
- **Performance Metrics**: Completion rates, response counts, average ratings
- **Export Capabilities**: Data download functionality when feature flags allow

### Analytics Tab Behavior
- **Always Accessible**: No feature flag restrictions on viewing analytics
- **Survey Selection**: Context set via eye icon button from surveys table
- **Rich Visualizations**: Charts, graphs, and performance indicators
- **Demo Data Indicators**: Clear labeling when showing sample data

## Waitlist CTA Integration

### When Survey Creation Disabled
```typescript
if (!isFeatureEnabled('surveysCreate')) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <ClipboardListIcon className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Survey Creation Coming Soon</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">
        Build custom surveys with multiple question types, templates, and advanced logic to gather valuable member feedback.
      </p>
      <button onClick={() => setShowWaitlistModal(true)}>
        Join Early Access Waitlist
      </button>
    </div>
  )
}
```

### Waitlist Modal Features
- **Email Collection**: Capture user email for notifications
- **Feedback Input**: Understand user needs and survey requirements
- **Professional Messaging**: Set appropriate expectations
- **Success Feedback**: Thank you message with notification promise

### Early Access Benefits
- **Priority Access**: First notification when features become available
- **Feature Influence**: User input helps shape survey creation tools
- **Professional Image**: Shows active development and user focus

## Row Actions System

### Feature Flag Controls

#### `surveysActions` 
- **Default**: `false`
- **Controls**: Edit, Delete, Send button functionality
- **User Feedback**: Toast notifications when features disabled

### Action Button Logic

#### Edit Button
```typescript
<button 
  onClick={() => {
    if (!isFeatureEnabled('surveysActions')) {
      toast.info('Survey editing coming soon!')
      return
    }
    toast.info(`Edit survey: ${survey.title}`)
  }}
  className="text-gray-400 hover:text-white disabled:opacity-50"
  title={isFeatureEnabled('surveysActions') ? "Edit Survey" : "Coming soon"}
  disabled={!isFeatureEnabled('surveysActions')}
>
  <EditIcon className="h-4 w-4" />
</button>
```

#### Send Button
```typescript
<button 
  onClick={() => {
    if (!isFeatureEnabled('surveysActions')) {
      toast.error('Survey sending coming soon!')
      return
    }
  }}
  className="text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={!isFeatureEnabled('surveysActions')}
>
  <SendIcon className="h-4 w-4" />
</button>
```

### Always Available Actions

#### View Button (Eye Icon)
- **No Feature Flag**: Always functional regardless of settings
- **Modal Display**: Shows survey details in read-only mode
- **Analytics Navigation**: Links to response analysis
- **Preview Mode**: Clear indication of read-only access

#### Delete Button
- **Always Enabled**: No feature flag restrictions
- **Confirmation Dialog**: Prevents accidental deletions
- **Immediate Feedback**: Confirmation of successful deletion

## Survey Management Features

### Survey Types
- **Fitness Assessment**: Member goals and objectives evaluation
- **Feedback**: Service and class feedback collection  
- **Satisfaction**: Overall experience measurement
- **Onboarding**: New member welcome surveys

### Survey Status System
- **Active**: Currently collecting responses (green badge)
- **Completed**: Finished data collection (blue badge)
- **Draft**: Unpublished survey (grey badge)
- **Paused**: Temporarily stopped (yellow badge)

### Mock Data Integration
- **4 Sample Surveys**: Varied types and performance metrics
- **Realistic Completion Rates**: 73.4% to 95.8% completion rates
- **Response Counts**: From 0 (draft) to 124 (completed) responses
- **Full UI Testing**: All interface elements work with sample data

## Feature Flag Configuration

### `surveysCreate`
- **Default**: `false`
- **Purpose**: Controls survey creation tab functionality
- **Alternative**: Shows waitlist CTA when disabled

### `surveysActions`
- **Default**: `false`
- **Purpose**: Controls edit, send, and management actions
- **Alternative**: Shows "coming soon" toast messages

### `surveysResponses`
- **Default**: `false`  
- **Purpose**: Controls response viewing functionality
- **Alternative**: Shows "Response Analysis Coming Soon" message

### `surveysAnalytics`
- **Default**: `false`
- **Purpose**: Controls analytics tab functionality
- **Alternative**: Shows demo badge and limited functionality

## What to Expect

### When Feature Flags Enabled
- **Full Functionality**: Complete survey creation, editing, and management
- **Real Analytics**: Live data visualization and export capabilities
- **Response Management**: Individual response viewing and analysis
- **Send Capabilities**: Distribution to member segments

### When Feature Flags Disabled (Default)
- **View-Only Access**: Read survey details and mock analytics
- **Professional Messaging**: Clear communication about feature availability  
- **Waitlist Integration**: Capture user interest for early access
- **Mock Data Experience**: Full UI testing with sample surveys

### Coming Soon Features
- **Survey Builder**: Drag-and-drop question creation
- **Template Library**: Pre-built survey templates
- **Response Analytics**: Individual response viewing and filtering
- **Member Segmentation**: Targeted survey distribution
- **Automated Follow-ups**: Response-triggered workflows

## Troubleshooting

### Analytics Tab Not Loading
1. Check if survey is selected via eye icon
2. Verify SurveyAnalytics component is imported
3. Confirm selectedSurvey state is properly set
4. Check for console errors in browser

### Waitlist Modal Not Appearing
1. Verify `surveysCreate` feature flag is disabled
2. Check modal state management (showWaitlistModal)
3. Confirm button click handler is properly connected
4. Ensure modal backdrop and z-index are correct

### Row Actions Not Working
1. Check `surveysActions` feature flag setting
2. Look for toast notifications indicating status
3. Verify button disabled states match feature flags
4. Confirm onClick handlers include feature flag checks

### Mock Data Missing
1. Verify mockSurveys array is properly imported
2. Check data mapping in table rendering
3. Confirm survey status badge function works
4. Validate type icon rendering logic

### Toast Notifications Missing
1. Check useToast hook initialization
2. Verify toast provider is properly configured
3. Ensure feature flag functions are working
4. Confirm client-side rendering for toast library