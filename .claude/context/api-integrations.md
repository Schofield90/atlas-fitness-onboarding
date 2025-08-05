# API Integration Context

## Overview
The Atlas Fitness CRM integrates with multiple third-party services to provide comprehensive functionality. All integrations follow consistent patterns for authentication, error handling, and rate limiting.

## Current Integrations

### 1. Meta/Facebook APIs

#### Authentication
- OAuth 2.0 flow for user authorization
- Long-lived tokens stored encrypted in database
- Automatic token refresh before expiry

#### Endpoints Used
```typescript
// Lead Forms
GET /v18.0/{page-id}/leadgen_forms
GET /v18.0/{form-id}/leads
POST /v18.0/{form-id}/test_leads

// Ad Management
GET /v18.0/{ad-account-id}/campaigns
GET /v18.0/{campaign-id}/insights
POST /v18.0/{ad-set-id}/

// Custom Audiences
POST /v18.0/{ad-account-id}/customaudiences
POST /v18.0/{audience-id}/users
```

#### Webhook Events
- `leadgen` - New lead form submission
- `page` - Page updates
- `ad_account` - Campaign changes

#### Rate Limits
- 200 calls per hour per user
- 100M impressions per day per app
- Implement exponential backoff

### 2. Twilio Integration

#### Services Used
- **SMS**: Transactional and marketing messages
- **WhatsApp Business**: Two-way conversations
- **Voice**: Click-to-call functionality
- **Verify**: Phone number verification

#### Configuration
```typescript
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  smsFrom: process.env.TWILIO_SMS_FROM
};
```

#### Webhook Security
```typescript
// Signature validation
const twilioSignature = request.headers['x-twilio-signature'];
const isValid = twilio.validateRequest(
  authToken,
  twilioSignature,
  webhookUrl,
  params
);
```

#### Message Status Callbacks
- `queued` - Message accepted
- `sent` - Message sent to carrier
- `delivered` - Confirmed delivery
- `failed` - Delivery failed
- `undelivered` - Could not deliver

### 3. OpenAI Integration

#### Models Used
- **GPT-4**: Complex content generation, workflow logic
- **GPT-3.5-turbo**: Quick responses, simple tasks
- **text-embedding-3-small**: Semantic search, lead scoring
- **whisper-1**: Voice transcription (planned)

#### Usage Patterns
```typescript
// Content Generation
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 1000,
  functions: customFunctions
});

// Embeddings
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: textToEmbed
});
```

#### Cost Management
- Track token usage per organization
- Set monthly limits
- Use cheaper models when possible
- Cache responses where appropriate

### 4. Stripe Integration

#### Products Used
- **Connect**: Marketplace for gym payments
- **Billing**: SaaS subscriptions
- **Checkout**: Payment forms
- **Customer Portal**: Self-service billing

#### Webhook Events
```typescript
// Subscription events
'customer.subscription.created'
'customer.subscription.updated'
'customer.subscription.deleted'
'invoice.payment_succeeded'
'invoice.payment_failed'

// Connect events
'account.updated'
'account.application.authorized'
'payment_intent.succeeded'
'transfer.created'
```

#### Security Patterns
```typescript
// Webhook signature verification
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  webhookSecret
);

// Idempotency keys
const idempotencyKey = `${organizationId}-${operation}-${timestamp}`;
```

### 5. Resend Email API

