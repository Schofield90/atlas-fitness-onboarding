# Database Setup - Next Steps

## 🎯 Current Status

We have successfully:
- ✅ Created complete mobile app (React Native + Expo)
- ✅ Set up Supabase backend infrastructure
- ✅ Deployed Edge Functions locally
- ✅ Created all migration files
- ✅ Configured mobile app to connect to backend

## 🚨 IMMEDIATE NEXT STEPS

### 1. Run Database Migrations (CRITICAL)

The database migrations need to be run to create all the required tables. Here's the exact process:

#### Option A: Using Supabase Studio (Recommended)
1. Open http://127.0.0.1:54323 in your browser
2. Go to **SQL Editor** tab
3. Run these migrations **in this exact order**:

##### Step 1: Fix the Core Migration
First, we need to fix the `0001_complete_multi_tenant_schema.sql` migration that has an issue with the users table:

```sql
-- Remove or comment out lines 96-98 in the migration file that try to insert system user
-- The issue is it tries to insert into users table before auth.users exists
```

##### Step 2: Run Migrations in Order
```sql
-- 1. Run the fixed core migration (after removing system user insert)
-- Copy contents of: /supabase/migrations/0001_complete_multi_tenant_schema.sql

-- 2. Run the missing tables migration
-- Copy contents of: /supabase/migrations/0002_missing_tables.sql

-- 3. Run magic links migration
-- Copy contents of: /supabase/migrations/20250808_magic_links.sql

-- 4. Run mobile app core schema
-- Copy contents of: /supabase/migrations/20250108_mobile_app_schema.sql

-- 5. Run mobile notifications schema
-- Copy contents of: /supabase/migrations/20250108_mobile_notifications_messaging.sql
```

#### Option B: Fix Migration Files First
Edit `/supabase/migrations/0001_complete_multi_tenant_schema.sql` and remove lines 96-98:
```sql
-- DELETE THESE LINES:
-- Create system user for automation
INSERT INTO users (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'system@atlas-fitness.com', 'System')
ON CONFLICT DO NOTHING;
```

Then run:
```bash
supabase db reset
```

### 2. Create Initial Test Data

After migrations are successful, create test data:

```sql
-- Create test organization
INSERT INTO organizations (name, slug, settings, theme_config)
VALUES (
  'Atlas Fitness London',
  'atlas-london',
  '{
    "features": {
      "bookings": true,
      "memberships": true,
      "messaging": true,
      "waitlist": true,
      "qr_checkin": true
    }
  }'::jsonb,
  '{
    "primaryColor": "#f97316",
    "secondaryColor": "#1f2937",
    "logoUrl": null,
    "fontFamily": "Inter"
  }'::jsonb
);

-- Create test user (you'll need to sign up through the app first)
-- Then link them to the organization

-- Create notification templates
INSERT INTO notification_templates (organization_id, name, type, title_template, body_template, trigger_hours_before, active)
SELECT 
  id,
  'Class Reminder',
  'booking_reminder',
  'Reminder: {{class_name}} at {{time}}',
  'Don''t forget your {{class_name}} class with {{instructor}} at {{location}}! See you soon 💪',
  2,
  true
FROM organizations
WHERE slug = 'atlas-london';

INSERT INTO notification_templates (organization_id, name, type, title_template, body_template, active)
SELECT 
  id,
  'Waitlist Promotion',
  'waitlist_promotion',
  'You''re off the waitlist! 🎉',
  'Great news! A spot opened up in {{class_name}} at {{time}}. Your booking is confirmed!',
  true
FROM organizations
WHERE slug = 'atlas-london';

-- Create test locations
INSERT INTO locations (organization_id, name, address, city, postal_code, country, latitude, longitude)
SELECT 
  id,
  'Atlas Fitness Central',
  '123 High Street',
  'London',
  'W1A 1AA',
  'UK',
  51.5074,
  -0.1278
FROM organizations
WHERE slug = 'atlas-london';

-- Create test instructors
INSERT INTO instructors (organization_id, full_name, email, bio, specialties)
SELECT 
  id,
  'Sarah Johnson',
  'sarah@atlas-fitness.com',
  'Certified personal trainer with 10+ years experience in HIIT and strength training.',
  ARRAY['HIIT', 'Strength Training', 'Yoga']
FROM organizations
WHERE slug = 'atlas-london';

-- Create test classes
INSERT INTO classes (organization_id, name, description, duration_minutes, category, difficulty_level, max_capacity)
SELECT 
  id,
  'Morning HIIT Blast',
  'High-intensity interval training to kickstart your day!',
  45,
  'HIIT',
  'intermediate',
  20
FROM organizations
WHERE slug = 'atlas-london';

-- Create test membership plans
INSERT INTO membership_plans (organization_id, name, description, price_pennies, billing_period, benefits)
SELECT 
  id,
  'Unlimited Monthly',
  'Unlimited access to all classes',
  9900, -- £99
  'monthly',
  ARRAY['Unlimited classes', 'Free guest passes', 'Priority booking']
FROM organizations
WHERE slug = 'atlas-london';
```

