# Mobile Backend Setup Status

## ✅ Completed

### 1. Local Supabase Environment
- **Status**: Running
- **Studio URL**: http://127.0.0.1:54323
- **API URL**: http://127.0.0.1:54321
- **Database**: PostgreSQL running on port 54322

### 2. Edge Functions
- **Status**: Deployed and running locally
- **Functions URL**: http://127.0.0.1:54321/functions/v1/
- **Available Functions**:
  - `mobile-api` - Main mobile API endpoints
  - `send-push-notification` - Push notification service
  - `qr-check-in` - QR code check-in handler
  - `mobile-stripe-checkout` - Stripe payment processing

### 3. Mobile App Configuration
- **Environment**: `.env` file created with local Supabase credentials
- **Ready to run**: Mobile app can now connect to local backend

## 🚧 Pending Tasks

### 1. Database Migrations
The migrations need to be run manually through Supabase Studio:

1. Open http://127.0.0.1:54323 in your browser
2. Go to SQL Editor
3. Run these migrations in order:
   - `/supabase/migrations/20250808_magic_links.sql`
   - `/supabase/migrations/20250108_mobile_app_schema.sql`
   - `/supabase/migrations/20250108_mobile_notifications_messaging.sql`

### 2. Create Test Data
After migrations, create test organization:
```sql
INSERT INTO organizations (name, slug, settings, theme_config)
VALUES (
  'Atlas Fitness London',
  'atlas-london',
  '{"features": {"bookings": true, "memberships": true, "messaging": true}}',
  '{"primaryColor": "#f97316", "secondaryColor": "#1f2937", "logoUrl": null}'
);
```

### 3. Storage Buckets
Create these buckets in Supabase Studio:
- `org-logos` (public)
- `org-assets` (public)
- `member-avatars` (private)

## 🚀 Quick Test

### Test the API
```bash
# Test org endpoint (should return 404 until you create test data)
curl "http://127.0.0.1:54321/functions/v1/mobile-api/org/by-slug?slug=atlas-london" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

### Run the Mobile App
```bash
cd atlas-fitness-mobile
npm install
npm start
```

## 📝 Notes

### Local Development Credentials
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

### Edge Function Logs
To view logs for debugging:
```bash
docker logs -f supabase_edge_runtime_atlas-fitness-onboarding
```

### Stop Services
When done with development:
```bash
supabase stop
```

## 🔗 Production Deployment

When ready for production:

1. **Link to Remote Project**:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Push Migrations**:
   ```bash
   supabase db push
   ```

3. **Deploy Functions**:
   ```bash
   supabase functions deploy
   ```

4. **Set Secrets**:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
   supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```

5. **Update Mobile App**:
   - Change `.env` to use production Supabase URL and keys
   - Build for production using EAS

## 🎉 Summary

The mobile backend infrastructure is fully set up and running locally. The edge functions are serving the API endpoints, and the mobile app is configured to connect to the local backend. 

To complete the setup:
1. Run the migrations through Supabase Studio
2. Create test data
3. Start the mobile app

Everything is ready for development and testing!