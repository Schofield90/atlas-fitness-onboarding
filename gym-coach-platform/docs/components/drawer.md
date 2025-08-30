# Drawer Component

A slide-out drawer component with overlay, keyboard handling, and accessibility features for displaying panels and menus.

## Usage

```typescript
import { Drawer, DrawerTrigger, DrawerContent, DrawerItem } from '@/components/ui/drawer'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button>Open Drawer</button>
      </DrawerTrigger>
      <DrawerContent title="Settings" side="right">
        <DrawerItem onClick={() => console.log('clicked')}>
          Menu Item 1
        </DrawerItem>
        <DrawerItem>
          Menu Item 2
        </DrawerItem>
      </DrawerContent>
    </Drawer>
  )
}
```

## Components

### Drawer

Main container component that manages state, body scroll prevention, and context.

**Props:**
```typescript
interface DrawerProps {
  open: boolean              // Controls visibility
  onOpenChange: (open: boolean) => void  // State change handler
  children: React.ReactNode  // Trigger and content components
}
```

**Body Scroll Management:**
```typescript
// Prevents background scrolling when drawer is open
React.useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [open])
```

### DrawerTrigger

Button that toggles the drawer visibility.

**Props:**
```typescript
interface DrawerTriggerProps {
  children: React.ReactNode  // Button content or custom element
  asChild?: boolean         // Use child element as trigger
}
```

**Usage with asChild:**
```typescript
<DrawerTrigger asChild>
  <Button>Custom Trigger</Button>
</DrawerTrigger>
```

### DrawerContent

Main drawer panel with header, overlay, and content area.

**Props:**
```typescript
interface DrawerContentProps {
  children: React.ReactNode     // Drawer content items
  className?: string           // Additional CSS classes
  side?: 'left' | 'right'     // Slide direction (default: 'right')
  title?: string              // Optional header title with close button
}
```

**Side Examples:**
```typescript
// Right-side drawer (default)
<DrawerContent side="right" title="Settings">

// Left-side drawer
<DrawerContent side="left" title="Navigation">
```

### DrawerItem

Individual drawer menu item with hover states and click handling.

**Props:**
```typescript
interface DrawerItemProps {
  children: React.ReactNode    // Item content
  onClick?: () => void        // Click handler
  className?: string          // Additional CSS classes
  'data-testid'?: string     // Test identifier
}
```

## Features

### Slide Animation

CSS transform animations for smooth slide transitions:

```css
/* Right-side drawer */
.drawer-right {
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.drawer-right.open {
  transform: translateX(0);
}

/* Left-side drawer */
.drawer-left {
  transform: translateX(-100%);
}

.drawer-left.open {
  transform: translateX(0);
}
```

### Overlay Management

Dark overlay with opacity transitions:

```typescript
<div
  className={cn(
    'fixed inset-0 bg-black/50 transition-opacity',
    open ? 'opacity-100' : 'opacity-0'
  )}
  onClick={handleOverlayClick}
/>
```

### Keyboard Handling

Comprehensive keyboard interaction support:

```typescript
React.useEffect(() => {
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onOpenChange(false)
    }
  }

  if (open) {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }
}, [open, onOpenChange])
```

### Accessibility

Full ARIA compliance with proper dialog roles:

- **Drawer**: `role="dialog"` and `aria-modal="true"`
- **Trigger**: `aria-expanded` state management
- **Close Button**: Screen reader accessible with "Close" label
- **Focus Management**: Traps focus within drawer when open

## Styling

Default Tailwind CSS classes with responsive design:

```css
/* Drawer content styling */
.drawer-content {
  @apply fixed inset-y-0 bg-white shadow-xl w-96 max-w-full;
}

/* Drawer item styling */
.drawer-item {
  @apply w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-b-0;
}

/* Header styling */
.drawer-header {
  @apply flex items-center justify-between border-b border-gray-200 px-4 py-3;
}
```

**Custom Styling:**
```typescript
<DrawerContent className="w-80 bg-gray-50">
  <DrawerItem className="font-semibold text-blue-600 hover:bg-blue-50">
    Custom Styled Item
  </DrawerItem>
</DrawerContent>
```

## Dashboard Implementation

### Notifications Drawer

```typescript
// From components/layout/header.tsx
<Drawer open={showNotifications} onOpenChange={setShowNotifications}>
  <DrawerTrigger asChild>
    <button 
      className="p-2 text-gray-600 hover:text-gray-900 relative"
      aria-label="View notifications"
    >
      <Bell className="w-5 h-5" />
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {unreadCount}
      </span>
    </button>
  </DrawerTrigger>
  <DrawerContent title="Notifications">
    <div className="p-4 border-b">
      <button onClick={handleMarkAllRead} className="text-blue-600 font-medium">
        Mark all read
      </button>
    </div>
    {notifications.map((notification) => (
      <DrawerItem key={notification.id}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{notification.title}</p>
              {notification.unread && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
            </div>
            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
          </div>
        </div>
      </DrawerItem>
    ))}
  </DrawerContent>
</Drawer>
```

### Navigation Drawer

