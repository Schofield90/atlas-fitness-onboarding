# Webhook Integration Guide

This guide covers implementing and securing webhook endpoints for the Gym Coach Platform's automation system.

## Quick Start

Webhooks allow external systems to trigger automations by sending HTTP POST requests to unique endpoints. Configure webhooks through the Automation Builder and integrate using HMAC-SHA256 signatures for security.

## Endpoint Configuration

### Creating a Webhook Trigger

1. Navigate to Automation Builder
2. Select "Webhook" as your trigger type
3. Configure security settings and content types
4. Copy the generated endpoint URL
5. Save configuration and start receiving webhooks

### Endpoint URL Format

```
https://yourdomain.com/api/automations/webhooks/{workflowId}/{nodeId}
```

**Properties:**
- `workflowId` - Unique automation workflow identifier
- `nodeId` - Specific trigger node within the workflow
- URLs are auto-generated and read-only
- Each webhook endpoint is unique to its trigger

## Security Implementation

### HMAC-SHA256 Signature Verification

All webhook requests must include valid HMAC signatures for authentication.

**Required Headers:**
- `X-Atlas-Signature` - HMAC signature (format: `sha256=hexdigest`)
- `X-Atlas-Timestamp` - Unix timestamp when request was created
- `Content-Type` - Request content type

**Signature Generation Process:**

```javascript
const crypto = require('crypto');

function generateSignature(payload, timestamp, secret) {
  const data = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('hex');
  
  return `sha256=${signature}`;
}

// Example usage
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({ event: 'user_signup', user_id: '12345' });
const signature = generateSignature(payload, timestamp, webhookSecret);
```

### Signature Verification Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret, tolerance = 300) {
  // Check timestamp tolerance (default 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) {
    return { valid: false, reason: 'Timestamp outside tolerance window' };
  }
  
  // Parse signature header
  const [algorithm, providedSignature] = signature.split('=');
  if (algorithm !== 'sha256') {
    return { valid: false, reason: 'Invalid signature algorithm' };
  }
  
  // Generate expected signature
  const data = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('hex');
  
  // Timing-safe comparison
  const providedBuffer = Buffer.from(providedSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  
  if (providedBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: 'Signature length mismatch' };
  }
  
  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  return { valid: isValid, reason: isValid ? null : 'Signature mismatch' };
}
```

## Implementation Examples

### Node.js with Express

```javascript
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const WEBHOOK_SECRET = 'wh_your_webhook_secret_here';
const WEBHOOK_URL = 'https://yourdomain.com/api/automations/webhooks/workflow123/node456';

// Send webhook with proper signature
async function sendWebhook(data) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(data);
  
  // Generate signature
  const signatureData = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signatureData, 'utf8')
    .digest('hex');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atlas-Signature': `sha256=${signature}`,
        'X-Atlas-Timestamp': timestamp.toString(),
        'User-Agent': 'MyApp/1.0 Webhook'
      },
      body: payload
    });
    
    const result = await response.json();
    console.log('Webhook response:', response.status, result);
    
    return { success: response.ok, status: response.status, data: result };
    
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, error: error.message };
  }
}

// Example: Send user signup event
sendWebhook({
  event: 'user_signup',
  user_id: '12345',
  email: 'user@example.com',
  timestamp: new Date().toISOString(),
  source: 'website_form'
});
```

### Python Implementation

```python
import hmac
import hashlib
import json
import time
import requests

