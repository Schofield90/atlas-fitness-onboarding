# Staff Management Guide

The staff management module provides graceful fallback handling and clear expectations for development vs production environments.

## Quick Start

Navigate to `/staff` to access team management with fallback support for API failures.

## Development vs Production Expectations

### Development Environment
- **API Failures**: Automatically shows demo staff data
- **Fallback Enabled**: `staffFallback` feature flag defaults to `true`
- **Demo Data**: Shows placeholder staff member with realistic details
- **Toast Notification**: "Unable to load staff - showing demo data"
- **Full Functionality**: All features work with mock data for testing

### Production Environment  
- **API Failures**: Shows error state with retry functionality
- **No Fallback**: Real data only, no demo placeholders
- **Error Recovery**: Clear error messages with actionable steps
- **Support Integration**: Direct path to resolve data issues
- **Security**: No mock data exposure in live environments

## Fallback System

### How Fallbacks Work

When staff API fetch fails, the system follows this logic:

1. **Primary Flow**: Attempts to fetch from `organization_staff` table
2. **Error Detection**: Catches API failures and authentication issues
3. **Feature Flag Check**: Evaluates `isFeatureEnabled('staffFallback')`
4. **Fallback Execution**: Shows demo data if flag enabled
5. **Error State**: Shows retry interface if fallback disabled

### Demo Staff Data

```typescript
{
  id: 'placeholder-1',
  user_id: 'placeholder',
  phone_number: '+44 7123 456789',
  email: 'demo@example.com',
  is_available: true,
  receives_calls: true,
  receives_sms: true,
  receives_whatsapp: false,
  receives_emails: true,
  routing_priority: 1,
  role: 'manager',
  location_access: { all_locations: true }
}
```

## Staff Management Features

### Adding Staff
- **Invite Staff**: Send email invitations with role assignment
- **Add Manually**: Direct addition to organization staff table
- **Role Options**: Owner, Manager, Staff, Trainer
- **Contact Info**: Email and phone number capture
- **Hourly Rate**: Optional wage configuration

### Staff Display
- **Availability Status**: Green (Available) / Red (Unavailable)
- **Contact Methods**: Visual badges for calls, SMS, WhatsApp, email
- **Location Access**: Shows "All Locations" or manage button
- **Profile Display**: Avatar with email initial and role

### Permissions System
- **Communication Routing**: Controls message/call distribution
- **Location Access**: Granular location-based permissions
- **Priority Settings**: Routing priority for round-robin systems
- **Availability Toggle**: On/off duty status management

## Feature Flags

### `staffFallback`
- **Default**: `true` 
- **Purpose**: Enables demo data when API fails
- **Environment**: Only active in development mode
- **Effect**: Shows placeholder staff vs error state

## Error States

### API Failure (Fallback Enabled)
- **Display**: Demo staff member card
- **Toast**: "Unable to load staff - showing demo data"
- **Functionality**: Full features available for testing
- **Visual Indicator**: No special marking (seamless experience)

### API Failure (Fallback Disabled)
- **Display**: Error icon with warning message
- **Message**: "Unable to load staff - There was an issue fetching your staff members"
- **Action**: "Try Again" button to retry API call
- **Recovery**: Clear path to resolve issue

### Empty State
- **Display**: User icon with guidance message
- **Message**: "No staff members yet"  
- **Guidance**: "Click 'Invite Staff' or 'Add Manually' to get started"
- **Actions**: Direct buttons to add staff

### Loading State
- **Display**: Animated spinner (orange border)
- **Duration**: Shows while API call in progress
- **No Text**: Clean loading experience

## What to Expect

### In Development
- **Seamless Testing**: API failures don't block development
- **Demo Data**: Realistic placeholder for UI/UX testing  
- **Full Features**: All functionality works with mock data
- **Clear Indication**: Toast notification clarifies demo mode
- **Easy Recovery**: Refresh to retry real API

### In Production
- **Real Data Only**: No demo data fallbacks
- **Clear Errors**: Actionable error messages for users
- **Retry Functionality**: Users can attempt to reload
- **Support Path**: Clear escalation for persistent issues
- **Security**: No mock data exposure

### Staff Operations
- **Role-Based Access**: Different permissions per role type
- **Communication Routing**: Smart distribution of messages/calls
- **Location Management**: Multi-location support with access controls
- **Availability Tracking**: Real-time on/off duty status

## Troubleshooting

### Demo Data Showing in Production
1. Check `NODE_ENV` environment variable
2. Verify `staffFallback` feature flag setting
3. Confirm production environment configuration
4. Check organization staff table permissions

### Unable to Add Staff
1. Verify organization permissions
2. Check API endpoint availability
3. Validate email format requirements
4. Ensure proper authentication token

### Missing Staff Members
1. Check organization_staff table data
2. Verify organization ID context
3. Confirm user permissions for staff view
4. Check database connection health

### Location Access Issues
1. Verify organization locations exist
2. Check staff location_access field
3. Confirm location permissions setup
4. Validate location management API

### Communication Routing Problems
1. Check receives_calls/sms/whatsapp/emails flags
2. Verify routing_priority settings
3. Confirm availability status
4. Test communication endpoint configuration