-- ========================================
-- ENHANCED WORKFLOW SYSTEM - DEFAULT DEFINITIONS
-- Migration: 20250812_default_workflow_definitions.sql
-- ========================================

-- Insert default trigger definitions
INSERT INTO workflow_trigger_definitions (
  organization_id, trigger_type, category, name, description, icon,
  config_schema, output_schema, is_active, supports_scheduling, supports_webhook,
  handler_function, version
) VALUES 
-- Lead Management Triggers
(
  NULL, 'lead_created', 'lead_management', 'Lead Created', 
  'Triggered when a new lead is created in the system',
  '👤',
  '{"properties": {"source": {"type": "string", "description": "Lead source filter"}, "tags": {"type": "array", "description": "Required tags"}}}',
  '{"properties": {"lead_id": {"type": "string"}, "lead_data": {"type": "object"}, "source": {"type": "string"}}}',
  true, false, false,
  'handle_lead_created_trigger', '1.0.0'
),
(
  NULL, 'lead_updated', 'lead_management', 'Lead Updated', 
  'Triggered when lead data is modified',
  '✏️',
  '{"properties": {"fields": {"type": "array", "description": "Fields to watch for changes"}}}',
  '{"properties": {"lead_id": {"type": "string"}, "old_data": {"type": "object"}, "new_data": {"type": "object"}, "changed_fields": {"type": "array"}}}',
  true, false, false,
  'handle_lead_updated_trigger', '1.0.0'
),
(
  NULL, 'lead_scored', 'lead_management', 'Lead Scored', 
  'Triggered when lead scoring changes',
  '⭐',
  '{"properties": {"min_score": {"type": "number", "description": "Minimum score threshold"}, "score_change": {"type": "string", "enum": ["increased", "decreased", "any"]}}}',
  '{"properties": {"lead_id": {"type": "string"}, "old_score": {"type": "number"}, "new_score": {"type": "number"}, "score_factors": {"type": "object"}}}',
  true, false, false,
  'handle_lead_scored_trigger', '1.0.0'
),

-- Communication Triggers
(
  NULL, 'message_received', 'communication', 'Message Received', 
  'Triggered when a message is received (SMS, WhatsApp, Email)',
  '💬',
  '{"properties": {"channel": {"type": "string", "enum": ["sms", "whatsapp", "email", "facebook"]}, "keywords": {"type": "array", "description": "Message must contain these keywords"}}}',
  '{"properties": {"message_id": {"type": "string"}, "contact_id": {"type": "string"}, "channel": {"type": "string"}, "content": {"type": "string"}, "sender": {"type": "object"}}}',
  true, false, true,
  'handle_message_received_trigger', '1.0.0'
),
(
  NULL, 'message_sent', 'communication', 'Message Sent', 
  'Triggered after a message is successfully sent',
  '📤',
  '{"properties": {"channel": {"type": "string", "enum": ["sms", "whatsapp", "email", "facebook"]}}}',
  '{"properties": {"message_id": {"type": "string"}, "contact_id": {"type": "string"}, "channel": {"type": "string"}, "status": {"type": "string"}}}',
  true, false, false,
  'handle_message_sent_trigger', '1.0.0'
),

-- Booking Triggers  
(
  NULL, 'appointment_booked', 'booking', 'Appointment Booked', 
  'Triggered when a new appointment is booked',
  '📅',
  '{"properties": {"class_type": {"type": "array", "description": "Filter by class types"}, "instructor": {"type": "array", "description": "Filter by instructors"}}}',
  '{"properties": {"booking_id": {"type": "string"}, "customer_id": {"type": "string"}, "class_id": {"type": "string"}, "booking_time": {"type": "string"}, "class_details": {"type": "object"}}}',
  true, false, false,
  'handle_appointment_booked_trigger', '1.0.0'
),
(
  NULL, 'appointment_cancelled', 'booking', 'Appointment Cancelled', 
  'Triggered when an appointment is cancelled',
  '❌',
  '{"properties": {"cancelled_by": {"type": "string", "enum": ["customer", "staff", "system"]}, "notice_period": {"type": "number", "description": "Hours of notice given"}}}',
  '{"properties": {"booking_id": {"type": "string"}, "customer_id": {"type": "string"}, "class_id": {"type": "string"}, "cancelled_by": {"type": "string"}, "reason": {"type": "string"}}}',
  true, false, false,
  'handle_appointment_cancelled_trigger', '1.0.0'
),
(
  NULL, 'class_reminder', 'booking', 'Class Reminder Time', 
  'Scheduled trigger for class reminders',
  '🔔',
  '{"properties": {"hours_before": {"type": "number", "default": 24, "description": "Hours before class to trigger"}, "class_types": {"type": "array"}}}',
  '{"properties": {"class_id": {"type": "string"}, "attendees": {"type": "array"}, "class_details": {"type": "object"}}}',
  true, true, false,
  'handle_class_reminder_trigger', '1.0.0'
),

