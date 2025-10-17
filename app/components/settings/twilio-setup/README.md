# Twilio Setup Wizard Documentation

## Overview

The Twilio Setup Wizard is a comprehensive step-by-step interface that guides users through setting up Twilio SMS and voice communication for their gym or fitness business. It includes an AI-powered chat helper to assist users throughout the setup process.

## Components

### 1. TwilioSetupPage (`/settings/twilio-setup/page.tsx`)

The main page component that orchestrates the entire setup experience.

**Features:**

- Connection status monitoring
- Settings persistence to database
- Real-time connection testing
- Integration with AI helper

**Key Functions:**

- `fetchSettings()` - Loads existing Twilio configuration from database
- `testConnection()` - Validates Twilio credentials and phone number
- `handleSave()` - Persists configuration securely to database

### 2. TwilioSetupWizard Component

A multi-step wizard interface with visual guides and interactive elements.

**Steps:**

1. **Account Creation** - Instructions for creating a Twilio account
2. **Credentials** - Getting and entering Account SID and Auth Token
3. **Phone Number** - Purchasing and configuring a phone number
4. **Test & Configure** - Connection testing and webhook setup

**Features:**

- Step validation and progression logic
- Copy-to-clipboard functionality for credentials
- Visual guides with screenshots placeholders
- Real-time validation feedback

### 3. TwilioAIHelper Component

An intelligent floating chat assistant that provides contextual help.

**Features:**

- Contextual FAQ system with categorized questions
- Intelligent response generation for Twilio-specific queries
- Floating widget UI that can be minimized/maximized
- Pre-built responses for common setup scenarios

**Supported Query Types:**

- Account creation and verification
- Finding credentials in Twilio Console
- Phone number purchase and configuration
- Webhook setup and troubleshooting
- Pricing and billing questions
- WhatsApp Business API setup

## API Endpoints

### POST `/api/integrations/twilio/test-connection`

Validates Twilio credentials and tests connectivity.

**Request Body:**

```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "phoneNumber": "+1234567890" // optional
}
```

**Response:**

```json
{
  "success": true,
  "accountInfo": {
    "sid": "ACxxx...",
    "friendlyName": "Your Account Name",
    "status": "active",
    "type": "Full",
    "dateCreated": "2023-01-01T00:00:00Z"
  },
  "balance": {
    "currency": "USD",
    "balance": "15.00"
  },
  "phoneNumber": {
    "phoneNumber": "+1234567890",
    "friendlyName": "My Business Line",
    "capabilities": {
      "sms": true,
      "voice": true,
      "mms": false
    },
    "status": "active"
  },
  "availableNumbers": [...],
  "warnings": ["Your account is in trial mode..."],
  "recommendations": ["Add credits to your account..."]
}
```

**Validation Performed:**

- Account SID format validation (starts with 'AC', 34 chars)
- Auth Token authentication
- Account status and balance checks
- Phone number ownership verification
- SMS capability verification

## Database Schema

The wizard uses the `integration_settings` table with the following structure:

```sql
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider VARCHAR NOT NULL, -- 'twilio'
  config JSONB NOT NULL DEFAULT '{}',
  credentials JSONB DEFAULT '{}', -- Encrypted sensitive data
  is_active BOOLEAN DEFAULT FALSE,
  sync_status VARCHAR DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);
```

**Configuration Structure:**

```json
{
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "auth_token": "stored_in_credentials_field",
  "phone_number": "+1234567890",
  "webhook_url": "https://yourdomain.com/api/webhooks/twilio",
  "status_callback_url": "https://yourdomain.com/api/webhooks/twilio/status"
}
```

**Credentials Structure (Encrypted):**

```json
{
  "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "auth_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## Security Features

### Credential Storage

- Sensitive data (Auth Token, Account SID) stored in encrypted `credentials` field
- Public configuration stored in `config` field
- Row-level security (RLS) ensures organization isolation

### Validation

- Input sanitization for all user inputs
- Account SID format validation
- Auth Token length validation
- Phone number format validation
- Connection testing before saving

### Error Handling

- Graceful error messages for common issues
- Rate limiting on API endpoints
- Secure error logging without exposing credentials

## Setup Instructions

### 1. Prerequisites

- Supabase database with `integration_settings` table
- Twilio Node.js SDK installed
- Environment variables for Twilio (optional)

### 2. Installation

```bash
npm install twilio
```

### 3. Environment Setup (Optional)

```env
# For system-wide Twilio functionality
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Usage

```tsx
import TwilioSetupPage from "@/app/settings/twilio-setup/page";

// The component handles all setup logic internally
<TwilioSetupPage />;
```

## Customization Options

### Visual Guides

Replace screenshot placeholders in `TwilioSetupWizard.tsx`:

```tsx
// Replace this placeholder div with actual screenshots
<div className="bg-gray-700 rounded-lg p-8 text-center">
  <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
  <p className="text-gray-400 text-sm">
    Screenshot placeholder: Twilio signup page
  </p>
</div>
```

### AI Helper Responses

Customize responses in `TwilioAIHelper.tsx`:

```tsx
const generateTwilioResponse = (query: string): string => {
  // Add custom logic for your specific use cases
  if (lowercaseQuery.includes("your_custom_keyword")) {
    return "Your custom response here";
  }
  // ...
};
```

### FAQ Categories

Add new FAQ categories in `TwilioAIHelper.tsx`:

```tsx
const TWILIO_FAQS: FAQ[] = [
  {
    question: "Your custom question?",
    answer: "Your detailed answer here.",
    category: "your_category",
  },
  // ...
];
```

## Testing

### Manual Testing

1. Navigate to `/settings/twilio-setup`
2. Follow the wizard steps
3. Test with valid and invalid credentials
4. Verify database storage
5. Test AI helper responses

### Automated Testing

```bash
# Run connection test
curl -X POST http://localhost:3000/api/integrations/twilio/test-connection \
  -H "Content-Type: application/json" \
  -d '{"accountSid": "AC...", "authToken": "..."}'
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify Account SID starts with "AC"
   - Check Auth Token is exactly 32 characters
   - Ensure no extra spaces in credentials

2. **"Phone number not found" error**
   - Verify phone number is purchased in Twilio Console
   - Check phone number format includes country code
   - Ensure number has SMS capabilities

3. **Database connection issues**
   - Verify `integration_settings` table exists
   - Check RLS policies allow user access
   - Ensure organization_id is properly set

4. **AI helper not responding**
   - Check browser console for JavaScript errors
   - Verify component is properly mounted
   - Check if response generation logic is working

### Debug Mode

Enable debug logging by adding to your environment:

```env
NODE_ENV=development
```

This will show additional console logs for troubleshooting.

## Future Enhancements

### Planned Features

- [ ] Real screenshot integration
- [ ] Video tutorials embedded in wizard
- [ ] Advanced webhook configuration UI
- [ ] Twilio Flex integration for call center features
- [ ] WhatsApp Business API setup wizard
- [ ] SMS template management
- [ ] Usage analytics and billing integration
- [ ] Multi-language support for international users

### Integration Opportunities

- [ ] Connect with existing SMS automation workflows
- [ ] Integration with customer communication preferences
- [ ] Link to gym booking system for appointment reminders
- [ ] Connect with payment system for billing notifications

## Support

For issues or feature requests related to the Twilio Setup Wizard:

1. Check the troubleshooting section above
2. Review the AI helper's FAQ responses
3. Check Twilio's official documentation at docs.twilio.com
4. Contact your system administrator

---

_Last updated: [Current Date]_
_Version: 1.0.0_
