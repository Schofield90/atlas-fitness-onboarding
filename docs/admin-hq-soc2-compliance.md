# SOC 2 Compliance Documentation - Admin HQ

**Version**: 1.0  
**Last Updated**: 2025-08-21  
**Classification**: Internal - Confidential

## Executive Summary

This document outlines the SOC 2 compliance measures implemented in the Atlas Fitness Admin HQ system. The system adheres to the Trust Service Criteria (TSC) focusing on Security, Availability, Processing Integrity, Confidentiality, and Privacy.

## 1. Security Principle

### 1.1 Access Control

#### Authentication & Authorization
- **Multi-Factor Authentication**: Required for all admin accounts
- **Role-Based Access Control (RBAC)**: Four distinct admin roles
  - `platform_owner`: Full system access
  - `platform_admin`: Administrative operations
  - `platform_support`: Support operations
  - `platform_readonly`: Read-only access

#### Implementation
```sql
-- Admin role enforcement
CREATE TYPE admin_role AS ENUM (
  'platform_owner', 
  'platform_admin', 
  'platform_support', 
  'platform_readonly'
);
```

### 1.2 Least Privilege Principle

#### Just-In-Time (JIT) Access
- Time-boxed admin sessions (max 4 hours)
- Explicit reason required for access
- Automatic session expiration
- Granular scope control (read vs write)

#### Code Implementation
```typescript
// app/lib/admin/impersonation.ts
const MAX_IMPERSONATION_DURATION = 30 * 60 * 1000 // 30 minutes
const DEFAULT_IMPERSONATION_DURATION = 15 * 60 * 1000 // 15 minutes
```

### 1.3 Audit Logging

#### Comprehensive Activity Tracking
All admin actions are logged with:
- Actor identification (admin user ID)
- Action type and timestamp
- Target organization/user
- IP address and user agent
- Detailed change records