-- Form & Survey Triggers
(
  NULL, 'form_submitted', 'forms', 'Form Submitted', 
  'Triggered when a form is submitted',
  '📋',
  '{"properties": {"form_id": {"type": "string", "description": "Specific form ID to watch"}, "required_fields": {"type": "array"}}}',
  '{"properties": {"form_id": {"type": "string"}, "submission_id": {"type": "string"}, "contact_id": {"type": "string"}, "form_data": {"type": "object"}}}',
  true, false, true,
  'handle_form_submitted_trigger', '1.0.0'
),

-- Membership Triggers
(
  NULL, 'membership_expires_soon', 'membership', 'Membership Expiring', 
  'Triggered when membership is about to expire',
  '⏰',
  '{"properties": {"days_before": {"type": "number", "default": 7}, "membership_types": {"type": "array"}}}',
  '{"properties": {"customer_id": {"type": "string"}, "membership_id": {"type": "string"}, "expiry_date": {"type": "string"}, "days_remaining": {"type": "number"}}}',
  true, true, false,
  'handle_membership_expires_trigger', '1.0.0'
),
(
  NULL, 'payment_failed', 'membership', 'Payment Failed', 
  'Triggered when a payment fails',
  '💳',
  '{"properties": {"attempt_number": {"type": "number", "description": "Filter by retry attempt"}}}',
  '{"properties": {"customer_id": {"type": "string"}, "payment_id": {"type": "string"}, "amount": {"type": "number"}, "failure_reason": {"type": "string"}}}',
  true, false, true,
  'handle_payment_failed_trigger', '1.0.0'
),

-- Time-based Triggers
(
  NULL, 'scheduled_time', 'scheduling', 'Scheduled Time', 
  'Triggered at specific times using cron expressions',
  '⏱️',
  '{"properties": {"cron_expression": {"type": "string", "description": "Cron expression for scheduling"}, "timezone": {"type": "string", "default": "UTC"}}}',
  '{"properties": {"scheduled_time": {"type": "string"}, "execution_count": {"type": "number"}}}',
  true, true, false,
  'handle_scheduled_time_trigger', '1.0.0'
),
(
  NULL, 'business_hours', 'scheduling', 'Business Hours', 
  'Triggered during business hours',
  '🏢',
  '{"properties": {"days": {"type": "array", "items": {"type": "string"}}, "start_time": {"type": "string"}, "end_time": {"type": "string"}, "timezone": {"type": "string"}}}',
  '{"properties": {"current_time": {"type": "string"}, "day_of_week": {"type": "string"}}}',
  true, true, false,
  'handle_business_hours_trigger', '1.0.0'
),

-- External Triggers
(
  NULL, 'webhook_received', 'external', 'Webhook Received', 
  'Triggered by external webhook calls',
  '🔗',
  '{"properties": {"endpoint_path": {"type": "string"}, "http_method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE"]}, "required_headers": {"type": "object"}}}',
  '{"properties": {"webhook_id": {"type": "string"}, "payload": {"type": "object"}, "headers": {"type": "object"}, "method": {"type": "string"}}}',
  true, false, true,
  'handle_webhook_received_trigger', '1.0.0'
),

-- Manual Triggers
(
  NULL, 'manual', 'manual', 'Manual Trigger', 
  'Manually triggered workflows',
  '👆',
  '{"properties": {"confirmation_required": {"type": "boolean", "default": false}}}',
  '{"properties": {"triggered_by": {"type": "string"}, "trigger_time": {"type": "string"}, "context": {"type": "object"}}}',
  true, false, false,
  'handle_manual_trigger', '1.0.0'
)