#### Configuration
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending
await resend.emails.send({
  from: 'Atlas Fitness <noreply@atlasfitness.com>',
  to: recipient.email,
  subject: subject,
  html: htmlContent,
  tags: [
    { name: 'organization_id', value: organizationId },
    { name: 'category', value: 'transactional' }
  ]
});
```

#### Email Types
- Transactional: Password resets, confirmations
- Marketing: Campaigns, newsletters
- Automated: Workflow emails, notifications

## Common Integration Patterns

### Error Handling
```typescript
export class IntegrationError extends Error {
  constructor(
    public service: string,
    public code: string,
    message: string,
    public isRetryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

// Usage
try {
  const result = await apiCall();
} catch (error) {
  if (error.response?.status === 429) {
    throw new IntegrationError(
      'twilio',
      'RATE_LIMIT',
      'Rate limit exceeded',
      true,
      { retryAfter: error.response.headers['retry-after'] }
    );
  }
  throw error;
}
```

### Rate Limiting
```typescript
// In-memory rate limiter
const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(service: string): RateLimiter {
  if (!rateLimiters.has(service)) {
    const config = RATE_LIMIT_CONFIG[service];
    rateLimiters.set(service, new RateLimiter(config));
  }
  return rateLimiters.get(service)!;
}

// Redis-based for production
export class RedisRateLimiter {
  async checkLimit(key: string, limit: number, window: number) {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, window);
    }
    return count <= limit;
  }
}
```

### Webhook Processing
```typescript
// Generic webhook handler pattern
export async function handleWebhook(
  service: string,
  request: Request
): Promise<Response> {
  // 1. Verify signature
  const isValid = await verifyWebhookSignature(service, request);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Parse event
  const event = await parseWebhookEvent(service, request);
  
  // 3. Queue for processing
  await webhookQueue.add(`${service}-webhook`, event, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  
  // 4. Acknowledge immediately
  return new Response('OK', { status: 200 });
}
```

### Token Management
```typescript
export class TokenManager {
  async getValidToken(
    service: string,
    organizationId: string
  ): Promise<string> {
    // Get from cache
    const cached = await cache.get(`token:${service}:${organizationId}`);
    if (cached && !this.isExpiringSoon(cached)) {
      return cached.access_token;
    }
    
    // Refresh if needed
    const stored = await this.getStoredToken(service, organizationId);
    if (this.canRefresh(stored)) {
      const refreshed = await this.refreshToken(service, stored);
      await this.storeToken(service, organizationId, refreshed);
      return refreshed.access_token;
    }
    
    // Requires re-authorization
    throw new IntegrationError(
      service,
      'TOKEN_EXPIRED',
      'Token expired and cannot be refreshed',
      false
    );
  }
}
```

## Security Considerations

### API Key Storage
- Never commit API keys to version control
- Use environment variables for all secrets
- Encrypt sensitive data in database
- Rotate keys regularly

### Webhook Security
- Always verify signatures
- Use HTTPS endpoints only
- Implement replay attack prevention
- Log all webhook events

### Data Privacy
- Only request necessary scopes
- Implement data retention policies
- Allow users to disconnect integrations
- Provide data export functionality

## Monitoring & Debugging

### Logging
```typescript
// Structured logging for integrations
logger.info('API call', {
  service: 'twilio',
  endpoint: '/Messages',
  organizationId,
  duration: Date.now() - startTime,
  status: response.status
});
```

### Metrics to Track
- API call success/failure rates
- Response times by endpoint
- Rate limit usage
- Token refresh frequency
- Webhook processing time

### Debug Endpoints
```typescript
// Health check endpoint
GET /api/integrations/health
Response: {
  twilio: { status: 'healthy', lastCheck: '...' },
  stripe: { status: 'healthy', lastCheck: '...' },
  openai: { status: 'degraded', error: 'Rate limited' }
}

// Test webhook endpoint
POST /api/integrations/test-webhook
Body: { service: 'twilio', event: 'message.received' }
```

## Future Integrations

### Planned
1. **Google APIs**
   - Calendar for scheduling
   - Maps for location services
   - Analytics for reporting

2. **Fitness Platforms**
   - MyFitnessPal for nutrition
   - Strava for activity tracking
   - Apple Health integration

3. **Payment Providers**
   - PayPal as alternative
   - GoCardless for direct debit
   - Wise for international

4. **Marketing Tools**
   - Mailchimp for email campaigns
   - ActiveCampaign for automation
   - Klaviyo for e-commerce

### Integration Checklist
- [ ] API client wrapper class
- [ ] Error handling and retry logic
- [ ] Rate limiting implementation
- [ ] Webhook handler (if applicable)
- [ ] Token management (if OAuth)
- [ ] Documentation and examples
- [ ] Integration tests
- [ ] Monitoring and alerts