#### Database Schema
```sql
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_organization_id UUID,
  target_user_id UUID,
  resource_type TEXT,
  resource_id TEXT,
  action_details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Data Protection

### 2.1 Encryption

#### At Rest
- Database encryption using AES-256
- Encrypted file storage for documents
- Encrypted backup systems

#### In Transit
- TLS 1.3 for all API communications
- HTTPS enforcement on all endpoints
- Certificate pinning for mobile apps

### 2.2 Data Isolation

#### Multi-Tenant Separation
- Row Level Security (RLS) policies
- Organization-scoped data access
- No cross-tenant data leakage

#### Implementation
```sql
-- RLS policy example
CREATE POLICY "Users can only see their organization data" 
ON organizations
FOR SELECT
USING (id IN (SELECT auth.user_organizations()));
```

### 2.3 Sensitive Data Handling

#### PII Protection
- Field-level encryption for sensitive data
- Data masking in admin views
- Explicit unmask actions logged

#### Payment Data
- No direct credit card storage
- PCI DSS compliant via Stripe/GoCardless
- Token-based payment processing

## 3. Operational Procedures

### 3.1 Access Request Process

1. **Request Initiation**
   - Admin requests access to specific organization
   - Must provide business justification
   - Select appropriate scope (read/write)

2. **Approval Workflow**
   - Platform owner approval for sensitive operations
   - Automatic approval for support tickets
   - Time-limited access grants

3. **Access Revocation**
   - Automatic expiration
   - Manual revocation capability
   - Immediate effect on all sessions

### 3.2 Incident Response

#### Detection
- Real-time anomaly detection
- Failed access attempt monitoring
- Unusual data access patterns

#### Response Steps
1. Immediate containment
2. Investigation and root cause analysis
3. Remediation and recovery
4. Post-incident review
5. Documentation and lessons learned

### 3.3 Change Management

#### Code Changes
- Pull request reviews required
- Automated security scanning
- Staging environment testing
- Rollback procedures

#### Database Changes
- Migration scripts versioned
- Rollback scripts prepared
- Testing in non-production first
- Change approval process

## 4. Compliance Controls

### 4.1 Administrative Controls

| Control ID | Control Description | Implementation |
|------------|-------------------|----------------|
| AC-01 | Access Control Policy | Documented RBAC system |
| AC-02 | Account Management | Admin user lifecycle management |
| AC-03 | Access Enforcement | RLS and middleware checks |
| AC-04 | Information Flow | Data isolation policies |
| AC-05 | Separation of Duties | Role-based permissions |
| AC-06 | Least Privilege | JIT elevation system |
| AC-07 | Unsuccessful Login Attempts | Rate limiting and lockout |
| AC-08 | System Use Notification | Login banners and audit warnings |

### 4.2 Audit Controls

| Control ID | Control Description | Implementation |
|------------|-------------------|----------------|
| AU-01 | Audit Policy | Comprehensive logging strategy |
| AU-02 | Auditable Events | All admin actions logged |
| AU-03 | Content of Audit Records | Detailed change tracking |
| AU-04 | Audit Storage Capacity | 90-day retention minimum |
| AU-05 | Response to Audit Failures | Alert on logging failures |
| AU-06 | Audit Review | Monthly audit log reviews |
| AU-07 | Audit Reduction | Log aggregation and analysis |
| AU-08 | Time Stamps | UTC timestamps on all logs |

### 4.3 Security Assessment

| Control ID | Control Description | Implementation |
|------------|-------------------|----------------|
| CA-01 | Security Assessment Policy | Annual security reviews |
| CA-02 | Security Assessments | Quarterly vulnerability scans |
| CA-03 | System Interconnections | API security assessments |
| CA-04 | Security Certification | SOC 2 Type II certification |
| CA-05 | Plan of Action | Remediation tracking |
| CA-06 | Security Authorization | Executive approval process |
| CA-07 | Continuous Monitoring | Real-time security monitoring |

## 5. Technical Implementation

### 5.1 Admin Middleware

```typescript
// Enforcement at API layer
export async function requireAdminAccess(): Promise<{
  isAdmin: boolean
  adminUser?: any
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { isAdmin: false, error: 'Unauthorized' }
  }

  const { data: adminUser } = await supabase
    .from('super_admin_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!adminUser) {
    return { isAdmin: false, error: 'Not an admin' }
  }

  return { isAdmin: true, adminUser }
}
```

### 5.2 Impersonation Security

```typescript
// Time-boxed JWT tokens
export interface ImpersonationToken {
  jti: string // JWT ID for revocation
  sub: string // Admin user ID
  org: string // Target organization ID
  scope: 'read' | 'write'
  reason: string
  iat: number
  exp: number
}
```

### 5.3 Audit Implementation

```typescript
// Comprehensive audit logging
async function logSecurityEvent(
  event: string,
  userId: string,
  details: Record<string, any>
): Promise<void> {
  const supabase = await createClient()
  
  await supabase.from('admin_activity_logs').insert({
    admin_user_id: adminUser.id,
    action_type: event,
    action_details: details,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    session_id: session.id
  })
}
```

## 6. Monitoring & Alerting

### 6.1 Key Metrics

- Failed authentication attempts
- Unusual access patterns
- Data export volumes
- API rate limit violations
- System performance metrics

### 6.2 Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed logins | > 5 in 5 minutes | Account lockout |
| Data exports | > 1000 records | Manual review |
| API calls | > 100/minute | Rate limiting |
| Concurrent sessions | > 3 | Session review |
| After-hours access | Any | Notification |

### 6.3 Reporting

#### Weekly Reports
- Active admin sessions
- Organizations accessed
- Critical operations performed

#### Monthly Reports
- Access pattern analysis
- Security incident summary
- Compliance metric dashboard

#### Quarterly Reports
- Full audit review
- Risk assessment update
- Control effectiveness review

## 7. Training & Awareness

### 7.1 Admin Training Requirements

- Initial security training (8 hours)
- Annual refresher training (2 hours)
- Incident response training (4 hours)
- Data protection training (2 hours)

### 7.2 Security Awareness Topics

- Social engineering prevention
- Password security
- Data classification
- Incident reporting
- Compliance requirements

## 8. Risk Assessment

### 8.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unauthorized admin access | Low | Critical | MFA, audit logging |
| Data breach via admin | Low | Critical | JIT access, monitoring |
| Privilege escalation | Low | High | Role enforcement |
| Audit log tampering | Very Low | High | Immutable logging |
| Session hijacking | Low | High | Secure tokens, timeout |

### 8.2 Risk Treatment

- **Accept**: Low-impact operational risks
- **Mitigate**: High-impact security risks
- **Transfer**: Insurance for data breaches
- **Avoid**: Eliminate unnecessary admin functions

## 9. Compliance Attestation

### 9.1 Management Assertion

Atlas Fitness management asserts that the Admin HQ system:
- Maintains effective controls over security
- Processes data accurately and completely
- Protects confidential information
- Ensures system availability
- Safeguards personal privacy

### 9.2 Auditor Requirements

External auditors should review:
- Access control procedures
- Audit log completeness
- Change management processes
- Incident response records
- Training documentation

## 10. Continuous Improvement

### 10.1 Review Schedule

- **Daily**: Security alerts and logs
- **Weekly**: Access reviews
- **Monthly**: Metrics and KPIs
- **Quarterly**: Control assessments
- **Annually**: Full SOC 2 audit

### 10.2 Improvement Process

1. Identify control gaps
2. Assess risk impact
3. Develop remediation plan
4. Implement controls
5. Verify effectiveness
6. Document changes

## Appendices

### Appendix A: Control Mappings

Mapping to industry frameworks:
- SOC 2 Trust Service Criteria
- ISO 27001 Controls
- NIST Cybersecurity Framework
- CIS Controls

### Appendix B: Glossary

- **JIT**: Just-In-Time access
- **RLS**: Row Level Security
- **MFA**: Multi-Factor Authentication
- **PII**: Personally Identifiable Information
- **RBAC**: Role-Based Access Control

### Appendix C: Contact Information

- Security Team: security@atlas-fitness.com
- Compliance Officer: compliance@atlas-fitness.com
- Incident Response: incident@atlas-fitness.com
- 24/7 Hotline: +44 XXX XXXX XXXX

---

**Document Control**
- Owner: Security & Compliance Team
- Reviewer: Chief Technology Officer
- Approver: Chief Executive Officer
- Next Review: 2026-02-21
- Distribution: Restricted - Need to Know