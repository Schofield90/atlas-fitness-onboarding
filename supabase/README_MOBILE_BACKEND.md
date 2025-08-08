# Mobile App Backend Setup with Supabase CLI

This guide will help you set up the complete backend infrastructure for the Atlas Fitness mobile app using Supabase CLI.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Supabase account and project created
- Access to your Supabase project credentials

## 1. Initial Setup

### Login to Supabase
```bash
supabase login
```

### Link to your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Run Database Migrations

Run these migrations in order to set up the mobile app schema:

```bash
# 1. Mobile app core tables (preferences, devices, QR tokens, check-ins)
supabase db push --file migrations/20250108_mobile_app_schema.sql

# 2. Notifications and messaging tables
supabase db push --file migrations/20250108_mobile_notifications_messaging.sql

# 3. Magic links for passwordless auth (if not already run)
supabase db push --file migrations/20250808_magic_links.sql
```

## 3. Deploy Edge Functions

Deploy the serverless functions that power the mobile API:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually:
supabase functions deploy mobile-api
supabase functions deploy send-push-notification
supabase functions deploy qr-check-in
supabase functions deploy mobile-stripe-checkout
```

## 4. Set Environment Variables

Set the required environment variables for your functions:

```bash
# Stripe keys for payments
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

# Twilio for SMS (if using)
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_SMS_FROM=+44xxx

# Expo Push Notifications (optional - can use Expo's service)
supabase secrets set EXPO_ACCESS_TOKEN=xxx
```

## 5. Configure Storage Buckets

Create storage buckets for organization assets:

```bash
# Create buckets via Supabase Dashboard or SQL:
```

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('org-logos', 'org-logos', true),
  ('org-assets', 'org-assets', true),
  ('member-avatars', 'member-avatars', false);
```

## 6. Set Up Row Level Security (RLS)

The migrations include RLS policies, but verify they're enabled:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 7. Create Test Data

For development, create some test data:

```sql
-- Create test organization
INSERT INTO organizations (name, slug, settings, theme_config)
VALUES (
  'Atlas Fitness London',
  'atlas-london',
  '{"features": {"bookings": true, "memberships": true, "messaging": true}}',
  '{"primaryColor": "#f97316", "secondaryColor": "#1f2937", "logoUrl": null}'
);

-- Create test notification templates
INSERT INTO notification_templates (organization_id, name, type, title_template, body_template, trigger_hours_before)
SELECT 
  id,
  'Class Reminder',
  'booking_reminder',
  'Reminder: {{class_name}} at {{time}}',
  'Don''t forget your {{class_name}} class with {{instructor}} at {{location}}!',
  2
FROM organizations
WHERE slug = 'atlas-london';
```

## 8. Enable Realtime

Enable realtime for tables that need live updates:

```sql
-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE member_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE member_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE class_sessions;
```

## 9. Mobile App Configuration

Update your mobile app's environment variables:

```env
# .env in atlas-fitness-mobile
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

## 10. Test the Setup

### Test Mobile API
```bash
# Get organization by slug
curl https://YOUR_PROJECT.supabase.co/functions/v1/mobile-api/org/by-slug?slug=atlas-london \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test authenticated endpoints (need valid JWT)
curl https://YOUR_PROJECT.supabase.co/functions/v1/mobile-api/me \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "X-Organization-Id: ORG_UUID"
```

### Test QR Token Generation
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/mobile-api/qr-token \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "X-Organization-Id: ORG_UUID"
```

## 11. Monitoring and Logs

View function logs:
```bash
supabase functions logs mobile-api --tail
```

## 12. Production Checklist

- [ ] All migrations run successfully
- [ ] Edge functions deployed
- [ ] Environment variables set
- [ ] Storage buckets created with proper policies
- [ ] RLS enabled on all tables
- [ ] Realtime enabled for required tables
- [ ] API endpoints tested
- [ ] Push notification certificates uploaded (iOS)
- [ ] Stripe webhook endpoints configured
- [ ] Database backups enabled

## Troubleshooting

### Function not working
```bash
# Check function status
supabase functions list

# View logs
supabase functions logs FUNCTION_NAME

# Redeploy
supabase functions deploy FUNCTION_NAME
```

### Migration errors
```bash
# Reset database (CAUTION: deletes all data)
supabase db reset

# Run migrations again
supabase db push
```

### RLS issues
- Check user has proper role in user_organizations table
- Verify auth token is being passed correctly
- Use service role key for debugging (bypasses RLS)

## Mobile-Specific API Endpoints

All endpoints are prefixed with `/functions/v1/mobile-api/`

- `GET /org/by-slug?slug={slug}` - Get org details and theme
- `GET /me` - Get member profile, memberships, credits
- `GET /schedule` - Get class schedule with filters
- `POST /bookings` - Create booking
- `DELETE /bookings/{id}` - Cancel booking
- `GET /bookings/my` - Get user's bookings
- `POST /waitlist` - Join waitlist
- `GET /qr-token` - Generate QR for check-in
- `GET /stats` - Get member statistics
- `POST /device` - Register device for push
- `GET /settings` - Get notification preferences
- `POST /settings` - Update preferences
- `GET /messages` - Get message thread
- `POST /messages` - Send message

## Next Steps

1. Configure push notification certificates in Supabase Dashboard
2. Set up Stripe webhooks to handle payment events
3. Create cron jobs for:
   - Sending class reminders
   - Processing waitlist promotions
   - Cleaning up expired QR tokens
4. Enable database backups and point-in-time recovery
5. Set up monitoring and alerting