```typescript
<DrawerContent side="left" title="Navigation">
  <DrawerItem onClick={() => router.push('/dashboard')}>
    <Home className="w-4 h-4 mr-3" />
    Dashboard
  </DrawerItem>
  <DrawerItem onClick={() => router.push('/leads')}>
    <Users className="w-4 h-4 mr-3" />
    Leads
  </DrawerItem>
  <DrawerItem onClick={() => router.push('/clients')}>
    <User className="w-4 h-4 mr-3" />
    Clients
  </DrawerItem>
  <div className="border-t border-gray-200 my-2" />
  <DrawerItem onClick={() => router.push('/settings')}>
    <Settings className="w-4 h-4 mr-3" />
    Settings
  </DrawerItem>
</DrawerContent>
```

## Interaction Patterns

### Close on Action

```typescript
const handleItemClick = (action: () => void) => {
  action()
  setOpen(false) // Close drawer after action
}

<DrawerItem onClick={() => handleItemClick(() => console.log('action'))}>
  Action Item
</DrawerItem>
```

### Nested Content

```typescript
<DrawerContent title="Settings">
  <div className="p-4">
    <h3 className="font-semibold mb-3">Account Settings</h3>
    <div className="space-y-2">
      <DrawerItem>Profile Settings</DrawerItem>
      <DrawerItem>Privacy Settings</DrawerItem>
      <DrawerItem>Security Settings</DrawerItem>
    </div>
  </div>
  <div className="p-4 border-t">
    <h3 className="font-semibold mb-3">App Settings</h3>
    <div className="space-y-2">
      <DrawerItem>Notifications</DrawerItem>
      <DrawerItem>Theme</DrawerItem>
    </div>
  </div>
</DrawerContent>
```

### Loading State

```typescript
<DrawerContent title="Notifications">
  {loading ? (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ) : (
    notifications.map(notification => (
      <DrawerItem key={notification.id}>
        {/* notification content */}
      </DrawerItem>
    ))
  )}
</DrawerContent>
```

## Testing

### Unit Test Examples

```typescript
// Test drawer opening
test('opens drawer when trigger is clicked', () => {
  render(<DrawerExample />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

// Test escape key handling
test('closes drawer when escape key is pressed', () => {
  render(<DrawerExample defaultOpen />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

// Test overlay click
test('closes drawer when overlay is clicked', () => {
  render(<DrawerExample defaultOpen />)
  fireEvent.click(screen.getByRole('dialog').parentElement)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

// Test drawer items
test('calls onClick handler when drawer item is clicked', () => {
  const handleClick = jest.fn()
  render(<DrawerItemExample onClick={handleClick} />)
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled()
})
```

### E2E Test Examples

```typescript
// Playwright test
test('notifications drawer workflow', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="notifications-bell"]')
  await expect(page.locator('role=dialog')).toBeVisible()
  
  await page.click('[data-testid="mark-all-read-button"]')
  await expect(page.locator('.toast')).toHaveText(/marked as read/)
  
  // Test close button
  await page.click('[data-testid="drawer-close"]')
  await expect(page.locator('role=dialog')).not.toBeVisible()
})
```

## Performance Considerations

### Portal Rendering

Drawers use React portals for proper layering and event handling:

```typescript
return createPortal(
  <div className="fixed inset-0 z-50">
    {/* Drawer content */}
  </div>,
  document.body
)
```

### Event Listener Management

Proper cleanup prevents memory leaks:

```typescript
React.useEffect(() => {
  if (open) {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }
}, [open])
```

### Animation Performance

CSS transforms for optimal performance:

```css
/* Use transform instead of changing position */
.drawer {
  transform: translateX(100%);
  will-change: transform;
  transition: transform 0.3s ease;
}
```

## Mobile Considerations

### Responsive Width

```typescript
<DrawerContent className="w-full sm:w-96">
  {/* Drawer content */}
</DrawerContent>
```

### Touch Gestures

```typescript
// Future implementation: swipe to close
const handleTouchStart = (e: TouchEvent) => {
  touchStart.current = e.touches[0].clientX
}

const handleTouchMove = (e: TouchEvent) => {
  const currentTouch = e.touches[0].clientX
  const diff = touchStart.current - currentTouch
  
  if (side === 'right' && diff < -50) {
    onOpenChange(false) // Swipe right to close
  }
}
```

## Common Patterns

### Settings Panel

```typescript
<DrawerContent title="Settings" side="right">
  <div className="p-4 space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Theme</label>
      <select className="w-full border rounded px-3 py-2">
        <option>Light</option>
        <option>Dark</option>
      </select>
    </div>
    <div>
      <label className="flex items-center">
        <input type="checkbox" className="mr-2" />
        Enable notifications
      </label>
    </div>
  </div>
</DrawerContent>
```

### Filter Panel

```typescript
<DrawerContent title="Filters" side="left">
  <div className="p-4">
    <h3 className="font-semibold mb-3">Status</h3>
    <div className="space-y-2">
      {['Active', 'Inactive', 'Pending'].map(status => (
        <label key={status} className="flex items-center">
          <input type="checkbox" className="mr-2" />
          {status}
        </label>
      ))}
    </div>
  </div>
</DrawerContent>
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Limitations  

- Fixed positioning may interfere with some CSS transforms
- Body scroll prevention affects entire page (not scoped)
- Animation performance depends on device capabilities
- No built-in swipe gesture support (requires additional implementation)