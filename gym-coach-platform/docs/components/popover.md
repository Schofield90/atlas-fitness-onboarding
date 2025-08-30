# Popover Component

A flexible popover component with positioning logic, click-outside handling, and accessibility features.

## Usage

```typescript
import { Popover, PopoverTrigger, PopoverContent, PopoverItem } from '@/components/ui/popover'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button>Open Menu</button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverItem onClick={() => console.log('clicked')}>
          Menu Item 1
        </PopoverItem>
        <PopoverItem disabled>
          Disabled Item
        </PopoverItem>
      </PopoverContent>
    </Popover>
  )
}
```

## Components

### Popover

Main container component that manages state and context.

**Props:**
```typescript
interface PopoverProps {
  open: boolean              // Controls visibility
  onOpenChange: (open: boolean) => void  // State change handler
  children: React.ReactNode  // Trigger and content components
}
```

### PopoverTrigger

Button that toggles the popover visibility.

**Props:**
```typescript
interface PopoverTriggerProps {
  children: React.ReactNode  // Button content or custom element
  asChild?: boolean         // Use child element as trigger
}
```

**Usage with asChild:**
```typescript
<PopoverTrigger asChild>
  <Button>Custom Trigger</Button>
</PopoverTrigger>
```

### PopoverContent

Container for popover menu items with automatic positioning.

**Props:**
```typescript
interface PopoverContentProps {
  children: React.ReactNode     // Menu items
  className?: string           // Additional CSS classes
  align?: 'start' | 'center' | 'end'  // Horizontal alignment (default: 'center')
  side?: 'top' | 'right' | 'bottom' | 'left'  // Positioning side (default: 'bottom')
}
```

**Positioning Examples:**
```typescript
// Right-aligned menu
<PopoverContent align="end" side="bottom">

// Top-positioned menu  
<PopoverContent align="center" side="top">

// Left-side menu
<PopoverContent align="start" side="left">
```

### PopoverItem

Individual menu item with hover states and click handling.

**Props:**
```typescript
interface PopoverItemProps {
  children: React.ReactNode    // Item content
  onClick?: () => void        // Click handler
  disabled?: boolean          // Disabled state
  className?: string          // Additional CSS classes  
  'data-testid'?: string     // Test identifier
}
```

## Features

### Automatic Positioning

The popover calculates optimal positioning based on trigger element:

```typescript
// Positioning logic excerpts
const triggerRect = triggerRef.current.getBoundingClientRect()
const contentRect = contentRef.current.getBoundingClientRect()

// Bottom positioning with end alignment
if (side === 'bottom') {
  top = triggerRect.bottom + window.scrollY + 4
}
if (align === 'end') {
  left = triggerRect.right + window.scrollX - contentRect.width
}
```

### Click Outside Handling

Automatically closes when clicking outside the popover:

```typescript
const handleClickOutside = (event: MouseEvent) => {
  if (
    contentRef.current &&
    triggerRef.current &&
    !contentRef.current.contains(event.target as Node) &&
    !triggerRef.current.contains(event.target as Node)
  ) {
    onOpenChange(false)
  }
}
```

### Accessibility

Full ARIA compliance with proper roles and labels:

- **Trigger**: `aria-expanded` and `aria-haspopup` attributes
- **Content**: `role="menu"` for screen readers
- **Items**: `role="menuitem"` for proper navigation
- **Keyboard**: Tab navigation and Enter activation

## Styling

Default Tailwind CSS classes with customization options:

```css
/* Popover content default styling */
.popover-content {
  @apply fixed z-50 min-w-32 rounded-md border border-gray-200 bg-white p-1 shadow-lg;
}

/* Popover item default styling */  
.popover-item {
  @apply flex w-full items-center rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**Custom Styling:**
```typescript
<PopoverContent className="w-64 p-4">
  <PopoverItem className="font-semibold text-blue-600">
    Custom Styled Item
  </PopoverItem>
