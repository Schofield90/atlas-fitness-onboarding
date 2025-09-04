# Security-Focused Review

Concentrate on security, privacy, and compliance aspects of the code changes.

## Security Audit Areas

### 🔑 Secrets & Credentials
- [ ] No hard-coded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] No secrets in logs or error messages
- [ ] API keys properly scoped and rotated

### 🛡️ Authentication & Authorization
- [ ] Auth checks on all protected routes
- [ ] Proper session management
- [ ] Token validation implemented
- [ ] Role-based access control correct
- [ ] Multi-tenant isolation enforced (org_id checks)

### 💉 Input Validation & Sanitization
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] NoSQL injection prevention
- [ ] XSS prevention (output encoding)
- [ ] Command injection prevention
- [ ] Path traversal prevention

### 🔐 Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Secure transmission (HTTPS/TLS)
- [ ] PII handling compliant (GDPR)
- [ ] Proper data retention policies
- [ ] Secure password storage (bcrypt/argon2)

### 📦 Dependencies & Supply Chain
- [ ] No known vulnerable dependencies
- [ ] Dependencies from trusted sources
- [ ] Lock files committed
- [ ] Minimal dependency footprint

### 🚪 API Security
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] API versioning considered
- [ ] Error messages don't leak info
- [ ] Webhook signatures validated

### 🏗️ Infrastructure Security
- [ ] Database connections secure
- [ ] File uploads restricted and scanned
- [ ] Temporary files cleaned up
- [ ] Resource limits enforced
- [ ] Logging doesn't expose sensitive data

## Critical Rules for This Project

### Multi-Tenant Security
- NEVER bypass RLS (Row Level Security) checks
- Always filter by organization_id
- Verify user belongs to organization before any operation
- Check both organization_id and org_id columns for compatibility

### Payment Security
- Payment logic changes require explicit approval
- Never log payment details
- PCI compliance must be maintained
- Stripe webhooks must be verified

### Automation Builder
- Workflow execution must be sandboxed
- User scripts must be validated
- No arbitrary code execution

## Output Format

**🔴 CRITICAL VULNERABILITY**
Type: [e.g., SQL Injection, Auth Bypass]
File: `path/to/file.ts:123`
Details: [Specific vulnerability description]
Fix Required:
```typescript
// Secure code example
```

**⚠️ SECURITY CONCERN**
Type: [e.g., Missing validation]
File: `path/to/file.ts:456`
Risk: [What could go wrong]
Recommendation: [How to address]

**✅ SECURITY CHECKS PASSED**
- [List of verified security measures]

## Compliance Notes
- GDPR: Check data minimization and consent
- PCI DSS: Verify payment data handling
- SOC 2: Ensure audit logging present