ON CONFLICT (trigger_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config_schema = EXCLUDED.config_schema,
  output_schema = EXCLUDED.output_schema,
  updated_at = NOW();

-- Insert default action definitions
INSERT INTO workflow_action_definitions (
  organization_id, action_type, category, name, description, icon,
  input_schema, output_schema, config_schema, is_active, timeout_seconds, max_retries,
  handler_function, version
) VALUES
-- Communication Actions
(
  NULL, 'send_sms', 'communication', 'Send SMS', 
  'Send SMS message to contact',
  '📱',
  '{"properties": {"contact_id": {"type": "string"}, "phone_number": {"type": "string"}, "message": {"type": "string", "maxLength": 1600}}}',
  '{"properties": {"message_id": {"type": "string"}, "status": {"type": "string"}, "sent_at": {"type": "string"}}}',
  '{"properties": {"from_number": {"type": "string"}, "template_variables": {"type": "object"}}}',
  true, 30, 3,
  'send_sms_action', '1.0.0'
),
(
  NULL, 'send_whatsapp', 'communication', 'Send WhatsApp', 
  'Send WhatsApp message to contact',
  '💚',
  '{"properties": {"contact_id": {"type": "string"}, "phone_number": {"type": "string"}, "message": {"type": "string"}, "template_name": {"type": "string"}}}',
  '{"properties": {"message_id": {"type": "string"}, "status": {"type": "string"}, "sent_at": {"type": "string"}}}',
  '{"properties": {"business_phone_id": {"type": "string"}, "template_variables": {"type": "object"}}}',
  true, 30, 3,
  'send_whatsapp_action', '1.0.0'
),
(
  NULL, 'send_email', 'communication', 'Send Email', 
  'Send email to contact',
  '📧',
  '{"properties": {"contact_id": {"type": "string"}, "email": {"type": "string"}, "subject": {"type": "string"}, "message": {"type": "string"}, "template_id": {"type": "string"}}}',
  '{"properties": {"message_id": {"type": "string"}, "status": {"type": "string"}, "sent_at": {"type": "string"}}}',
  '{"properties": {"from_email": {"type": "string"}, "from_name": {"type": "string"}, "attachments": {"type": "array"}}}',
  true, 60, 3,
  'send_email_action', '1.0.0'
),

-- CRM Actions
(
  NULL, 'add_tags', 'crm', 'Add Tags', 
  'Add tags to a contact or lead',
  '🏷️',
  '{"properties": {"contact_id": {"type": "string"}, "lead_id": {"type": "string"}, "tags": {"type": "array", "items": {"type": "string"}}}}',
  '{"properties": {"added_tags": {"type": "array"}, "contact_id": {"type": "string"}}}',
  '{"properties": {"replace_existing": {"type": "boolean", "default": false}}}',
  true, 15, 2,
  'add_tags_action', '1.0.0'
),
(
  NULL, 'remove_tags', 'crm', 'Remove Tags', 
  'Remove tags from a contact or lead',
  '🗑️',
  '{"properties": {"contact_id": {"type": "string"}, "lead_id": {"type": "string"}, "tags": {"type": "array", "items": {"type": "string"}}}}',
  '{"properties": {"removed_tags": {"type": "array"}, "contact_id": {"type": "string"}}}',
  '{}',
  true, 15, 2,
  'remove_tags_action', '1.0.0'
),
(
  NULL, 'update_lead_status', 'crm', 'Update Lead Status', 
  'Change the status of a lead',
  '🔄',
  '{"properties": {"lead_id": {"type": "string"}, "status": {"type": "string", "enum": ["new", "contacted", "qualified", "converted", "lost"]}}}',
  '{"properties": {"lead_id": {"type": "string"}, "old_status": {"type": "string"}, "new_status": {"type": "string"}}}',
  '{"properties": {"reason": {"type": "string"}}}',
  true, 15, 2,
  'update_lead_status_action', '1.0.0'
),
(
  NULL, 'assign_lead', 'crm', 'Assign Lead', 
  'Assign a lead to a staff member',
  '👥',
  '{"properties": {"lead_id": {"type": "string"}, "staff_id": {"type": "string"}}}',
  '{"properties": {"lead_id": {"type": "string"}, "assigned_to": {"type": "string"}, "assigned_at": {"type": "string"}}}',
  '{"properties": {"notify_assignee": {"type": "boolean", "default": true}}}',
  true, 15, 2,
  'assign_lead_action', '1.0.0'
),

-- Task Management Actions
(
  NULL, 'create_task', 'tasks', 'Create Task', 
  'Create a task for staff members',
  '✅',
  '{"properties": {"title": {"type": "string"}, "description": {"type": "string"}, "assigned_to": {"type": "string"}, "due_date": {"type": "string"}, "priority": {"type": "string"}}}',
  '{"properties": {"task_id": {"type": "string"}, "created_at": {"type": "string"}}}',
  '{"properties": {"notify_assignee": {"type": "boolean", "default": true}, "task_type": {"type": "string"}}}',
  true, 20, 2,
  'create_task_action', '1.0.0'
),

-- Booking Actions
(
  NULL, 'book_appointment', 'booking', 'Book Appointment', 
  'Automatically book an appointment',
  '📅',
  '{"properties": {"customer_id": {"type": "string"}, "class_id": {"type": "string"}, "date": {"type": "string"}, "time": {"type": "string"}}}',
  '{"properties": {"booking_id": {"type": "string"}, "confirmed": {"type": "boolean"}, "booking_time": {"type": "string"}}}',
  '{"properties": {"send_confirmation": {"type": "boolean", "default": true}, "payment_required": {"type": "boolean"}}}',
  true, 30, 2,
  'book_appointment_action', '1.0.0'
),
(
  NULL, 'cancel_appointment', 'booking', 'Cancel Appointment', 
  'Cancel an existing appointment',
  '❌',
  '{"properties": {"booking_id": {"type": "string"}, "reason": {"type": "string"}}}',
  '{"properties": {"booking_id": {"type": "string"}, "cancelled_at": {"type": "string"}, "refund_issued": {"type": "boolean"}}}',
  '{"properties": {"send_notification": {"type": "boolean", "default": true}, "refund_policy": {"type": "string"}}}',
  true, 30, 2,
  'cancel_appointment_action', '1.0.0'
),

-- Data Actions
(
  NULL, 'update_contact_data', 'data', 'Update Contact Data', 
  'Update contact information',
  '👤',
  '{"properties": {"contact_id": {"type": "string"}, "updates": {"type": "object"}}}',
  '{"properties": {"contact_id": {"type": "string"}, "updated_fields": {"type": "array"}}}',
  '{"properties": {"merge_strategy": {"type": "string", "enum": ["replace", "merge", "append"], "default": "merge"}}}',
  true, 20, 2,
  'update_contact_data_action', '1.0.0'
),
(
  NULL, 'log_activity', 'data', 'Log Activity', 
  'Log an activity or event',
  '📝',
  '{"properties": {"contact_id": {"type": "string"}, "activity_type": {"type": "string"}, "description": {"type": "string"}, "metadata": {"type": "object"}}}',
  '{"properties": {"activity_id": {"type": "string"}, "logged_at": {"type": "string"}}}',
  '{}',
  true, 15, 2,
  'log_activity_action', '1.0.0'
),

-- Conditional Actions
(
  NULL, 'conditional_branch', 'logic', 'Conditional Branch', 
  'Branch workflow execution based on conditions',
  '🔀',
  '{"properties": {"condition": {"type": "object"}, "true_path": {"type": "string"}, "false_path": {"type": "string"}}}',
  '{"properties": {"condition_result": {"type": "boolean"}, "selected_path": {"type": "string"}}}',
  '{}',
  true, 10, 1,
  'conditional_branch_action', '1.0.0'
),
(
  NULL, 'wait_delay', 'logic', 'Wait/Delay', 
  'Add a delay before next action',
  '⏳',
  '{"properties": {"duration": {"type": "number"}, "unit": {"type": "string", "enum": ["seconds", "minutes", "hours", "days"]}}}',
  '{"properties": {"waited_until": {"type": "string"}, "duration_ms": {"type": "number"}}}',
  '{}',
  true, 5, 1,
  'wait_delay_action', '1.0.0'
),

-- External Actions
(
  NULL, 'webhook_call', 'external', 'Call Webhook', 
  'Make HTTP request to external service',
  '🌐',
  '{"properties": {"url": {"type": "string"}, "method": {"type": "string"}, "headers": {"type": "object"}, "payload": {"type": "object"}}}',
  '{"properties": {"response_status": {"type": "number"}, "response_body": {"type": "object"}, "execution_time_ms": {"type": "number"}}}',
  '{"properties": {"timeout_seconds": {"type": "number", "default": 30}, "retry_on_failure": {"type": "boolean", "default": true}}}',
  true, 60, 3,
  'webhook_call_action', '1.0.0'
),

-- Utility Actions
(
  NULL, 'calculate_value', 'utility', 'Calculate Value', 
  'Perform calculations with workflow data',
  '🧮',
  '{"properties": {"expression": {"type": "string"}, "variables": {"type": "object"}}}',
  '{"properties": {"result": {"type": ["number", "string", "boolean"]}, "calculation_time_ms": {"type": "number"}}}',
  '{"properties": {"output_type": {"type": "string", "enum": ["number", "string", "boolean"], "default": "number"}}}',
  true, 10, 1,
  'calculate_value_action', '1.0.0'
),
(
  NULL, 'format_text', 'utility', 'Format Text', 
  'Format text using templates and variables',
  '📄',
  '{"properties": {"template": {"type": "string"}, "variables": {"type": "object"}}}',
  '{"properties": {"formatted_text": {"type": "string"}}}',
  '{"properties": {"escape_html": {"type": "boolean", "default": false}}}',
  true, 10, 1,
  'format_text_action', '1.0.0'
)

ON CONFLICT (action_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  config_schema = EXCLUDED.config_schema,
  updated_at = NOW();