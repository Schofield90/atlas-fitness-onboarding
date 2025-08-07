# API Security Audit Report

Generated: 2025-08-07T08:49:50.424Z

## Summary

- **Critical Issues**: 325
- **High Priority**: 1
- **Medium Priority**: 40
- **Low Priority**: 2

## 🚨 Critical Security Issues

These must be fixed immediately as they pose significant security risks.

### app/api/workflows/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/test-workflow-system/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/test-voice-webhook/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/test-ai-knowledge/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/health/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/workflows/test-trigger/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/workflow-config/tags/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/workflow-config/lead-sources/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/workflow-config/forms/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/workflow-config/email-templates/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/update-webhook-local/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/update-webhook/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/test-template/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/test-response/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/send/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/debug-send/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/whatsapp/check-config/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/twilio-test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/twilio-voice/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/twilio/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/twilio-debug/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/stripe/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/lead-created/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/facebook-leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/form-submitted/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/google-calendar/route.ts
- **Line**: 78
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/webhooks/google-calendar/route.ts
- **Line**: 90
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/webhooks/google-calendar/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/endpoints/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/facebook-lead/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/test/portal-login/route.ts
- **Line**: 13
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/test/portal-login/route.ts
- **Line**: 23
- **Issue**: Potential SQL injection vulnerability
- **Recommendation**: Use parameterized queries or Supabase query builder methods

