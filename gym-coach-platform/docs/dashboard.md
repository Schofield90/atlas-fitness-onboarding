# Dashboard User Guide

The dashboard provides a comprehensive interface for managing leads, clients, and integrations with enhanced action capabilities.

## Quick Start

1. Navigate to `/dashboard` after logging in
2. Use the plus button (➕) in the header to create new items
3. Click the notifications bell (🔔) to view and manage notifications
4. Interact with integration cards to manage your connected services

## Dashboard Actions

### Plus Button Menu

The plus button in the header provides quick access to common creation actions:

**Available Actions:**
- **Create Lead** - Opens the lead creation form at `/dashboard/leads?action=new`
- **Create Task** - Coming soon (shows notification when clicked)
- **Schedule Meeting** - Opens meeting scheduling interface

**Usage:**
```typescript
// Plus button automatically handles routing and feedback
onClick={() => router.push('/dashboard/leads?action=new')}
```

**Accessibility:**
- ARIA label: "Create new item"
- Keyboard navigation with Tab and Enter
- Menu closes after selection

### Notifications System

The notifications bell displays real-time updates with unread count badges.

**Features:**
- Red badge showing count of unread notifications
- Right-side drawer with notification list
- Timestamps for each notification
- "Mark all read" functionality

**Notification Structure:**
```typescript
interface Notification {
  id: number
  title: string        // e.g., "New lead assigned"
  message: string      // e.g., "John Doe has been assigned to you"
  time: string        // e.g., "2 minutes ago"
  unread: boolean     // Determines badge count
}
```

**Usage:**
- Click bell icon to open notifications drawer
- Click "Mark all read" to clear unread status
- Press Escape or click outside to close drawer

### Integration Cards

Integration cards provide management interfaces for connected services like WhatsApp, Facebook, and Google Calendar.

**Connected Integration Actions:**
- **Manage Connection** - Redirects to integration settings
- **Disconnect** - Shows confirmation dialog, updates status on success
- **Configure AI** - Platform-specific AI configuration (WhatsApp shows "Coming soon")
- **Send Test** - Available for WhatsApp with phone number validation

**Disconnected Integration Actions:**
- **Connect** - Redirects to connection setup

**Status Indicators:**
- ✅ Green checkmark for connected integrations
- ❌ Red X for disconnected integrations

## Component Integration

### Toast Notifications

All dashboard actions provide user feedback through toast notifications:

```typescript
// Success feedback
toast.success('Lead created successfully')

// Info feedback  
toast('Redirecting to integration settings...')

// Error handling
toast.error('Failed to disconnect integration')
```

### Loading States

Asynchronous operations display loading indicators:

```typescript
// Button loading state
<Button disabled={isLoading}>
  {isLoading ? <Loader2 className="animate-spin" /> : <Icon />}
  Action Text
</Button>
```

## Accessibility Features

### Keyboard Navigation
- Tab navigation through all interactive elements
- Enter key activates buttons and menu items
- Escape key closes modals and drawers
- Focus management preserves user context

### Screen Reader Support
- Descriptive ARIA labels on all interactive elements
- Role attributes for complex components (dialog, menu, menuitem)
- Status announcements via toast notifications

### ARIA Labels
```typescript
// Plus button
aria-label="Create new item"

// Notifications bell  
aria-label="View notifications"

// Integration buttons
aria-label="Manage WhatsApp connection"
```

## Technical Implementation

### State Management
Dashboard components use React state with proper cleanup:

```typescript
const [showNotifications, setShowNotifications] = useState(false)
const [isLoading, setIsLoading] = useState(false)
```

### Click Outside Handling
Custom hook provides consistent behavior:

```typescript
const ref = useClickOutside<HTMLDivElement>(() => setShowMenu(false))
```

### Error Boundaries
Components include error handling for network failures and validation errors.

## Testing Coverage

### Unit Tests
- Header component: 18 test cases covering plus button and notifications
- Integration cards: 22 test cases covering all button interactions
- Mock implementations for router and toast notifications

### E2E Tests  
- Complete user interaction flows across desktop and mobile
- Multi-browser testing (Chromium, Firefox, Safari)
- Performance and accessibility validation

### Test Commands
```bash
# Run unit tests
npm run test

# Run E2E tests  
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Known Limitations

### Stub Implementations
- Task creation feature is coming soon
- WhatsApp AI configuration is in development
- Meeting scheduling opens placeholder modal
- Notifications use mock data (backend integration pending)

### Development Notes
- All API calls in integration cards are currently simulated with timeouts
- Phone number validation in WhatsApp test uses hardcoded value
- Confirmation dialogs use browser `window.confirm` (custom modal planned)

## Troubleshooting

### Common Issues

**Plus button menu doesn't open:**
- Ensure click event handlers are properly attached
- Check for JavaScript errors in browser console
- Verify Popover component is rendered correctly

**Notifications drawer appears empty:**
- Mock data should display 3 sample notifications
- Check notifications array in header component
- Verify Drawer component rendering

**Integration buttons not responding:**
- Confirm toast notification system is initialized
- Check for network errors if using real API endpoints
- Verify button disabled states during loading

**Toast notifications not appearing:**
- Ensure react-hot-toast is properly imported and configured
- Check for CSS conflicts affecting toast positioning
- Verify toast provider is wrapped around app components

## Future Enhancements

### High Priority
- Connect notifications to real-time backend WebSocket
- Implement actual task creation workflow
- Replace browser confirm dialogs with custom modals
- Add keyboard shortcuts for power users

### Medium Priority  
- Customizable notification preferences
- Bulk operations for integration management
- Performance monitoring and analytics
- Internationalization support

### Nice to Have
- Subtle animations for better UX
- Advanced filtering in notifications drawer
- Drag-and-drop reordering of integration cards
- Dark mode support

## Related Documentation

- [Component Documentation](./components/) - Technical details for UI components
- [API Documentation](./api.md) - Backend integration details  
- [Testing Guide](./testing.md) - Comprehensive testing information
- [Accessibility Guide](./accessibility.md) - WCAG compliance details