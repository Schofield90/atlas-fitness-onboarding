# Meta Messenger Integration

## Overview

This integration allows gym owners to connect their Facebook Pages and manage Messenger conversations directly within the CRM's existing chat interface. Messages are synced in real-time, and users can reply to customers without leaving the platform.

## Features

- ✅ OAuth connect Facebook Pages
- ✅ Real-time webhook ingestion of messages
- ✅ Send text messages and attachments
- ✅ 24-hour messaging policy enforcement
- ✅ Message status tracking (sent, delivered, read)
- ✅ Encrypted token storage
- ✅ Multi-page support per workspace
- ✅ Contact/conversation mapping
- ✅ Messenger badge in chat UI

## Prerequisites

### Meta App Configuration

1. **Create a Meta App** at [developers.facebook.com](https://developers.facebook.com)
2. **Set App to Live Mode** (not Development)
3. **Configure Products**:
   - Add "Messenger" product
   - Add "Webhooks" product

### Required Permissions

Request these permissions at OAuth time:

- `pages_messaging` - Send and receive messages
- `pages_manage_metadata` - Manage page settings
- `pages_read_engagement` - Read page insights
- `pages_show_list` - List user's pages

For production SaaS, you'll need **Advanced Access** for these permissions.

### Webhook Configuration

1. In Meta App Dashboard → Webhooks → Edit Subscription
2. Callback URL: `https://your-app.com/api/webhooks/meta/messenger`
3. Verify Token: Set in `META_VERIFY_TOKEN` env variable
4. Subscribe to fields:
   - `messages`
   - `messaging_postbacks`
   - `message_deliveries`
   - `message_reads`

## Environment Variables

Add to `.env.local`:

```env
# Meta (Facebook) Messenger Integration
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_VERIFY_TOKEN=your_verify_token
META_GRAPH_VERSION=v18.0
META_OAUTH_REDIRECT_URI=https://your-app.com/api/integrations/meta/callback

# Encryption key for tokens (uses SUPABASE_JWT_SECRET as fallback)
ENCRYPTION_KEY=your_32_char_encryption_key
```

## Database Schema

The integration adds these tables:

- `integration_accounts` - Stores connected Facebook Pages
- `channel_identities` - Maps Facebook PSIDs to contacts
- `messenger_conversations` - Conversation threads
- `messenger_messages` - Individual messages
- `webhook_events` - Event log for debugging

Run migration:

```bash
supabase migration up 20250906_meta_messenger_integration
```

## Setup Instructions

### For Users

1. Navigate to **Settings → Integrations → Facebook Messenger**
2. Click **"Connect Page"**
3. Authorize the app and select your Facebook Page
4. Grant required permissions
5. Page will appear as "Connected" in settings
6. Messages will start appearing in the Conversations interface

### For Developers

1. **Local Development**:

   ```bash
   # Start local server
   npm run dev

   # Use ngrok for webhook testing
   ngrok http 3000

   # Update Meta webhook URL to ngrok URL
   ```

2. **Deploy Database Migration**:

   ```bash
   supabase migration up
   ```

3. **Verify Webhook**:
   - Meta will send GET request with `hub.challenge`
   - App must echo the challenge value

## Usage

### Receiving Messages

1. Customer sends message to Facebook Page
2. Meta sends webhook to `/api/webhooks/meta/messenger`
3. App creates/updates:
   - Channel identity (PSID mapping)
   - Contact (lead) if new
   - Conversation thread
   - Message record
4. Message appears in chat UI with Messenger badge

### Sending Messages

1. Agent types message in chat composer
2. App checks 24-hour window
3. If valid, sends via Meta API
4. Updates message status on delivery/read webhooks

### 24-Hour Messaging Policy

Facebook enforces a 24-hour messaging window:

- ✅ Can send within 24 hours of last customer message
- ❌ Cannot send after 24 hours (requires customer to message first)
- UI shows countdown timer and disables composer when expired

## API Endpoints

### OAuth Flow

- `GET /api/integrations/meta/connect` - Start OAuth
- `GET /api/integrations/meta/callback` - OAuth callback
- `POST /api/integrations/meta/disconnect` - Disconnect page

### Webhooks

- `GET /api/webhooks/meta/messenger` - Webhook verification
- `POST /api/webhooks/meta/messenger` - Receive events

### Messaging

- `POST /api/messages/messenger/send` - Send message

## Security

### Token Encryption

- Page access tokens are encrypted using AES-256-GCM
- Encryption key from env variable
- Tokens never logged or exposed

### Webhook Verification

- Signature validation using `x-hub-signature-256` header
- HMAC-SHA256 with app secret
- Timing-safe comparison

### Rate Limiting

- Webhook endpoint rate-limited
- Quick 200 response to avoid retries
- Async processing for heavy operations

## Monitoring

### Health Checks

- Integration status shown in settings
- Error messages displayed for failed tokens
- Webhook events logged for debugging

### Logs

Structured logging with no PII:

```javascript
console.log("Meta webhook received", {
  pageId,
  eventType,
  timestamp,
  // No message content or user data
});
```

## Testing

### Unit Tests

```bash
npm test tests/unit/meta-messenger.test.ts
```

### Integration Tests

```bash
npm test tests/integration/meta-messenger-api.test.ts
```

### E2E Tests

```bash
npm run test:e2e tests/e2e/meta-messenger-flow.spec.ts
```

### Manual Testing

1. **Connect Page**:
   - Use test Facebook account
   - Create test page
   - Complete OAuth flow

2. **Receive Message**:
   - Send message to page from different account
   - Verify appears in chat

3. **Send Reply**:
   - Reply within 24 hours
   - Verify delivery

4. **Test 24-hour Window**:
   - Wait 24+ hours
   - Verify send is blocked

## Troubleshooting

### Common Issues

1. **"No Pages Found"**
   - User needs to be admin of at least one Facebook Page
   - Check page roles in Facebook settings

2. **Webhooks Not Receiving**
   - Verify webhook URL is correct
   - Check verify token matches
   - Ensure app is in Live mode

3. **Token Expired/Revoked**
   - User needs to reconnect
   - Check for "Reconnect" button in settings

4. **24-Hour Window Errors**
   - This is Facebook policy, not a bug
   - Customer must message first to reopen window

### Debug Checklist

- [ ] Meta app is Live (not Development)
- [ ] Webhook URL is publicly accessible
- [ ] Verify token matches in both places
- [ ] Page is subscribed to app
- [ ] Required permissions granted
- [ ] Tokens are encrypted in database
- [ ] 24-hour window calculation is correct

## Limitations (MVP)

- Text and basic attachments only
- No rich messages (templates, quick replies)
- No persistent menu configuration
- Basic profile lookup (name only)
- Single workspace per page

## Future Enhancements

- [ ] Instagram Direct Messages
- [ ] WhatsApp Business
- [ ] Message templates
- [ ] Quick replies
- [ ] Persistent menu
- [ ] Handover protocol for human/bot
- [ ] Broadcast messaging
- [ ] Analytics dashboard

## Compliance

- Respects Facebook's Platform Policy
- Enforces 24-hour messaging window
- No message content in logs
- User data stays within workspace
- Tokens encrypted at rest

## Support

For issues:

1. Check webhook event logs in database
2. Verify integration status in settings
3. Review browser console for errors
4. Check server logs for API errors

---

_Last Updated: September 2025_
_Version: 1.0.0_
