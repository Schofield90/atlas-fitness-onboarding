# Contributing to Atlas Fitness Onboarding

## AI-Assisted Development with Cursor

This project integrates Cursor AI agents to help with code review, debugging, and security analysis. These tools are designed to catch issues early and maintain high code quality standards.

## Available AI Commands

### 🐛 Bug Hunt (`/bug-hunt`)

Quick scan for critical bugs in your changes.

- **Use when**: You've made changes and want a quick bug check
- **Output**: Top 5 most critical issues with fixes

### 📋 Code Review (`/code-review`)

Comprehensive review against our checklist.

- **Use when**: Before requesting human review
- **Output**: Full checklist with pass/fail for each category

### 🔒 Security Review (`/security-review`)

Deep dive into security and compliance.

- **Use when**: Changing auth, APIs, or handling sensitive data
- **Output**: Security vulnerabilities with remediation

## How to Use AI Agents

### In Cursor IDE

1. Open command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Cursor: Bug Hunt" (or other command)
3. Review the AI output in the chat panel

### Via Slash Commands

In the Cursor chat:

```
/bug-hunt
/code-review
/security-review
```

### Via GitHub Comments (if configured)

Comment on a PR:

```
@cursoragent review
@cursoragent security-check
```

### Via CLI (requires setup)

```bash
# Install Cursor CLI
curl -fsSL https://cursor.com/install | bash

# Run commands
cursor-agent bug-hunt
cursor-agent code-review --file app/api/route.ts
cursor-agent security-review --pr 123
```

## Development Workflow

### 1. Before Starting Work

- Pull latest from main: `git pull origin main`
- Create feature branch: `git checkout -b feature/your-feature`
- Review existing code patterns in similar files

### 2. While Coding

- Follow TypeScript strict mode
- Use Server Components by default
- Add auth checks to all API routes
- Include tests for new features

### 3. Before Committing

- Run type check: `npm run typecheck`
- Run linter: `npm run lint`
- Run tests: `npm test`
- Use AI bug hunt: `/bug-hunt`

### 4. Creating a PR

- Fill out the PR template completely
- Run AI code review: `/code-review`
- Address any critical issues found
- Ensure CI passes

## Testing Requirements

### Unit Tests

- Required for all business logic
- Use Vitest for testing
- Aim for 80% coverage on new code

### E2E Tests

- Required for user-facing features
- Use Playwright for browser tests
- Cover happy path at minimum

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# With coverage
npm test -- --coverage
```

## Code Style Guidelines

### TypeScript

- Explicit return types for public functions
- No `any` types without justification
- Use type guards for runtime checks

### React/Next.js

- Server Components by default
- Wrap `useSearchParams` in Suspense
- Error boundaries for async components

### Database

- Always use parameterized queries
- Include organization_id filters
- Use transactions for multi-table ops

## Security Guidelines

### Never Do

- Commit secrets or API keys
- Bypass RLS checks
- Log sensitive data
- Trust user input

### Always Do

- Use environment variables
- Validate all inputs
- Check authentication
- Sanitize outputs

## AI Contribution Guidelines

### When AI Generates Code

1. Always review the output
2. Run the test suite
3. Check for security issues
4. Verify it follows our patterns

### AI is a Helper

- Use it to catch bugs early
- Let it handle routine reviews
- But always verify its suggestions
- Final responsibility is yours

## Getting Help

### Documentation

- [README.md](./README.md) - Project overview
- [CLAUDE.md](./CLAUDE.md) - Design contract
- `.cursor/rules.md` - AI agent rules

### Commands

```bash
# See all available scripts
npm run

# Get help with Cursor
cursor --help
```

### Issues

- Check existing issues first
- Use issue templates
- Include reproduction steps
- Add relevant logs

## Pull Request Process

1. **Create PR** with descriptive title
2. **Fill template** completely
3. **Run AI review** to catch issues
4. **Address feedback** from AI and humans
5. **Ensure CI passes** before merge
6. **Squash commits** when merging

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:

```
feat(auth): add OAuth2 support for Google

Implements Google OAuth2 flow with proper state validation
and PKCE for enhanced security.

Closes #123
```

## Questions?

- Technical questions: Create an issue
- Security concerns: Contact maintainers directly
- Feature requests: Open a discussion first
