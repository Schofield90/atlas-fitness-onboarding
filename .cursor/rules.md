# Cursor AI Agent Rules

This file defines engineering guardrails and communication guidelines for AI agents working on this codebase.

## Engineering Guardrails

### Architecture Constraints
- **Multi-tenant isolation is MANDATORY** - Never bypass RLS checks
- **Organization context required** - All queries must filter by organization_id
- **Dual column support** - Check both `organization_id` and `org_id` for backward compatibility
- **No direct database access from client components** - Use API routes

### Protected Areas
These areas require explicit approval before changes:
- Payment/billing logic (Stripe integration)
- Authentication system (NextAuth/Supabase Auth)
- Row Level Security policies
- Database migrations affecting production
- Automation builder core logic
- Webhook signature validation

### Security Requirements
- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Sanitize user data before processing
- **Parameterized queries only** - Prevent SQL injection
- **Auth checks mandatory** - Every API route needs requireAuth()
- **Log safely** - Never log passwords, tokens, or PII

### Testing Mandates
- New features require unit tests
- Bug fixes require regression tests
- API changes require integration tests
- UI changes require E2E tests
- Minimum 80% coverage for critical paths

### Database Rules
- Always use transactions for multi-table operations
- Include proper indexes for new queries
- Migrations must be reversible
- Never drop columns in production without backup
- Use prepared statements for all queries

## Language & Tone Guidelines

### Communication Style
- **Be direct and factual** - No fluff or filler
- **Lead with conclusions** - State the issue/fix upfront
- **Use bullet points** - For multiple items
- **Include evidence** - Reference specific files and line numbers

### Banned Phrases and Words
The following phrases/words are prohibited in all AI communications:

#### Never Use These Words
- "Performant" - Use "efficient" or "optimized" instead
- "Leverage" (as a verb) - Use "use" or "utilize"
- "Synergy" - Be specific about the interaction
- "Paradigm" - Describe the actual pattern

#### Never Use These Phrases
- "It's not just X, it's Y" - State facts directly
- "Certainly, I can help with that" - Skip pleasantries
- "As an AI assistant" - Never self-reference
- "I will now..." - Don't narrate actions
- "Let me..." - Just do it
- "It's worth noting that..." - Note it directly
- "In order to..." - Use "To..."
- "Due to the fact that..." - Use "Because..."

#### Avoid Weasel Words
- "Potentially" - Be definitive or skip it
- "Might/May/Could" - Only use when genuinely uncertain
- "Generally/Usually/Typically" - Be specific
- "Arguably" - Make the argument or don't
- "Somewhat/Rather/Quite" - Use precise measurements

### Preferred Communication Patterns

#### Good Example:
```
**Bug Found**: Null pointer exception
File: `app/api/clients/route.ts:45`
Fix: Add null check before accessing user.organizationId
```

#### Bad Example:
```
It's worth noting that there might be a potential issue that could 
potentially cause problems. Generally speaking, it's not just a bug, 
it's a reminder that we should perhaps consider maybe adding some 
validation. Certainly, I can help with implementing a solution that 
leverages best practices to create a more performant implementation.
```

### Code Review Comments
- Start with severity: CRITICAL/HIGH/MEDIUM/LOW
- One line problem statement
- One line solution
- Code example if needed
- No explanations unless asked

### Commit Messages
- Format: `<type>(<scope>): <subject>`
- Types: feat, fix, docs, style, refactor, test, chore
- Subject: Imperative mood, no period
- Body: Only if necessary, explain why not what

## Project-Specific Rules

### API Response Format
All APIs must return this structure:
```typescript
// Success
{ success: true, data: T, meta?: {...} }
// Error  
{ success: false, error: string, details?: {...} }
```

### Component Patterns
- Use Server Components by default
- Client Components only when needed (hooks, browser APIs)
- Wrap `useSearchParams()` in Suspense boundaries
- Error boundaries for all async components

### File Organization
- Collocate related files
- Use index.ts for public exports only
- Keep components under 200 lines
- Extract complex logic to hooks/utils

### Naming Conventions
- camelCase for variables/functions
- PascalCase for components/types
- kebab-case for file names
- SCREAMING_SNAKE_CASE for constants

## Review Priorities

When reviewing code, check in this order:
1. **Security vulnerabilities** - Stop if found
2. **Data integrity risks** - Stop if found  
3. **Performance problems** - Flag if severe
4. **Test coverage** - Require for new code
5. **Code style** - Auto-fix with tools

## Automatic Fixes to Apply

If you see these issues, fix them immediately:
- Missing `alt` attributes on images
- Color contrast below 4.5:1
- Form inputs without labels
- Unescaped user content in templates
- `useSearchParams` without Suspense
- API routes without auth checks
- Secrets in code (move to env)
- Console.log in production code

## Output Constraints

### For Bug Reports
- Maximum 5 issues per report
- Order by severity
- Include reproduction steps
- Provide specific fixes

### For Code Reviews  
- Check all categories in checklist
- One conclusion per section
- Actionable feedback only
- Reference line numbers

### For Security Audits
- Report all vulnerabilities found
- Include CVSS scores if applicable
- Provide remediation code
- Note compliance impacts

## Remember
- You are a tool, not a conversationalist
- Output is for developers who value their time
- Every word should add value
- When in doubt, be terse