class WebhookClient:
    def __init__(self, webhook_url, secret):
        self.webhook_url = webhook_url
        self.secret = secret
    
    def generate_signature(self, payload, timestamp):
        """Generate HMAC-SHA256 signature for webhook request"""
        data = f"{timestamp}.{payload}"
        signature = hmac.new(
            self.secret.encode('utf-8'),
            data.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def send_webhook(self, data):
        """Send webhook with proper authentication"""
        timestamp = int(time.time())
        payload = json.dumps(data, separators=(',', ':'))  # Compact JSON
        signature = self.generate_signature(payload, timestamp)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Atlas-Signature': signature,
            'X-Atlas-Timestamp': str(timestamp),
            'User-Agent': 'PythonApp/1.0 Webhook'
        }
        
        try:
            response = requests.post(
                self.webhook_url,
                data=payload,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            return {
                'success': True,
                'status': response.status_code,
                'data': response.json()
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }

# Example usage
client = WebhookClient(
    webhook_url='https://yourdomain.com/api/automations/webhooks/workflow123/node456',
    secret='wh_your_webhook_secret_here'
)

result = client.send_webhook({
    'event': 'membership_cancelled',
    'member_id': '67890',
    'cancellation_reason': 'moved_away',
    'effective_date': '2024-01-15'
})

print(f"Webhook result: {result}")
```

### cURL Examples

**Basic JSON Webhook:**
```bash
#!/bin/bash

WEBHOOK_URL="https://yourdomain.com/api/automations/webhooks/workflow123/node456"
WEBHOOK_SECRET="wh_your_webhook_secret_here"
TIMESTAMP=$(date +%s)
PAYLOAD='{"event":"payment_received","amount":99.99,"member_id":"12345"}'

# Generate signature
SIGNATURE_DATA="${TIMESTAMP}.${PAYLOAD}"
SIGNATURE=$(echo -n "$SIGNATURE_DATA" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# Send webhook
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Atlas-Signature: sha256=$SIGNATURE" \
  -H "X-Atlas-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

**Form-encoded Webhook:**
```bash
#!/bin/bash

WEBHOOK_URL="https://yourdomain.com/api/automations/webhooks/workflow123/node456"
WEBHOOK_SECRET="wh_your_webhook_secret_here"
TIMESTAMP=$(date +%s)
PAYLOAD="event=class_booking&member_id=12345&class_id=yoga101&booking_time=2024-01-15T10:00:00Z"

# Generate signature
SIGNATURE_DATA="${TIMESTAMP}.${PAYLOAD}"
SIGNATURE=$(echo -n "$SIGNATURE_DATA" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# Send webhook
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Atlas-Signature: sha256=$SIGNATURE" \
  -H "X-Atlas-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

## Rate Limiting and Best Practices

### Rate Limits

- **10 requests per second** per webhook endpoint
- **1MB maximum** request body size
- **30-600 seconds** timestamp tolerance window

### Retry Strategy

Implement exponential backoff for failed webhook deliveries:

```javascript
async function sendWebhookWithRetry(data, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await sendWebhook(data);
      
      if (result.success) {
        return result;
      }
      
      // Don't retry client errors (4xx)
      if (result.status >= 400 && result.status < 500) {
        throw new Error(`Client error: ${result.status}`);
      }
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Security Best Practices

**Secret Management:**
- Store webhook secrets securely (environment variables, key management)
- Rotate secrets regularly using the platform's rotation feature
- Never log or expose secrets in application code

**Request Validation:**
- Always verify HMAC signatures before processing
- Check timestamp tolerance to prevent replay attacks
- Validate request content type and payload structure
- Implement proper error handling and logging

**Network Security:**
- Use HTTPS for all webhook communications
- Configure IP allowlists when possible
- Monitor webhook delivery failures and success rates

## Deduplication Strategies

### Header-based Deduplication

Use unique request identifiers to prevent duplicate processing:

```javascript
// Include unique identifier in request headers
const headers = {
  'Content-Type': 'application/json',
  'X-Atlas-Signature': signature,
  'X-Atlas-Timestamp': timestamp,
  'X-Request-ID': crypto.randomUUID() // Unique identifier
};
```

### JSON Path Deduplication

Extract identifiers from payload data:

```javascript
// Configure webhook to use JSON path: "transaction.id"
const payload = {
  event: 'payment_processed',
  transaction: {
    id: 'txn_unique_12345', // Used for deduplication
    amount: 99.99,
    currency: 'USD'
  },
  member_id: '12345'
};
```

## Error Handling and Debugging

### Common Response Codes

| Code | Meaning | Action |
|------|---------|---------|
| 202 | Accepted | Webhook processed successfully |
| 401 | Unauthorized | Check signature and timestamp |
| 403 | Forbidden | Verify IP allowlist configuration |
| 404 | Not Found | Check webhook is active and URL correct |
| 413 | Payload Too Large | Reduce request body size (max 1MB) |
| 415 | Unsupported Media Type | Use accepted content types |
| 429 | Too Many Requests | Implement rate limiting and backoff |
| 503 | Service Unavailable | Webhook paused or workflow inactive |

### Debugging Checklist

**Signature Issues:**
- [ ] Secret is current (not rotated)
- [ ] Timestamp format is Unix seconds
- [ ] Payload construction: `{timestamp}.{body}`
- [ ] Signature format: `sha256=hexdigest`

**Configuration Issues:**
- [ ] Webhook is active (not paused)
- [ ] Workflow status is active
- [ ] Content type is accepted
- [ ] IP address is allowed (if configured)

**Network Issues:**
- [ ] Endpoint URL is correct
- [ ] HTTPS is used
- [ ] Request timeout is adequate
- [ ] Network connectivity from source

### Logging and Monitoring

```javascript
// Comprehensive webhook logging
function logWebhookAttempt(url, payload, response) {
  const logData = {
    timestamp: new Date().toISOString(),
    webhook_url: url,
    payload_size: Buffer.byteLength(JSON.stringify(payload)),
    response_status: response?.status,
    response_time: response?.responseTime,
    success: response?.ok || false
  };
  
  if (response?.ok) {
    console.log('Webhook success:', logData);
  } else {
    console.error('Webhook failure:', logData, response?.error);
  }
}
```

## Testing Webhooks

### Manual Testing

Use the webhook configuration interface to test endpoints:

1. Configure webhook trigger in Automation Builder
2. Click "Test Webhook" button (when available)
3. Check webhook delivery logs for results
4. Verify automation trigger execution

### Integration Testing

```javascript
// Jest test example
describe('Webhook Integration', () => {
  const webhookClient = new WebhookClient(TEST_WEBHOOK_URL, TEST_SECRET);
  
  test('should successfully deliver valid webhook', async () => {
    const testData = {
      event: 'test_event',
      test_id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    
    const result = await webhookClient.send_webhook(testData);
    
    expect(result.success).toBe(true);
    expect(result.status).toBe(202);
    expect(result.data.status).toBe('success');
  });
  
  test('should reject invalid signature', async () => {
    // Test with invalid secret
    const badClient = new WebhookClient(TEST_WEBHOOK_URL, 'wrong_secret');
    const result = await badClient.send_webhook({ test: true });
    
    expect(result.success).toBe(false);
    expect(result.status).toBe(401);
  });
});
```

## Migration and Updates

### Secret Rotation

When rotating webhook secrets:

1. Use platform rotation feature to generate new secret
2. Update all client applications with new secret
3. Test webhook delivery with new secret
4. Monitor for any signature verification failures

### URL Changes

Webhook URLs are tied to specific workflow and node IDs:
- URLs change when workflows are recreated
- Node IDs change when triggers are reconfigured
- Always use current URLs from the configuration interface

## Related Documentation

- **Automation Builder Triggers**: `/docs/builder-triggers.md`
- **API Reference**: `/docs/api.md`
- **Security Guidelines**: Contact support for security documentation
- **Component Files**: `/components/automations/WebhookTriggerConfig.tsx`
- **API Implementation**: `/app/api/automations/webhooks/[workflowId]/[nodeId]/route.ts`
- **Type Definitions**: `/types/webhook-trigger.ts`