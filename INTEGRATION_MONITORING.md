# Integration Monitoring Dashboard

A comprehensive monitoring system for tracking the health and performance of all platform integrations in the Atlas Fitness SaaS platform.

## Overview

The integration monitoring dashboard provides real-time visibility into:
- Google Calendar integration status
- WhatsApp/Twilio messaging service
- Facebook Ads API connectivity
- Email (SMTP) service health
- Webhook delivery tracking
- Stripe payment processing
- OAuth token expiration monitoring
- API quota and rate limit tracking
- Automated health checks and alerting

## Files Created

### 1. Main Dashboard Page
**Location**: `/app/saas-admin/integrations/page.tsx`

Features:
- Real-time status grid for all integrations
- Error logs with tenant context
- API usage vs quotas visualization
- Webhook delivery rates
- Failed authentication tracking
- Mass token refresh capabilities
- Tabbed interface (Overview, Error Logs, Token Status, Webhooks)

### 2. Health Check API
**Location**: `/app/api/saas-admin/integrations/health-check/route.ts`

Capabilities:
- Tests connectivity for each integration
- Validates authentication status
- Checks API quotas and rate limits
- Measures response times
- Stores health check results in database
- Supports manual and automated health checks

### 3. Token Refresh System
**Location**: `/app/api/saas-admin/integrations/refresh-tokens/route.ts`

Features:
- Bulk OAuth token refresh for Google Calendar
- Facebook long-lived token extension
- Automatic expiry detection
- Tenant-specific token management
- Refresh operation logging
- Error handling and retry logic

### 4. Webhook Monitoring
**Location**: `/app/api/saas-admin/webhooks/retry-failed/route.ts`

Functionality:
- Failed webhook detection and logging
- Automatic retry mechanisms
- Configurable retry limits
- Delivery success tracking
- Endpoint timeout handling
- Tenant-specific webhook management

### 5. Statistics API
**Location**: `/app/api/saas-admin/integrations/stats/route.ts`

Provides:
- Real-time integration statistics
- Tenant count per integration
- Error rate calculations
- Success rate metrics
- API quota usage
- Rate limit monitoring
- Trend analysis

### 6. Alerting System
**Location**: `/app/api/saas-admin/integrations/alerts/route.ts`

Alert Types:
- Error rate thresholds
- Success rate degradation
- Token expiration warnings
- API quota limits
- Webhook failure rates
- Rate limit violations

Notification Methods:
- Email alerts
- Webhook notifications
- SMS alerts (configurable)

### 7. Monitoring Service
**Location**: `/app/lib/monitoring/integration-monitor.ts`

Background Service:
- Automated health checks every 5 minutes
- Alert condition evaluation every 2 minutes
- Metrics collection and storage
- Trend analysis
- Auto-start in production

### 8. Database Schema
**Location**: `/scripts/create-monitoring-tables.sql`

Tables Created:
- `integration_health_logs` - Health check results
- `token_refresh_logs` - Token refresh operations
- `webhook_failures` - Failed webhook tracking
- `webhook_delivery_logs` - Delivery attempt logs
- `webhook_retry_logs` - Retry operation history
- `integration_alert_rules` - Alert configuration
- `integration_alert_triggers` - Alert trigger history
- `integration_metrics` - Time-series performance data

## Setup Instructions

### 1. Database Setup
Run the SQL script to create required tables:
```bash
psql -d your_database -f scripts/create-monitoring-tables.sql
```

### 2. Environment Variables
Add these environment variables to your `.env.local`:
```env
# Monitoring Configuration
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
MONITORING_ENABLED=true

# Integration API Keys (if not already configured)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
STRIPE_SECRET_KEY=your_stripe_key
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

### 3. Access the Dashboard
Navigate to: `https://your-domain.com/saas-admin/integrations`

Only authorized admin emails can access:
- sam@atlas-gyms.co.uk
- sam@gymleadhub.co.uk

## Features

### Real-time Monitoring
- Live status updates every 30 seconds
- Color-coded status indicators
- Automatic refresh capabilities
- Real-time error logging

### Health Checks
- Manual and automated health checks
- Integration-specific test procedures
- Response time measurement
- Connectivity validation
- Authentication verification

### Token Management
- OAuth token expiry tracking
- Automatic refresh capabilities
- Mass token refresh operations
- Token health status
- Expiry notifications

### Webhook Monitoring
- Failed delivery tracking
- Automatic retry system
- Configurable retry limits
- Success rate monitoring
- Endpoint availability checks

### Alert System
- Configurable alert rules
- Multiple notification methods
- Severity-based alerting
- Alert acknowledgment
- Historical alert tracking

### API Monitoring
- Quota usage tracking
- Rate limit monitoring
- Usage trend analysis
- Threshold alerts
- Performance metrics

## Usage

### Creating Alert Rules
1. Navigate to the Alerts tab
2. Click "Create Alert Rule"
3. Configure conditions and thresholds
4. Set notification preferences
5. Add recipient email addresses

### Manual Health Checks
1. Go to the Overview tab
2. Click "Health Check" next to any integration
3. View results in real-time
4. Check error logs for failures

### Token Refresh
1. Navigate to the Token Status tab
2. View token expiry status
3. Use "Refresh All Tokens" or individual refresh
4. Monitor refresh operation logs

### Webhook Management
1. Go to the Webhooks tab
2. View delivery statistics
3. Retry failed webhooks
4. Configure retry settings

## Monitoring Best Practices

### Alert Configuration
- Set realistic thresholds based on normal usage
- Use escalating severity levels
- Configure multiple notification channels
- Test alert rules regularly

### Token Management
- Monitor token expiry 24 hours in advance
- Set up automatic refresh schedules
- Have backup authentication methods
- Log all token operations

### Webhook Reliability
- Implement exponential backoff
- Set reasonable timeout values
- Monitor endpoint availability
- Have fallback mechanisms

### Performance Monitoring
- Track response time trends
- Monitor error rate patterns
- Set quota usage alerts
- Analyze usage patterns

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Verify API credentials
   - Check network connectivity
   - Review rate limit status
   - Validate endpoint URLs

2. **Token Refresh Errors**
   - Check OAuth app configuration
   - Verify refresh token validity
   - Review permission scopes
   - Check API version compatibility

3. **Webhook Failures**
   - Validate endpoint availability
   - Check SSL certificate validity
   - Review payload format
   - Verify authentication headers

### Logs and Debugging
- Check browser console for frontend errors
- Review server logs for API failures
- Monitor database for constraint violations
- Use health check results for diagnostics

## Security Considerations

- All monitoring endpoints require admin authentication
- Database tables use Row Level Security (RLS)
- API keys are encrypted in transit
- Webhook payloads are validated
- Alert data is sanitized

## Future Enhancements

- Machine learning for anomaly detection
- Advanced visualization dashboards
- Mobile alert notifications
- Integration-specific custom checks
- Performance benchmarking
- Automated remediation actions

## Support

For issues or questions about the monitoring system:
1. Check the error logs in the dashboard
2. Review the health check results
3. Consult the database logs
4. Contact the development team

This monitoring system provides comprehensive visibility into all platform integrations, enabling proactive issue detection and rapid response to integration failures.