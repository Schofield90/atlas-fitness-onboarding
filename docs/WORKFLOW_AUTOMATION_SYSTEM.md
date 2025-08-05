# Workflow Automation System Documentation

## Overview

The Atlas Fitness Onboarding platform includes a complete workflow automation system that allows gyms to automate their lead management, follow-ups, and communication processes.

## System Architecture

### Components

1. **Workflow Builder** (`/app/components/automation/SimpleWorkflowBuilder.tsx`)
   - Visual drag-and-drop interface using React Flow
   - Node-based workflow creation
   - Real-time configuration updates
   - Integration with live data sources

2. **Execution Engine** (`/app/lib/workflow/execution-engine.ts`)
   - Processes workflows triggered by events
   - Handles sequential and conditional execution
   - Error handling and retry logic
   - Execution tracking and logging

3. **Webhook Handlers**
   - `/api/webhooks/lead-created` - Triggers when new leads are added
   - `/api/webhooks/form-submitted` - Triggers on form submissions
   - `/api/webhooks/facebook-lead` - Handles Facebook lead form submissions

4. **Configuration APIs**
   - `/api/workflow-config/forms` - Available forms
   - `/api/workflow-config/lead-sources` - Lead sources
   - `/api/workflow-config/email-templates` - Email templates
   - `/api/workflow-config/tags` - Available tags

## Database Schema

### Tables

1. **workflows**
   ```sql
   - id: UUID
   - name: Text
   - description: Text
   - nodes: JSONB (React Flow nodes)
   - edges: JSONB (React Flow edges)
   - trigger_type: Text
   - trigger_config: JSONB
   - status: Text (draft/active/inactive)
   - organization_id: UUID
   - settings: JSONB
   - total_executions: Integer
   - successful_executions: Integer
   - failed_executions: Integer
   - last_run_at: Timestamp
   ```

2. **workflow_executions**
   ```sql
   - id: UUID
   - workflow_id: UUID
   - organization_id: UUID
   - status: Text (pending/running/completed/failed/cancelled)
   - triggered_by: Text
   - trigger_data: JSONB
   - input_data: JSONB
   - output_data: JSONB
   - error_message: Text
   - execution_steps: JSONB
   - started_at: Timestamp
   - completed_at: Timestamp
   ```

## Workflow Node Types

### Triggers
1. **New Lead** - Fires when a lead is created
   - Configuration: Source filter, tag filter
   
2. **Form Submitted** - Fires on form submission
   - Configuration: Form selection, type filter

### Actions
1. **Send Email**
   - Template selection or custom message
   - Variable substitution ({{name}}, {{email}}, etc.)
   
2. **Send SMS**
   - Custom message with variables
   - Phone number validation
   
3. **Send WhatsApp**
   - Custom message with variables
   - WhatsApp Business API integration
   
4. **Add Tag**
   - Select from existing tags or create new
   - Lead tagging for segmentation
   
5. **Wait**
   - Delay execution (seconds/minutes/hours/days)
   - Useful for follow-up sequences

### Conditions
1. **Field Check**
   - Compare lead fields
   - Operators: equals, contains, greater than, less than
   - Branching logic support

## Setting Up Workflows

### 1. Create a New Workflow

Navigate to `/automations` and click "Create New Workflow":

```javascript
// Example workflow for new lead follow-up
{
  name: "New Lead Welcome Series",
  trigger: {
    type: "lead_created",
    config: {
      source: "website"
    }
  },
  actions: [
    {
      type: "send_email",
      template: "welcome_email"
    },
    {
      type: "wait",
      duration: 1,
      unit: "hours"
    },
    {
      type: "send_sms",
      message: "Hi {{firstName}}, did you get our email?"
    }
  ]
}
```

### 2. Configure Triggers

Select trigger conditions:
- Lead source (website, facebook, manual, etc.)
- Form selection for form submissions
- Tag filters for segmentation

### 3. Add Actions

Drag and drop action nodes:
- Connect nodes with edges
- Configure each action's settings
- Use variables for personalization

### 4. Test Workflows

Use the test page at `/test-workflows`:
- View all active workflows
- Trigger test events
- Monitor execution results

## API Integration

### Triggering Workflows via API

```javascript
// Trigger a workflow when creating a lead
const response = await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+447700900000'
  })
});

// This automatically triggers any workflows with 'lead_created' trigger
```

### Webhook Integration

Configure external services to send webhooks:

```bash
# Facebook Lead Forms
POST https://your-domain.com/api/webhooks/facebook-lead
Headers:
  X-Hub-Signature-256: [Facebook signature]
Body:
  {
    "object": "page",
    "entry": [{
      "changes": [{
        "field": "leadgen",
        "value": {
          "form_id": "123456",
          "leadgen_id": "789012",
          "page_id": "345678"
        }
      }]
    }]
  }
```

## Environment Variables

Required for workflow functionality:

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Facebook (optional)
FACEBOOK_APP_SECRET=xxxxxxxxxxxxx
FACEBOOK_VERIFY_TOKEN=your-verify-token
```

## Testing Workflows

### 1. Using Test Page

Navigate to `/test-workflows`:
- Click "New Lead Created" to simulate a lead
- Click "Form Submitted" to simulate form submission
- View execution results in real-time

### 2. API Testing

```bash
# Test the workflow system
curl https://your-domain.com/api/test-workflow-system

# Test specific trigger
curl -X POST https://your-domain.com/api/workflows/test-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "triggerType": "lead_created",
    "leadData": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "+447700900000"
    }
  }'
```

### 3. Debug Endpoints

- `/api/debug/check-workflows` - List all workflows
- `/api/test-workflow-system` - Comprehensive system test
- `/api/debug/workflow-logs` - View execution logs

## Best Practices

1. **Error Handling**
   - Set error handling to "continue" for non-critical actions
   - Use "stop" for critical paths
   - Monitor failed executions regularly

2. **Performance**
   - Limit wait times to reasonable durations
   - Avoid complex nested conditions
   - Use templates for repeated content

3. **Testing**
   - Test workflows with sample data first
   - Monitor execution logs
   - Use preview/draft mode before activating

4. **Variables**
   - Available variables: {{name}}, {{firstName}}, {{email}}, {{phone}}
   - Custom fields: {{custom.fieldName}}
   - Organization: {{organizationName}}

## Troubleshooting

### Common Issues

1. **Workflow not triggering**
   - Check workflow status is "active"
   - Verify trigger conditions match
   - Check organization ID matches

2. **Actions failing**
   - Verify environment variables are set
   - Check lead has required fields (email/phone)
   - Review execution logs for errors

3. **Database errors**
   - Run migration: `/supabase/workflow-system.sql`
   - Check RLS policies
   - Verify organization exists

### Migration Steps

If workflow_executions table is missing:

```sql
-- Run in Supabase SQL Editor
-- Copy contents of /supabase/workflow-system.sql
```

## Future Enhancements

1. **Planned Features**
   - Webhook action for external integrations
   - CRM field updates
   - Lead scoring actions
   - Advanced branching logic
   - A/B testing for messages
   - Analytics dashboard

2. **Integration Possibilities**
   - Zapier/Make webhooks
   - Slack notifications
   - Calendar event creation
   - Payment processing triggers

## Support

For issues or questions:
1. Check execution logs in workflow_executions table
2. Use debug endpoints for diagnostics
3. Review Vercel function logs for API errors
4. Ensure all environment variables are set correctly