# Marketing & Campaigns Guide

The marketing module provides comprehensive campaign management with feature flag gating for view and edit functionality.

## Quick Start

Navigate to `/campaigns` to access marketing campaigns with mock data and feature-flag-controlled functionality.

## View Modal and Edit Gating

### Feature Flag Controls

#### `campaignsActions`
- **Default**: `false`
- **Purpose**: Controls edit/delete button functionality 
- **Gated Actions**: Campaign editing, updating, and deletion
- **User Feedback**: Shows "Campaign editing coming soon!" toast when disabled

#### `campaignsCreate`
- **Default**: `false`
- **Purpose**: Controls campaign creation functionality
- **Gated Actions**: New campaign creation workflow
- **User Feedback**: Shows "Campaign creation is coming soon!" toast when disabled

### View Functionality (Always Available)

#### Campaign Overview
- **View Access**: Eye icon button always functional regardless of feature flags
- **Analytics Navigation**: Clicking view button sets `selectedCampaign` and switches to analytics tab
- **Data Display**: Shows campaign metrics, performance data, and visual charts
- **No Restrictions**: Full read-only access to campaign data

### Edit Functionality (Gated)

#### Edit Button Logic
```typescript
onClick={() => {
  if (!isFeatureEnabled('campaignsActions')) {
    toast.info('Campaign editing coming soon!')
    return
  }
  // Proceed with edit functionality
}}
```

#### Edit Flow When Enabled
1. **Pre-fill Form**: Populates campaign data into creation form
2. **Set Context**: `setSelectedCampaign(campaign)` identifies edit mode
3. **Navigate**: Switches to 'create' tab with edit context
4. **Visual Feedback**: Shows "Editing [Campaign Name]" toast
5. **Form Updates**: "Create Campaign" button becomes "Update Campaign"

#### Edit Flow When Disabled
1. **Button Available**: Edit icon remains visible (no UI hiding)
2. **Toast Feedback**: Shows informative message about feature availability
3. **No Navigation**: Stays on current tab/view
4. **User Experience**: Clear indication feature is coming soon

## Campaign Management Features

### Campaign Types Supported
- **Facebook & Instagram Ads**: Targeted advertising with budget management
- **Email Marketing**: Template-based campaigns with content editor
- **Instagram Content**: Feed posts, stories, and reels

### Campaign Analytics
- **Performance Metrics**: Leads, clicks, impressions, conversions
- **Budget Tracking**: Spend monitoring with visual progress bars
- **ROI Calculations**: Cost per lead and conversion tracking
- **Real-time Updates**: Live data synchronization

### Mock Data Integration
- **Realistic Data**: 3 sample campaigns with varied performance metrics
- **Full Functionality**: All features work with mock data for testing
- **No Backend Required**: Complete frontend experience without API dependencies

## User Experience Design

### Coming Soon Banner
- **Visibility**: Shows when `campaignsActions` is disabled
- **Message**: "This module is currently in development. You can view mock data but creation and editing features are coming soon."
- **Styling**: Prominent banner to set expectations
- **Variant**: Uses 'banner' style ComingSoon component

### Button States
- **Always Visible**: No buttons are hidden based on feature flags
- **Interactive Feedback**: Toast notifications explain feature availability
- **Consistent UX**: Same button appearance regardless of flag state
- **Clear Communication**: Users understand what's available and what's coming

### Toast Notification System
- **Edit Attempts**: "Campaign editing coming soon!"
- **Create Attempts**: "Campaign creation is coming soon!"  
- **Success States**: "Campaign updated successfully!"
- **Info Messages**: "Editing [Campaign Name]"

## What to Expect

### When `campaignsActions` Enabled
- **Full Edit Capability**: Complete campaign modification functionality
- **Form Pre-population**: Existing campaign data loads into forms
- **Update Operations**: Save changes to campaign configuration
- **Delete Operations**: Remove campaigns with confirmation dialogs

### When `campaignsActions` Disabled (Default)
- **View-Only Mode**: Full read access to campaign data and analytics
- **Button Feedback**: Edit buttons show "coming soon" messages
- **Mock Data Interaction**: All viewing features work with sample data
- **Feature Awareness**: Clear communication about upcoming functionality

### Analytics Tab
- **Always Available**: No feature flag restrictions on analytics viewing
- **Campaign Selection**: Set via view button click on campaigns table
- **Rich Visualizations**: Charts, graphs, and performance indicators
- **Data Export**: Performance data download capabilities

## Troubleshooting

### Edit Button Not Working
1. Check `campaignsActions` feature flag setting
2. Look for toast notification indicating feature status
3. Verify campaign data is properly loaded
4. Confirm user has necessary permissions

### Campaign Creation Failing
1. Verify `campaignsCreate` feature flag is enabled
2. Check form validation requirements (campaign name required)
3. Ensure selected campaign type is supported
4. Confirm mock data integration is functioning

### Analytics Not Loading
1. Verify campaign is selected via eye icon button
2. Check console for JavaScript errors
3. Confirm `selectedCampaign` state is set
4. Verify CampaignAnalytics component is imported

### Toast Notifications Missing
1. Check toast provider initialization
2. Verify useToast hook is properly imported
3. Ensure client-side rendering is enabled
4. Confirm feature flag values are being read correctly

### Mock Data Not Displaying
1. Verify mockCampaigns array is properly defined
2. Check component mounting state
3. Confirm data mapping in table rendering
4. Validate campaign status badge rendering logic