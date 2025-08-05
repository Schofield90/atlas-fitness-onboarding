# Development Standards Context

## Overview
This document outlines the coding standards, patterns, and best practices for the Atlas Fitness CRM platform. All code should follow these guidelines to ensure consistency, maintainability, and quality.

## Code Organization

### Project Structure
```
/app                    # Next.js 14 App Router
  /api                 # API routes
    /[resource]       # RESTful endpoints
      /route.ts       # HTTP handlers
  /components         # React components
    /ui              # Generic UI components
    /features        # Feature-specific components
  /lib               # Business logic
    /supabase       # Database utilities
    /integrations   # Third-party APIs
    /utils          # Helper functions
  /(auth)           # Auth group routes
  /(dashboard)      # Dashboard group routes
/supabase           # Database migrations
/.claude            # AI agent configurations
/public             # Static assets
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `LeadTable.tsx`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types**: PascalCase with `.types.ts` suffix
- **Tests**: Same name with `.test.ts` suffix

## TypeScript Standards

### Type Definitions
```typescript
// Prefer interfaces for objects
interface User {
  id: string;
  email: string;
  organizationId: string;
}

// Use type for unions and primitives
type Status = 'active' | 'inactive' | 'pending';
type UserId = string;

// Always export types that might be reused
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

### Strict Mode Rules
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Type Guards
```typescript
// Define type guards for runtime checks
function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string'
  );
}

// Use with API responses
if (isUser(response.data)) {
  // TypeScript knows this is a User
  console.log(response.data.email);
}
```

## React Patterns

### Component Structure
```typescript
// Prefer function components with TypeScript
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  children?: React.ReactNode;
}

export function Component({ 
  title, 
  onAction, 
  children 
}: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState<string>('');
  const { data, loading } = useQuery();
  
  // Derived state
  const isValid = useMemo(() => state.length > 0, [state]);
  
  // Callbacks
  const handleClick = useCallback((id: string) => {
    onAction(id);
  }, [onAction]);
  
  // Early returns for loading/error states
  if (loading) return <Spinner />;
  
  // Main render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### State Management
```typescript
// Use React Context for cross-component state
const OrganizationContext = createContext<OrganizationContextType | null>(null);

// Custom hook for context
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

// For complex state, use Zustand
interface StoreState {
  leads: Lead[];
  filters: FilterState;
  setLeads: (leads: Lead[]) => void;
  updateFilter: (key: string, value: any) => void;
}
```

### Server Components
```typescript
// Default to server components
// app/leads/page.tsx
export default async function LeadsPage() {
  // Direct database access
  const leads = await getLeads();
  
  return <LeadTable leads={leads} />;
}

// Mark client components explicitly
// 'use client'
export function InteractiveComponent() {
  const [open, setOpen] = useState(false);
  // ...
}
```

## API Design

### Route Handlers
```typescript
// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const { organizationId } = await requireAuth(request);
    
    // 2. Validation
    const body = await request.json();
    const validated = createLeadSchema.parse(body);
    
    // 3. Business logic
    const lead = await createLead({
      ...validated,
      organizationId
    });
    
    // 4. Response
    return NextResponse.json({
      success: true,
      data: lead
    });
    
  } catch (error) {
    // 5. Error handling
    return handleApiError(error);
  }
}
```

### Error Responses
```typescript
// Consistent error format
interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Error handler utility
export function handleApiError(error: unknown): NextResponse {
  // Validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    }, { status: 400 });
  }
  
  // Custom errors
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode });
  }
  
  // Unknown errors
  console.error('Unhandled error:', error);
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 });
}
```

## Database Patterns

### Query Patterns
```typescript
// Always use parameterized queries
const { data, error } = await supabase
  .from('leads')
  .select('*, organization:organizations(name)')
  .eq('organization_id', organizationId)
  .order('created_at', { ascending: false })
  .limit(50);

