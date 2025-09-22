# Claude Agents Setup Guide

This document contains information about all the Claude sub-agents used in this project for security testing, QA, and development assistance.

## Available Sub-Agents

### 1. qa-bug-reproducer

**Purpose**: Reproduce bugs, verify fixes, and create comprehensive test coverage
**Capabilities**:

- Captures bug reproduction steps
- Validates patches
- Writes unit and e2e tests
  **Usage**: Ideal for QA workflows and test creation

### 2. malicious-qa-tester

**Purpose**: Aggressive security-focused testing to uncover vulnerabilities
**Capabilities**:

- Simulates malicious user behavior
- Tests for security vulnerabilities
- Attempts to break application through various attack vectors
  **Usage**: Security audits and penetration testing

### 3. security-auditor

**Purpose**: Perform security audits on code changes
**Capabilities**:

- Identifies potential vulnerabilities
- Checks for secrets/PII leaks
- Reviews authentication/authorization implementations
- Assesses compliance impacts (GDPR/SOC2)
  **Usage**: Pre-deployment security reviews

### 4. code-mapper

**Purpose**: Analyze codebase structure and assess impact of changes
**Capabilities**:

- Creates inventories of code components
- Pinpoints exact locations for changes
- Produces risk assessments
  **Usage**: Understanding codebase before major changes

### 5. fixer

**Purpose**: Implement minimal, targeted fixes to resolve specific issues
**Capabilities**:

- Creates surgical patches rather than rewrites
- Adds missing error handling
- Produces clear diffs for review
  **Usage**: Bug fixes and small improvements

### 6. perf-cost-optimizer

**Purpose**: Analyze and optimize application performance
**Capabilities**:

- Identifies bundle size issues
- Detects N+1 query problems
- Optimizes caching strategies
- Reduces unnecessary API calls
  **Usage**: Performance optimization

### 7. db-migrator

**Purpose**: Design and implement database migrations
**Capabilities**:

- Creates new migrations
- Adds indexes
- Optimizes query performance
- Plans safe rollback strategies
  **Usage**: Database schema changes

### 8. context-manager

**Purpose**: Maintain project context and documentation
**Capabilities**:

- Updates context files
- Generates focused context briefs
- Maintains documentation accuracy
  **Usage**: Documentation management

### 9. growth-analyst

**Purpose**: Define analytics and design experiments
**Capabilities**:

- Creates event schemas
- Maps user funnels
- Designs A/B tests
- Proposes KPIs
  **Usage**: Analytics implementation

### 10. docs-updater

**Purpose**: Update documentation after code changes
**Capabilities**:

- Updates CHANGELOG
- Maintains user guides
- Documents API changes
  **Usage**: Documentation updates

### 11. release-manager

**Purpose**: Gate pull requests and manage releases
**Capabilities**:

- Reviews PR readiness
- Determines semantic versioning
- Generates release notes
- Creates smoke test plans
  **Usage**: Release management

### 12. a11y-ux-reviewer

**Purpose**: Review UI for accessibility compliance
**Capabilities**:

- Checks WCAG 2.2 AA compliance
- Reviews keyboard navigation
- Tests screen reader compatibility
- Validates contrast ratios
  **Usage**: Accessibility audits

### 13. saas-multitenancy-guardian

**Purpose**: Review code for multi-tenant compatibility
**Capabilities**:

- Ensures tenant isolation
- Reviews scalability
- Checks data access patterns
- Validates caching strategies
  **Usage**: Multi-tenant SaaS reviews

## How to Use Agents

Agents are invoked through Claude's Task tool. Example:

```typescript
// Example: Using the security-auditor agent
Task.invoke({
  subagent_type: "security-auditor",
  description: "Review authentication changes",
  prompt:
    "Review the recent authentication changes for security vulnerabilities",
});
```

## Security Test Scripts Created

The following test scripts were created during security assessment:

1. `/security-test-idor.js` - IDOR vulnerability scanner
2. `/privilege-escalation-test.js` - Privilege escalation tests
3. `/xss-injection-exploit-test.js` - XSS vulnerability tests
4. `/exploit-exposed-files.js` - File exposure scanner
5. `/git-repository-exploit.js` - Git exposure exploit
6. `/aggressive-exploit-test.js` - Aggressive exploit testing
7. `/quick-idor-test.js` - Quick vulnerability scanner
8. `/advanced-privilege-escalation-test.js` - Advanced privilege tests
9. `/targeted-xss-test.js` - Targeted XSS testing
10. `/advanced-xss-exploit.js` - Advanced XSS exploits

## Installation on New Machine

1. Ensure Claude Code CLI is installed
2. Copy this repository to new machine
3. Run test scripts as needed for security regression testing
4. Agents are built into Claude and don't need separate installation

## Agent Usage in This Project

During this session, the following agents were used:

- **qa-bug-reproducer**: Tested nutrition coach functionality
- **malicious-qa-tester** (4 instances): Performed comprehensive security assessment
  - Authentication bypass testing
  - IDOR and data breach testing
  - XSS and injection testing
  - Privilege escalation testing

## Notes

- All agents follow minimal diff policy
- Agents produce targeted fixes rather than rewrites
- Security agents do not cause permanent damage
- Test scripts can be run for regression testing
