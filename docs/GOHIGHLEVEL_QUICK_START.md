# GoHighLevel Integration - Quick Start

## 5-Minute Setup Guide

### Prerequisites
- ✅ AI Chat Agent created in Atlas Fitness
- ✅ GoHighLevel account with API access
- ✅ GoHighLevel calendar for bookings

---

## Step 1: Get Your Webhook URL (30 seconds)

1. Navigate to `https://login.gymleadhub.co.uk/org/[your-org]/crm/ai-chat-agents`
2. Click on your AI agent
3. Click **"Configure"** button
4. Go to **"GoHighLevel"** tab
5. **Copy the webhook URL**:
   ```
   https://login.gymleadhub.co.uk/api/webhooks/ghl/[agent-id]
   ```

---

## Step 2: Configure Agent Settings (2 minutes)

### GHL API Key
1. Go to GoHighLevel: Settings → API → API Keys
2. Click **"Create API Key"**
3. Name: `Atlas Fitness Integration`
4. Scopes: Select these checkboxes
   - ✅ `contacts.write`
   - ✅ `conversations.write`
   - ✅ `conversations.message.write`
   - ✅ `calendars.readonly`
   - ✅ `appointments.write`
5. Copy API key
6. Paste into agent settings → **GHL API Key** field

### Calendar ID
1. In GoHighLevel: Settings → Calendars
2. Click on your "Discovery Call" calendar
3. Copy the calendar ID from URL:
   ```
   https://app.gohighlevel.com/v2/calendars/CALENDAR_ID_HERE/...
   ```
4. Paste into agent settings → **Calendar ID** field

### Enable Features
- ✅ Toggle **"Enable Follow-ups"** ON
- ✅ Toggle **"Enable Booking"** ON
- Click **"Save"**

---

## Step 3: Set Up GoHighLevel Workflow (2 minutes)

### Create Workflow
1. GoHighLevel → Automations → Workflows
2. Click **"New Workflow"**
3. Name: `AI Lead Follow-up`
4. Trigger: **"Inbound Message"**

### Add Webhook Action
1. Click **"+"** to add action
2. Select **"Webhook"**
3. Configure:
   - Method: **POST**
   - URL: *Your webhook URL from Step 1*
   - Content Type: **application/json**
   - Body (copy-paste):
     ```json
     {
       "contact_id": "{{contact.id}}",
       "contact_email": "{{contact.email}}",
       "contact_phone": "{{contact.phone}}",
       "contact_name": "{{contact.full_name}}",
       "firstName": "{{contact.first_name}}",
       "lastName": "{{contact.last_name}}",
       "message": "{{message.body}}",
       "conversation_id": "{{conversation.id}}",
       "location_id": "{{location.id}}",
       "dateAdded": "{{contact.date_added}}"
     }
     ```

4. Click **"Save"**
5. Click **"Publish"** workflow

---

## Step 4: Test It! (30 seconds)

### Quick Test
1. In GoHighLevel, create a test contact
2. Open the contact's conversation
3. Send a test message as the contact:
   ```
   Hi, I'm interested in joining your gym
   ```
4. **Wait 5-10 seconds**
5. You should see an AI-generated response!

---

## Verify It's Working

### Check 1: Lead Created
```sql
SELECT * FROM leads
WHERE source = 'gohighlevel'
ORDER BY created_at DESC
LIMIT 1;
```

### Check 2: Conversation Started
```sql
SELECT * FROM ai_agent_conversations
ORDER BY created_at DESC
LIMIT 1;
```

### Check 3: Messages Exchanged
```sql
SELECT role, content, created_at
FROM ai_agent_messages
WHERE conversation_id = 'your-conversation-id'
ORDER BY created_at;
```

---

## Common Issues & Quick Fixes

### ❌ No AI response after 10 seconds

**Check Vercel logs**:
```bash
# Go to Vercel Dashboard → Logs
# Filter by: /api/webhooks/ghl
# Look for errors
```

**Common cause**: OpenAI API key missing
```bash
# Add to Vercel environment variables:
OPENAI_API_KEY=sk-proj-...
```

---

### ❌ Webhook returns 404

**Fix**: Verify agent is enabled
```sql
SELECT id, name, enabled FROM ai_agents WHERE id = 'your-agent-id';
```

If `enabled = false`, toggle it ON in the UI.

---

### ❌ Message sent to Atlas but not back to GHL

**Fix**: Verify GHL API key is correct
```bash
# Test GHL API directly:
curl https://rest.gohighlevel.com/v1/conversations/[conv-id] \
  -H "Authorization: Bearer YOUR_GHL_API_KEY"

# Should return 200, not 401
```

---

## What Happens Next?

### Automatic Follow-ups
- If lead doesn't respond, AI sends follow-up after 24 hours
- Maximum 3 follow-ups (configurable)
- Scheduled in background via cron job

### Discovery Call Booking
When lead says:
- "I want to book a call"
- "What's the next step?"
- "How do I sign up?"

AI automatically:
1. Checks calendar for available slots
2. Books first available slot (or asks preference)
3. Sends confirmation to lead
4. Updates lead status to `appointment_scheduled`

---

## Advanced Configuration (Optional)

### Webhook Signature Verification (Recommended)
1. Generate secret: `openssl rand -hex 32`
2. Add to agent settings → **Webhook Secret**
3. Add to GHL webhook headers:
   ```
   x-gohighlevel-signature: YOUR_SECRET
   ```

### Custom System Prompt
Edit your agent's system prompt to customize:
- Tone and personality
- Gym-specific information (pricing, programs, hours)
- Qualification questions
- Booking criteria

Example:
```
You are a friendly fitness consultant for [Gym Name].

Key Info:
- Memberships: £49/mo Basic, £89/mo Premium, £129/mo Elite
- Discovery calls: 15 min, Mon-Fri 9am-6pm
- First session free for qualified leads

Tone: Enthusiastic but not pushy, use 1-2 emojis per message.

Book calls when lead asks about:
- Pricing or programs
- Starting dates
- "What's next?" or "How do I join?"
```

---

## Full Documentation

For complete details, troubleshooting, and advanced features:

📖 **[View Complete Integration Guide](./GOHIGHLEVEL_INTEGRATION_GUIDE.md)**

Includes:
- Architecture diagram
- All webhook headers and payload fields
- Database setup queries
- 3 testing methods (cURL, GHL Test Mode, Live Testing)
- Comprehensive troubleshooting (10+ common issues)
- SQL queries for monitoring
- GHL API endpoint reference

---

## Support

**Questions?**
- Email: `sam@atlas-gyms.co.uk`
- GitHub Issues: `atlas-fitness-onboarding` repository

**Urgent Issues?**
- Check Vercel logs first
- Run database verification queries
- Include agent ID and error logs in support request

---

_Setup time: ~5 minutes | Testing time: ~30 seconds | Go live: immediate_ ✅