// Handle errors consistently
if (error) {
  throw new DatabaseError('Failed to fetch leads', error);
}
```

### Transactions
```typescript
// Use transactions for multi-table operations
async function transferLead(leadId: string, toOrgId: string) {
  const { data, error } = await supabase.rpc('transfer_lead', {
    p_lead_id: leadId,
    p_to_org_id: toOrgId
  });
  
  if (error) throw error;
  return data;
}
```

### Admin Operations
```typescript
// Use admin client for system operations
import { createAdminClient } from '@/lib/supabase/admin';

export async function systemOperation() {
  const supabase = createAdminClient();
  
  // Admin client bypasses RLS
  const { data } = await supabase
    .from('organizations')
    .select('*');
    
  return data;
}
```

## Testing Standards

### Unit Tests
```typescript
// Component testing with React Testing Library
describe('LeadTable', () => {
  it('should render leads correctly', () => {
    const leads = [
      { id: '1', name: 'John Doe', email: 'john@example.com' }
    ];
    
    render(<LeadTable leads={leads} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// API route testing
describe('POST /api/leads', () => {
  it('should create a new lead', async () => {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        name: 'Test Lead',
        email: 'test@example.com'
      })
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Lead');
  });
});
```

## Security Best Practices

### Input Validation
```typescript
// Always validate and sanitize input
const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  message: z.string().max(1000).trim()
});

// Sanitize HTML content
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Authentication
```typescript
// Require authentication for all protected routes
export async function requireAuth(
  request?: NextRequest
): Promise<AuthContext> {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  const { data: authUser } = await supabase
    .from('auth_users')
    .select('*, organization:organizations(*)')
    .eq('auth_id', user.id)
    .single();
    
  if (!authUser) {
    throw new UnauthorizedError('User not found');
  }
  
  return {
    userId: authUser.id,
    organizationId: authUser.organization_id,
    role: authUser.role
  };
}
```

### Environment Variables
```typescript
// Type-safe environment variables
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  NODE_ENV: z.enum(['development', 'production', 'test'])
});

export const env = envSchema.parse(process.env);
```

## Performance Guidelines

### Data Fetching
```typescript
// Parallel data fetching
const [leads, stats, campaigns] = await Promise.all([
  getLeads(organizationId),
  getLeadStats(organizationId),
  getCampaigns(organizationId)
]);

// Use React Suspense for loading states
<Suspense fallback={<LeadTableSkeleton />}>
  <LeadTable />
</Suspense>
```

### Optimization
```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Debounce user input
const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    searchLeads(term);
  }, 300),
  []
);
```

### Code Splitting
```typescript
// Dynamic imports for large components
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);
```

## Git Workflow

### Commit Messages
Follow conventional commits:
```
feat: add lead scoring algorithm
fix: resolve timezone issue in scheduler
docs: update API documentation
refactor: simplify webhook processing
test: add integration tests for workflows
chore: update dependencies
```

### Branch Naming
- `feature/lead-scoring`
- `fix/webhook-timeout`
- `refactor/api-structure`
- `docs/automation-guide`

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
```

## Monitoring & Logging

### Structured Logging
```typescript
import { logger } from '@/lib/logger';

// Use structured logging
logger.info('Lead created', {
  leadId: lead.id,
  organizationId,
  source: lead.source,
  timestamp: new Date().toISOString()
});

// Error logging with context
logger.error('Failed to send email', {
  error: error.message,
  stack: error.stack,
  leadId,
  template: emailTemplate,
  attempt: retryCount
});
```

### Performance Monitoring
```typescript
// Track API performance
const startTime = performance.now();

try {
  const result = await operation();
  
  metrics.record('api.latency', {
    endpoint: '/api/leads',
    method: 'POST',
    duration: performance.now() - startTime,
    status: 'success'
  });
  
  return result;
} catch (error) {
  metrics.record('api.error', {
    endpoint: '/api/leads',
    method: 'POST',
    error: error.message
  });
  throw error;
}
```

These standards ensure code quality, maintainability, and consistency across the entire codebase.