</PopoverContent>
```

## Dashboard Implementation

### Plus Button Menu

```typescript
// From components/layout/header.tsx
<Popover open={showPlusMenu} onOpenChange={setShowPlusMenu}>
  <PopoverTrigger asChild>
    <button 
      className="p-2 text-gray-600 hover:text-gray-900"
      aria-label="Create new item"
    >
      <Plus className="w-5 h-5" />
    </button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-48">
    <PopoverItem onClick={handleCreateLead}>
      <User className="w-4 h-4 mr-2" />
      Create lead
    </PopoverItem>
    <PopoverItem onClick={handleCreateTask} disabled>
      <ClipboardList className="w-4 h-4 mr-2" />
      Create task
      <span className="ml-auto text-xs text-gray-400">(Coming soon)</span>
    </PopoverItem>
  </PopoverContent>
</Popover>
```

### Menu Item Patterns

**With Icons:**
```typescript
<PopoverItem onClick={handleAction}>
  <Icon className="w-4 h-4 mr-2" />
  Action Text
</PopoverItem>
```

**Disabled Items:**
```typescript
<PopoverItem disabled className="opacity-50 cursor-not-allowed">
  Coming Soon Feature
  <span className="ml-auto text-xs text-gray-400">(Coming soon)</span>
</PopoverItem>
```

**With Keyboard Shortcuts:**
```typescript
<PopoverItem onClick={handleSave}>
  Save Document
  <span className="ml-auto text-xs text-gray-400">⌘S</span>
</PopoverItem>
```

## Testing

### Unit Test Examples

```typescript
// Test popover opening
test('opens popover when trigger is clicked', () => {
  render(<PopoverExample />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('menu')).toBeInTheDocument()
})

// Test menu item interaction
test('calls onClick handler when menu item is clicked', () => {
  const handleClick = jest.fn()
  render(<PopoverItemExample onClick={handleClick} />)
  fireEvent.click(screen.getByRole('menuitem'))
  expect(handleClick).toHaveBeenCalled()
})

// Test click outside behavior
test('closes popover when clicking outside', () => {
  render(<PopoverExample />)
  fireEvent.click(screen.getByRole('button')) // Open
  fireEvent.mouseDown(document.body) // Click outside
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})
```

### E2E Test Examples

```typescript
// Playwright test
test('plus button menu workflow', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="plus-button"]')
  await expect(page.locator('role=menu')).toBeVisible()
  
  await page.click('[data-testid="create-lead-option"]')
  await expect(page).toHaveURL('/dashboard/leads?action=new')
})
```

## Performance Considerations

### Portal Rendering

Popovers use React portals for proper z-index layering:

```typescript
return createPortal(
  <div className="fixed z-50">
    {children}
  </div>,
  document.body
)
```

### Event Listener Cleanup

Proper event listener management prevents memory leaks:

```typescript
React.useEffect(() => {
  if (open) {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }
}, [open])
```

## Common Patterns

### Confirmation Popover

```typescript
<Popover open={showConfirm} onOpenChange={setShowConfirm}>
  <PopoverTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="p-3">
      <p className="text-sm mb-3">Are you sure you want to delete?</p>
      <div className="flex space-x-2">
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
          Cancel  
        </Button>
      </div>
    </div>
  </PopoverContent>
</Popover>
```

### Settings Menu

```typescript
<PopoverContent>
  <PopoverItem onClick={() => setTheme('light')}>
    <Sun className="w-4 h-4 mr-2" />
    Light Theme
  </PopoverItem>
  <PopoverItem onClick={() => setTheme('dark')}>
    <Moon className="w-4 h-4 mr-2" />  
    Dark Theme
  </PopoverItem>
  <div className="border-t border-gray-200 my-1" />
  <PopoverItem onClick={handleLogout}>
    <LogOut className="w-4 h-4 mr-2" />
    Sign Out
  </PopoverItem>
</PopoverContent>
```

## Browser Support

- Chrome 60+
- Firefox 55+  
- Safari 12+
- Edge 79+

## Limitations

- No built-in arrow/pointer (can be added via CSS)
- Position calculation assumes static document structure
- No collision detection (manual boundary checking required)
- Portal rendering may affect CSS containment