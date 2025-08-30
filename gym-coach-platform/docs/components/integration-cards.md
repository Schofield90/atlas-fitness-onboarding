# Integration Cards Component

A comprehensive card component system for managing third-party service integrations with status-dependent actions and user feedback.

## Usage

```typescript
import { IntegrationCard } from '@/components/dashboard/integration-cards'

function MyDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <IntegrationCard
        name="WhatsApp"
        status="connected"
        icon={<WhatsAppIcon />}
        description="Send automated messages and handle customer inquiries"
      />
      <IntegrationCard
        name="Facebook"
        status="disconnected"
        icon={<FacebookIcon />}
        description="Sync leads from Facebook advertising campaigns"
      />
    </div>
  )
}
```

## Component Interface

### IntegrationCard Props

```typescript
interface IntegrationCardProps {
  name: string                              // Integration service name
  status: 'connected' | 'disconnected'     // Current connection status
  icon: React.ReactNode                     // Service icon or logo
  description?: string                      // Optional service description
}
```

## Features Overview

### Status-Dependent Actions

The component displays different button sets based on connection status:

**Connected Status:**
- Manage Connection
- Disconnect  
- Configure AI
- Send Test (WhatsApp only)

**Disconnected Status:**
- Connect [Service Name]

### Visual Status Indicators

**Connected:**
```typescript
<CheckCircle className="w-4 h-4 text-green-500 mr-1" />
<span className="text-sm text-green-600">Connected</span>
```

**Disconnected:**
```typescript  
<XCircle className="w-4 h-4 text-red-500 mr-1" />
<span className="text-sm text-red-600">Disconnected</span>
```

## Action Handlers

### Manage Connection

Routes to integration-specific settings page:

```typescript
const handleManageConnection = () => {
  toast('Redirecting to integration settings...')
  // Production implementation:
  // router.push(`/integrations/${name.toLowerCase()}`)
}
```

**Usage Pattern:**
- Shows loading toast notification
- Redirects to service-specific configuration page
- Available for both connected and disconnected integrations

### Disconnect Action

Provides safe disconnection with user confirmation:

```typescript
const handleDisconnect = async () => {
  if (window.confirm(`Are you sure you want to disconnect ${name}?`)) {
    setIsLoading(true)
    try {
      // API call to disconnect service
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLocalStatus('disconnected')
      toast.success(`${name} disconnected successfully`)
    } catch (error) {
      toast.error('Failed to disconnect integration')
    } finally {
      setIsLoading(false)
    }
  }
}
```

**Features:**
- Confirmation dialog prevents accidental disconnection
- Loading state with spinner during API call
- Optimistic UI update on success
- Error handling with user feedback
- Status change reflected immediately in UI

### Configure AI

Platform-specific AI configuration handling:

```typescript
const handleConfigureAI = () => {
  // WhatsApp has specialized handling
  if (name === 'WhatsApp') {
    toast('Coming soon - AI configuration for WhatsApp')
  } else {
    toast('Redirecting to AI configuration...')
    // router.push('/integrations/ai')
  }
}
```

**Implementation Notes:**
- WhatsApp shows "Coming soon" message
- Other services redirect to general AI configuration
- Future implementation will have service-specific AI settings

### Send Test (WhatsApp Only)

Validates configuration and sends test message:

```typescript
const handleSendTest = () => {
  if (name === 'WhatsApp') {
    // Validate required phone number
    const phoneNumber = '+44123456789' // From settings
    if (!phoneNumber) {
      toast.error('Please configure a phone number first')
      return
    }
    toast.success('Test message sent (stub)')
  } else {
    toast.success('Test sent successfully (stub)')
  }
}
```

**Features:**
- Phone number validation for WhatsApp
- Success feedback for valid configuration
- Error message for missing requirements
- Currently stubbed implementation

## Button Configurations

### Connected Integration Buttons

```typescript
// Standard connected integration
<>
  <Button variant="outline" size="sm" onClick={handleManageConnection}>
    <Settings className="w-4 h-4 mr-1" />
    Manage Connection
  </Button>
  
  <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isLoading}>
    {isLoading ? <Loader2 className="animate-spin" /> : <XCircle />}
    Disconnect
  </Button>
  
  <Button variant="outline" size="sm" onClick={handleConfigureAI}>
    <Settings className="w-4 h-4 mr-1" />
    Configure AI
  </Button>
</>
```

### WhatsApp Specific Buttons

```typescript
// WhatsApp gets additional Send Test button
{name === 'WhatsApp' && (
  <Button variant="outline" size="sm" onClick={handleSendTest}>
    <Send className="w-4 h-4 mr-1" />
    Send Test
  </Button>
)}
```

### Disconnected Integration Buttons

```typescript
<Button variant="default" size="sm" onClick={handleManageConnection}>
  Connect {name}
</Button>
```

## Accessibility Features

### ARIA Labels

Each button includes descriptive ARIA labels:

```typescript
<Button
  aria-label={`Manage ${name} connection`}
  title="Manage connection settings"
  data-testid={`manage-connection-${name.toLowerCase()}`}
>
  Manage Connection
</Button>
```

### Keyboard Navigation

- Tab navigation through all buttons
- Enter key activation
- Focus management during loading states
- Screen reader announcements via toast notifications

### Loading States

Visual feedback during asynchronous operations:

```typescript
<Button disabled={isLoading}>
  {isLoading ? (
    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
  ) : (
    <XCircle className="w-4 h-4 mr-1" />
  )}
  Disconnect
</Button>
```

## State Management

### Local Status State

```typescript
const [localStatus, setLocalStatus] = useState(status)
const [isLoading, setIsLoading] = useState(false)
```

**Benefits:**
- Optimistic UI updates
- Immediate user feedback
- Maintains parent component sync

### Loading State Management

```typescript
// Pattern for async operations
setIsLoading(true)
try {
  await apiOperation()
  // Update local state
  // Show success feedback
} catch (error) {
  // Show error feedback  
} finally {
  setIsLoading(false)
}
```

## Integration Examples

### Basic Integration Setup

```typescript
const integrations = [
  {
    name: 'WhatsApp',
    status: 'connected' as const,
    icon: <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">W</div>,
    description: 'Send automated messages and handle customer inquiries'
  },
  {
    name: 'Facebook', 
    status: 'connected' as const,
    icon: <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">f</div>,
    description: 'Sync leads from Facebook advertising campaigns'
  }
]

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {integrations.map(integration => (
      <IntegrationCard key={integration.name} {...integration} />
    ))}
  </div>
)
```

### Custom Icon Components

```typescript
// Using Lucide React icons
import { MessageSquare, Facebook, Calendar } from 'lucide-react'

const iconMap = {
  WhatsApp: <MessageSquare className="w-8 h-8 text-green-600" />,
  Facebook: <Facebook className="w-8 h-8 text-blue-600" />,
  'Google Calendar': <Calendar className="w-8 h-8 text-red-600" />
}
```

### Dynamic Integration Loading

```typescript
const [integrations, setIntegrations] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations')
      const data = await response.json()
      setIntegrations(data.integrations)
    } catch (error) {
      toast.error('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }
  
  fetchIntegrations()
}, [])
```

## Styling and Layout

### Card Structure

```css
.integration-card {
  @apply p-6;
}

.integration-header {
  @apply flex items-start justify-between;
}

.integration-info {
  @apply flex items-center space-x-3;
}

.integration-status {
  @apply flex items-center mt-2;
}

.integration-actions {
  @apply mt-6 flex flex-wrap gap-2;
}
```

### Responsive Grid

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Integration cards */}
</div>
```

### Button Spacing

```typescript
<div className="mt-6 flex flex-wrap gap-2">
  {/* Buttons automatically wrap on smaller screens */}
</div>
```

## Testing Patterns

### Unit Tests

```typescript
describe('IntegrationCard', () => {
  test('renders connected status correctly', () => {
    render(<IntegrationCard name="WhatsApp" status="connected" icon={<div>W</div>} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Manage Connection')).toBeInTheDocument()
  })

  test('shows confirmation dialog on disconnect', async () => {
    window.confirm = jest.fn(() => true)
    render(<IntegrationCard name="WhatsApp" status="connected" icon={<div>W</div>} />)
    
    fireEvent.click(screen.getByText('Disconnect'))
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to disconnect WhatsApp?')
  })

  test('shows loading state during disconnect', async () => {
    window.confirm = jest.fn(() => true)
    render(<IntegrationCard name="WhatsApp" status="connected" icon={<div>W</div>} />)
    
    fireEvent.click(screen.getByText('Disconnect'))
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeDisabled()
  })
})
```

### E2E Tests

```typescript
test('integration card disconnect workflow', async ({ page }) => {
  await page.goto('/dashboard')
  
  // Test disconnect flow
  page.on('dialog', dialog => dialog.accept())
  await page.click('[data-testid="disconnect-whatsapp"]')
  
  await expect(page.locator('.toast')).toHaveText(/disconnected successfully/)
  await expect(page.locator('[data-testid="connect-whatsapp"]')).toBeVisible()
})
```

## Error Handling

### Network Errors

```typescript
try {
  const response = await fetch('/api/integrations/disconnect')
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
} catch (error) {
  console.error('Disconnect failed:', error)
  toast.error('Failed to disconnect integration')
}
```

### Validation Errors

```typescript
const handleSendTest = () => {
  if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
    toast.error('Please configure a valid phone number first')
    return
  }
  // Proceed with test
}
```

## Performance Considerations

### Lazy Loading Icons

```typescript
const IconComponent = lazy(() => import(`@/components/icons/${name}Icon`))

<Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />}>
  <IconComponent />
</Suspense>
```

### Memoization

```typescript
const IntegrationCard = memo(({ name, status, icon, description }: IntegrationCardProps) => {
  // Component implementation
})
```

### Debounced Actions

```typescript
const debouncedDisconnect = useCallback(
  debounce(async () => {
    // Disconnect logic
  }, 300),
  [name]
)
```

## Future Enhancements

### High Priority
- Replace `window.confirm` with custom modal component
- Add bulk disconnect/connect operations
- Implement real API integration
- Add integration health status checks

### Medium Priority
- Drag and drop reordering of integration cards
- Integration-specific configuration forms
- Advanced error recovery mechanisms
- Integration usage analytics

### Nice to Have
- Custom integration card themes
- Integration marketplace
- Advanced filtering and search
- Export/import integration configurations

## Related Components

- [Card Component](./card.md) - Base card styling
- [Button Component](./button.md) - Action button configurations
- [Toast System](./toast.md) - User feedback notifications
- [Loading States](./loading.md) - Async operation indicators