### 3. Create Storage Buckets

In Supabase Studio, go to **Storage** and create these buckets:

```sql
-- Run in SQL Editor to create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('org-logos', 'org-logos', true),
  ('org-assets', 'org-assets', true),
  ('member-avatars', 'member-avatars', false),
  ('class-images', 'class-images', true),
  ('instructor-photos', 'instructor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Public read access for org logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "Public read access for class images" ON storage.objects
  FOR SELECT USING (bucket_id = 'class-images');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'member-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'member-avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 4. Enable Realtime

Enable realtime for tables that need live updates:

```sql
-- In SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE member_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE member_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE class_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

### 5. Test the Setup

#### Test Organization API:
```bash
curl "http://127.0.0.1:54321/functions/v1/mobile-api/org/by-slug?slug=atlas-london" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

Should return:
```json
{
  "org_id": "...",
  "name": "Atlas Fitness London",
  "theme": {
    "primaryColor": "#f97316",
    "secondaryColor": "#1f2937",
    "logoUrl": null
  },
  "features": {
    "bookings": true,
    "memberships": true,
    "messaging": true
  }
}
```

#### Test Mobile App:
```bash
cd atlas-fitness-mobile
npm start
```

1. Use invite code: `atlas-london`
2. Sign up with email
3. Complete profile
4. You should see the dashboard!

### 6. Production Deployment (When Ready)

#### Link to Remote Supabase Project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

#### Push Everything to Remote:
```bash
# Push database schema
supabase db push

# Deploy edge functions
supabase functions deploy

# Set production secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_xxx
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
```

#### Update Mobile App for Production:
1. Update `.env` with production URLs and keys
2. Update `app.json` with production configuration
3. Build with EAS:
   ```bash
   eas build --platform all --profile production
   eas submit
   ```

## 🐛 Troubleshooting

### Migration Errors
- **"users table violates foreign key"**: Remove the system user insert from migration
- **"extension already exists"**: Safe to ignore, extensions are idempotent
- **"table already exists"**: Run `supabase db reset` to start fresh

### Edge Function Issues
- Check logs: `docker logs -f supabase_edge_runtime_atlas-fitness-onboarding`
- Restart functions: `supabase functions serve --no-verify-jwt`

### Mobile App Can't Connect
- Ensure `.env` has correct URLs
- Check if Supabase is running: `supabase status`
- Verify edge functions are running on port 54321

## 📋 Checklist

- [ ] Fix migration file (remove system user insert)
- [ ] Run all migrations in order
- [ ] Create test organization data
- [ ] Create storage buckets
- [ ] Enable realtime subscriptions
- [ ] Test API endpoints
- [ ] Run mobile app and test connection
- [ ] Create first user account
- [ ] Test booking flow
- [ ] Test QR check-in
- [ ] Test push notifications

## 🎉 Success Criteria

You know everything is working when:
1. Mobile app can fetch organization by slug
2. Users can sign up and log in
3. Dashboard shows with proper theme colors
4. QR code displays and refreshes
5. Class schedule loads
6. Bookings can be created
7. Messages can be sent

## 📞 Support

If you encounter issues:
1. Check Supabase logs in Docker
2. Review edge function logs
3. Check mobile app console for errors
4. Verify all migrations ran successfully
5. Ensure test data was created

The system is fully built and ready - just needs the database schema deployed!