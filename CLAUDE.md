# Claude Code Design Contract

## Project Overview
Atlas Fitness Onboarding - Multi-tenant SaaS platform for gym management with AI-powered features.

## Design Principles

### Minimal Diff Policy
- **ALWAYS** produce the smallest possible change that fixes the issue
- Prefer targeted fixes over refactoring unless explicitly requested
- One concern per PR - don't bundle unrelated changes
- If a fix requires < 10 lines, prefer inline patches over new files

### Code Style
- TypeScript strict mode
- Explicit return types for public functions
- No `any` types without justification
- Guard clauses over nested conditionals
- Early returns to reduce indentation

## Critical Routes for Review

### Public-facing (High Priority)
- `/` - Landing page
- `/book/public/[organizationId]` - Public booking widget
- `/signin` - Authentication flow
- `/signup` - Onboarding flow
- `/integrations/facebook` - OAuth integration

### Dashboard (Medium Priority)
- `/dashboard` - Main dashboard
- `/leads` - Lead management
- `/booking` - Booking system
- `/settings` - Organization settings
- `/automations` - Workflow builder

## Accessibility Standards

### WCAG 2.1 AA Requirements
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard accessible
- Focus indicators visible and clear
- Form labels properly associated
- Error messages clear and actionable
- Loading states announced to screen readers

### Component Rules
- Buttons must have accessible names
- Forms must have proper fieldset/legend structure
- Modals must trap focus and be escapable
- Tables must have proper headers and scope
- Images must have meaningful alt text (empty for decorative)

## Design Tokens

### Colors
```typescript
const colors = {
  primary: '#3B82F6',    // Blue-500
  secondary: '#8B5CF6',  // Purple-500
  success: '#10B981',    // Green-500
  warning: '#F59E0B',    // Amber-500
  error: '#EF4444',      // Red-500
  dark: '#1F2937',       // Gray-800
  light: '#F9FAFB'       // Gray-50
}
```

### Spacing
- Use Tailwind spacing scale (0.25rem increments)
- Component padding: p-4 (1rem) minimum
- Section spacing: my-8 (2rem) between major sections
- Form field spacing: space-y-4 (1rem) between fields

### Typography
- Font: System UI stack
- Base size: 16px
- Line height: 1.5 for body, 1.2 for headings
- Heading hierarchy must be semantic (h1 → h2 → h3)

## Next.js App Router Rules

### Client/Server Boundaries
- `useSearchParams()` MUST be wrapped in `<Suspense>`
- Browser APIs (`window`, `document`, `localStorage`) only in Client Components
- Database queries only in Server Components
- Use `'use client'` directive sparingly

### Data Fetching
- Prefer Server Components for data fetching
- Use `loading.tsx` for route-level loading states
- Implement error boundaries with `error.tsx`
- Cache responses appropriately with `revalidate`

## API Design Standards

### Response Format
```typescript
// Success
{
  success: true,
  data: T,
  meta?: { page: number, total: number }
}

// Error
{
  success: false,
  error: string,
  details?: Record<string, any>
}
```

### Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

## Testing Requirements

### Unit Tests
- Business logic functions
- API route handlers
- Custom hooks
- Utility functions

### Integration Tests
- API endpoints with database
- Authentication flows
- Third-party integrations
- Webhook handlers

### E2E Tests
- Critical user journeys
- Payment flows
- OAuth connections
- Multi-step forms

## Security Checklist

### Authentication
- [ ] All routes protected by auth middleware
- [ ] Organization-level data isolation enforced
- [ ] Session tokens properly validated
- [ ] CSRF protection on state-changing operations

### Data Validation
- [ ] Input sanitization on all user inputs
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via proper escaping
- [ ] File upload restrictions enforced

### API Security
- [ ] Rate limiting on all endpoints
- [ ] API keys stored in environment variables
- [ ] Webhook signatures validated
- [ ] CORS properly configured

## Review Checklist

### For Every PR
1. **Functionality**: Does it solve the stated problem?
2. **Minimalism**: Is this the smallest possible fix?
3. **Tests**: Are there tests for the change?
4. **Accessibility**: Does it meet WCAG standards?
5. **Performance**: No N+1 queries or unnecessary re-renders?
6. **Security**: No exposed secrets or injection vulnerabilities?
7. **Documentation**: Are complex parts commented?

### Automatic Fixes Claude Should Apply
- Missing `alt` attributes on images
- Insufficient color contrast
- Missing form labels
- Unescaped user input in templates
- Missing error boundaries
- `useSearchParams` without Suspense
- Client-only APIs in Server Components

## PR Comment Template

```markdown
## 🤖 Claude Design Review

### ✅ Passed Checks
- [List passing items]

### ⚠️ Issues Found
- [List issues with severity]

### 🔧 Suggested Fixes
```diff
[Minimal diffs to fix issues]
```

### 📊 Metrics
- Accessibility Score: X/100
- Performance Score: X/100
- Test Coverage: X%
```

---

*Last Updated: August 2025*
*Review Type: Automated Design & Accessibility*
*Diff Policy: Minimal changes only*