### app/api/test/portal-login/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/sms/test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/sms/send/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/setup/create-portal-access/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/seed/knowledge-data/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/seed/booking-data/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/public-api/create-lead/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/forms/submit/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/email/test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/email/templates/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/email/send/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/dashboard/metrics-fixed/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/dashboard/metrics/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/dashboard/charts/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/dashboard/birthdays/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/dashboard/activity/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/customers/send-login-link/route.ts
- **Line**: 26
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/customers/send-login-link/route.ts
- **Line**: 37
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/customers/[id]/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/customers/[id]/route.ts
- **Line**: 45
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/customers/[id]/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/client-portal/verify-token/route.ts
- **Line**: 18
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/client-portal/verify-token/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/client-portal/verify-code/route.ts
- **Line**: 20
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/client-portal/verify-code/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/client-portal/direct-claim/route.ts
- **Line**: 17
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/client-portal/direct-claim/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/client-portal/claim/route.ts
- **Line**: 52
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/client-portal/claim/route.ts
- **Line**: 62
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calls/twiml/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/calls/status/route.ts
- **Line**: 41
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calls/status/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/calendar/watch/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/watch/route.ts
- **Line**: 77
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/watch/route.ts
- **Line**: 149
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/watch/route.ts
- **Line**: 185
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 15
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 37
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 58
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 87
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 106
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 121
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 150
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/sync/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/calendar/list/route.ts
- **Line**: 11
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/list/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/calendar/google-events/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/google-events/route.ts
- **Line**: 38
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/availability/route.ts
- **Line**: 50
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/calendar/availability/route.ts
- **Line**: 108
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-webhook/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-twiml/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-openai/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-membership-query/route.ts
- **Line**: 15
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-membership-query/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-membership-query/route.ts
- **Line**: 43
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-membership-query/route.ts
- **Line**: 54
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-membership-query/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-full-call/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-email-log/route.ts
- **Line**: 21
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-email-log/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-email-log/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-call-simple/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-classes-api/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-calendar-api/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/test-calendar-token/route.ts
- **Line**: 22
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-calendar-token/route.ts
- **Line**: 28
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-calendar-token/route.ts
- **Line**: 34
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-booking-count/route.ts
- **Line**: 13
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-booking-count/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-booking-count/route.ts
- **Line**: 25
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/test-booking-count/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/phone-format-check/route.ts
- **Line**: 17
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 32
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 63
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 69
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 83
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/phone-format-check/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/list-portal-access/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/list-portal-access/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/google-calendar-fetch/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/knowledge/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/knowledge/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/knowledge/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/force-delete-all-classes/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/force-delete-all-classes/route.ts
- **Line**: 29
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/force-clean-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/find-customer-by-id/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/find-customer-by-id/route.ts
- **Line**: 35
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/find-customer-by-id/route.ts
- **Line**: 47
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/find-customer-by-id/route.ts
- **Line**: 60
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/find-customer-by-id/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/find-current-week-bookings/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/force-insert/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/email-logs-direct/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-logs-direct/route.ts
- **Line**: 68
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-logs-direct/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/email-log-test/route.ts
- **Line**: 12
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 36
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 43
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 48
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 60
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/email-log-test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/find-booked-class/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/create-test-membership/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/create-sam-membership/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/comprehensive-message-check/route.ts
- **Line**: 18
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/comprehensive-message-check/route.ts
- **Line**: 25
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/comprehensive-message-check/route.ts
- **Line**: 31
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/comprehensive-message-check/route.ts
- **Line**: 57
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/comprehensive-message-check/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/clear-cache/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-wednesday-class/route.ts
- **Line**: 14
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-wednesday-class/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-wednesday-class/route.ts
- **Line**: 33
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-wednesday-class/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-upcoming-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/cleanup-class-types/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-twiml-url/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-table-schema/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 38
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 55
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 71
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 80
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 93
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-membership/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-table/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-table/route.ts
- **Line**: 65
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-in-leads/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-in-leads/route.ts
- **Line**: 16
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-in-leads/route.ts
- **Line**: 22
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-in-leads/route.ts
- **Line**: 28
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-sam-in-leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-portal-access/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-portal-access/route.ts
- **Line**: 16
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-portal-access/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-portal-access/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-sam-client/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-tables/route.ts
- **Line**: 34
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-tables/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-oauth/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-membership-id/route.ts
- **Line**: 11
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-membership-id/route.ts
- **Line**: 21
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-membership-id/route.ts
- **Line**: 28
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-membership-id/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-leads-table/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-leads-table/route.ts
- **Line**: 31
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-leads-table/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-lead-phone-format/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-lead-phone-format/route.ts
- **Line**: 45
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-lead-phone-format/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-knowledge-data/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-inbound-messages/route.ts
- **Line**: 14
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-inbound-messages/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-inbound-messages/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-forms-setup/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-forms-setup/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-forms-setup/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-facebook-data/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 22
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 45
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 54
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 64
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 84
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-customer-memberships/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-email-logs/route.ts
- **Line**: 16
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-email-logs/route.ts
- **Line**: 25
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-conversation-context/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-clients-schema/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-clients-schema/route.ts
- **Line**: 30
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-clients-schema/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-email-logs-table/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-email-logs-table/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-class-sessions-columns/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-calendar-table/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-calendar-table/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-calendar-table/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-class-bookings/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-bookings-structure/route.ts
- **Line**: 17
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-bookings-structure/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-bookings-structure/route.ts
- **Line**: 29
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-bookings-structure/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-booking-refresh/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-all-upcoming-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-calendar-issues/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-all-memberships/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-all-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/calendar-fetch-test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/check-all-membership-tables/route.ts
- **Line**: 27
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-all-membership-tables/route.ts
- **Line**: 39
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-all-membership-tables/route.ts
- **Line**: 51
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-all-membership-tables/route.ts
- **Line**: 72
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/check-all-membership-tables/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/all-message-logs/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/all-message-logs/route.ts
- **Line**: 17
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/all-message-logs/route.ts
- **Line**: 24
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/all-message-logs/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/booking-issue/route.ts
- **Line**: 16
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/booking-issue/route.ts
- **Line**: 22
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/booking-issue/route.ts
- **Line**: 28
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/booking-issue/route.ts
- **Line**: 34
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/booking-issue/route.ts
- **Line**: 44
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/all-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/debug/ai-knowledge-test/route.ts
- **Line**: 14
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/ai-knowledge-test/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/debug/ai-knowledge-test/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/seed-classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/remove-attendee/route.ts
- **Line**: 28
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/remove-attendee/route.ts
- **Line**: 40
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/remove-attendee/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/book/route.ts
- **Line**: 25
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 39
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 50
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 111
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 149
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 177
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/book/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/classes/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/attendees/route.ts
- **Line**: 29
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/attendees/route.ts
- **Line**: 46
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/attendees/route.ts
- **Line**: 61
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/attendees/route.ts
- **Line**: 69
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/attendees/route.ts
- **Line**: 120
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/attendees/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/add-customer/route.ts
- **Line**: 33
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/add-customer/route.ts
- **Line**: 79
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/add-customer/route.ts
- **Line**: 104
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/booking/add-customer/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/reminders/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/auth/google/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/auth/test-client-login/route.ts
- **Line**: 10
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/auth/test-client-login/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/auth/test-client-login/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/automations/workflows/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/appointments/types/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/appointments/staff/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/analytics/track/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/analytics/dashboard/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/ai/workflow-assistant/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/analytics/realtime/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/ai/interview-question/route.ts
- **Line**: 48
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/ai/interview-question/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/admin/run-data-unification/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/ai/test-chat/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/contacts/birthdays/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/contacts/tags/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/admin/fix-sam-final/route.ts
- **Line**: 13
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/admin/fix-sam-final/route.ts
- **Line**: 23
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/admin/fix-sam-final/route.ts
- **Line**: 29
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/admin/fix-sam-final/route.ts
- **Line**: 35
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/admin/fix-sam-final/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/twilio-voice/status/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/meta/leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/webhooks/lookinbody/[organizationId]/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/public-api/booking-data/[organizationId]/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/website/forms/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/sync-leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/sync-pages/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/sync-lead-forms/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/sync-ad-accounts/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/status/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/meta/campaign-insights/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/sync-single-lead/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/sync-leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/sync-form-leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/status/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/save-config/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/register-webhook/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/pages/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/leads/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/get-lead-count/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/lead-forms/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/forms/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/disconnect/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/debug/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/activate-page-webhook/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/integrations/facebook/ad-accounts/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/gyms/[gymId]/programs/route.ts
- **Line**: 19
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/gyms/[gymId]/programs/route.ts
- **Line**: 94
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/gyms/[gymId]/programs/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/calendar/google/connect/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/booking/classes/[organizationId]/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/auth/google/callback/route.ts
- **Line**: 16
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/auth/google/callback/route.ts
- **Line**: 60
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/auth/google/callback/route.ts
- **Line**: 70
- **Issue**: Database query without organization filtering
- **Recommendation**: Add .eq("organization_id", user.organizationId) to filter by organization

### app/api/automations/workflows/[id]/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler

### app/api/automations/workflows/[id]/execute/route.ts
- **Line**: 1
- **Issue**: API route without authentication check
- **Recommendation**: Add authentication check at the beginning of the route handler


## Recommended Security Middleware

```typescript
// middleware/requireAuth.ts
export async function requireAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()
    
  return { user, organizationId: userData?.organization_id }
}

// Use in API routes:
const auth = await requireAuth(request)
if (auth instanceof NextResponse) return auth

// Now you have auth.user and auth.organizationId
```

