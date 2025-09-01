# Webhook Trigger Implementation Mapping

## Current State Analysis

### Webhook Trigger Panel Status
- **Location**: `/components/automations/AutomationBuilder.tsx`
- **Current Behavior**: Shows generic "Trigger Configuration" panel with "Configuration Coming Soon" message
- **Implementation**: Uses `GenericTriggerConfig` component (lines 38-97) for unsupported trigger types
- **Problem**: No specific webhook configuration UI implemented

### Existing Webhook Infrastructure

#### 1. Webhook API Endpoints
**Facebook Webhook**: `/app/api/facebook/webhook/route.ts`
- GET endpoint for webhook verification (hub.verify_token)
- POST endpoint for event processing
- HMAC signature verification using SHA256
- Event storage and processing pipeline
- Rate limiting: None explicitly implemented
- Body size limits: Not configured

**LookInBody Webhook**: `/app/api/webhooks/lookinbody/[organizationId]/route.ts`
- Organization-specific webhook endpoints
- Signature verification via `x-lookinbody-signature` header
- Webhook data processing and client matching
- Error handling and logging for unmatched data

#### 2. Security Infrastructure
**Signature Verification**:
- Facebook: HMAC-SHA256 with `FACEBOOK_APP_SECRET`
- LookInBody: HMAC-SHA256 with organization-specific `webhook_secret`
- Both use `crypto.createHmac()` for verification

**Middleware Protection**:
- Location: `/middleware.ts` (lines 95-98)
- Excludes webhook endpoints from authentication: `/api/facebook/webhook`, `/api/public/`
- CORS headers for API routes

#### 3. Database Schema
**Webhook Storage**:
```sql
-- From schema.sql (lines 105-119)
workflows table:
- trigger_type: 'webhook' | 'schedule' | 'event'
- trigger_config: JSONB (webhook configuration)
- actions: JSONB (automation actions)
```

**Webhook Events**:
- `facebook_webhooks` table (inferred from LookInBody webhook route)
- `unmatched_scans_log` table for unprocessed webhook data
- `automation_jobs` table for triggered automations

#### 4. Secret Management
**Current Approach**:
- Environment variables for service-specific secrets
- LookInBody: Per-organization `webhook_secret` in database
- Facebook: Global `FACEBOOK_APP_SECRET`
- No secret rotation mechanism implemented

#### 5. Rate Limiting & Security
**Missing**:
- No rate limiting on webhook endpoints
- No body size limits configured
- No IP whitelisting
- No retry/backoff mechanisms

## Proposed Webhook Configuration Component

### Component Structure
```
components/automations/
├── WebhookTriggerConfig.tsx (NEW)
├── AutomationBuilder.tsx (UPDATE line 35, add webhook support)
└── __tests__/unit/components/automations/WebhookTriggerConfig.test.tsx (NEW)
```

### API Ingress Route Design
```
app/api/automations/webhooks/
├── [organizationId]/
│   └── [webhookId]/
│       └── route.ts (NEW - generic webhook handler)
└── route.ts (NEW - webhook management endpoints)
```

### Data Model Extensions

#### Webhook Configuration Schema
```typescript
interface WebhookConfig {
  id: string;
  organizationId: string;
  name: string;
  endpoint: string; // Generated URL
  secret: string; // HMAC secret
  signatureHeader: string; // e.g., 'x-webhook-signature'
  contentType: 'application/json' | 'application/x-www-form-urlencoded';
  timeout: number; // seconds
  retryAttempts: number;
  isActive: boolean;
  allowedSources?: string[]; // IP whitelist
  payloadFilters?: Record<string, any>; // JSON path filters
  created_at: string;
  updated_at: string;
}
```

#### Database Tables Needed
```sql
-- Webhook configurations
CREATE TABLE webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    secret TEXT NOT NULL, -- encrypted
    signature_header TEXT DEFAULT 'x-webhook-signature',
    content_type TEXT DEFAULT 'application/json',
    timeout INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    allowed_sources JSONB DEFAULT '[]',
    payload_filters JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook execution logs
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_headers JSONB,
    request_body TEXT,
    response_status INTEGER,
    response_body TEXT,
    processing_duration_ms INTEGER,
    signature_valid BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points

#### AutomationBuilder Updates
**File**: `/components/automations/AutomationBuilder.tsx`
- Line 35: Add `{ value: 'webhook', label: 'Webhook', description: 'Trigger via HTTP webhook' }`
- Lines 257-262: Add webhook case to trigger configuration rendering

#### Middleware Updates
**File**: `/middleware.ts`  
- Line 97: Add webhook endpoint pattern to exclusion list
- Add rate limiting middleware for webhook endpoints

### Security Enhancements

#### Secret Management
- Generate cryptographically secure secrets using `crypto.randomBytes(32)`
- Store encrypted secrets in database
- Implement secret rotation API
- Support multiple active secrets during rotation

#### Request Validation
- HMAC signature verification (configurable algorithm)
- Content-Type validation
- Request size limits (configurable per webhook)
- IP address whitelisting (optional)

#### Logging & Monitoring
- Store all webhook requests for debugging
- Track success/failure rates
- Alert on repeated failures
- Payload size and processing time metrics

## Implementation Priority

### Phase 1: Basic Webhook Configuration
1. Create `WebhookTriggerConfig` component
2. Add webhook option to `AutomationBuilder`
3. Implement webhook creation API
4. Add database tables and migrations

### Phase 2: Generic Webhook Handler
1. Create webhook ingress API route
2. Implement signature verification
3. Add basic logging and error handling
4. Connect to automation execution engine

### Phase 3: Security & Monitoring
1. Add rate limiting middleware
2. Implement IP whitelisting
3. Add comprehensive logging
4. Create webhook management dashboard

## Files Requiring Changes

### New Files
- `/components/automations/WebhookTriggerConfig.tsx`
- `/app/api/automations/webhooks/[organizationId]/[webhookId]/route.ts`
- `/app/api/automations/webhooks/route.ts`
- `/lib/supabase/migrations/006_webhook_configurations.sql`
- `/__tests__/unit/components/automations/WebhookTriggerConfig.test.tsx`

### Modified Files
- `/components/automations/AutomationBuilder.tsx` (lines 35, 257-262)
- `/middleware.ts` (lines 97-98)
- `/types/database.ts` (add webhook types)
- `/lib/supabase/database.types.ts` (regenerate after migration)

## Risk Assessment

### High Risk
- **Webhook endpoint security**: Unauthenticated endpoints require robust signature verification
- **Rate limiting**: Missing protection against DoS attacks
- **Secret exposure**: Webhook secrets need proper encryption at rest

### Medium Risk  
- **Payload size attacks**: No current body size limits
- **Error information leakage**: Webhook responses may reveal system details
- **Database performance**: Webhook logs could grow large without archiving

### Low Risk
- **Integration complexity**: Existing automation framework can be extended
- **UI complexity**: Can reuse existing trigger configuration patterns