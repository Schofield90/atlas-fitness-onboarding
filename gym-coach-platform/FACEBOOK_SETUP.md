# Facebook OAuth Integration Setup Guide

This guide will help you set up the complete Facebook OAuth integration for your gym CRM platform.

## 🚀 Quick Fix for Current Errors

If you're experiencing the database errors mentioned:
- `relation "public.facebook_pages" does not exist`
- `column facebook_pages.is_active does not exist`

**Run this SQL migration in your Supabase database immediately:**

```sql
-- Copy and paste the entire contents of:
-- /lib/supabase/migrations/002_facebook_integration.sql
-- into your Supabase SQL editor and execute
```

## 📋 Prerequisites

1. **Facebook Developer Account**: [developers.facebook.com](https://developers.facebook.com)
2. **Supabase Project**: Running with the base schema
3. **Vercel Deployment**: App deployed at `https://atlas-fitness-onboarding.vercel.app`

## 🔧 Step-by-Step Setup

### 1. Database Migration

Run the Facebook integration migration in Supabase:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire content from `/lib/supabase/migrations/002_facebook_integration.sql`
4. Execute the migration

This creates these tables:
- `facebook_integrations` - OAuth tokens and user info
- `facebook_pages` - Page information with `is_active` column
- `facebook_lead_forms` - Lead generation forms
- `facebook_leads` - Raw Facebook leads
- `facebook_webhooks` - Webhook events
- `facebook_ad_accounts` - Ad account information

### 2. Facebook App Configuration

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Create a new app for "Business"
   - Choose "Business" app type

2. **Add Products**:
   - **Facebook Login**: For OAuth flow
   - **Webhooks**: For real-time lead notifications

3. **Facebook Login Settings**:
   - Valid OAuth Redirect URIs: `https://atlas-fitness-onboarding.vercel.app/api/auth/facebook/callback`

4. **Webhooks Configuration**:
   - Callback URL: `https://atlas-fitness-onboarding.vercel.app/api/facebook/webhook`
   - Verify Token: `atlas-fitness-webhook-2024`
   - Subscribe to: `feed`, `mention`, `leadgen` events

5. **App Review** (for production):
   - Submit for review to get permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `leads_retrieval`
     - `business_management`

### 3. Environment Variables

Add these to your Vercel environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://atlas-fitness-onboarding.vercel.app
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=atlas-fitness-webhook-2024
```

### 4. Deploy Updated Code

The following API routes are now available:

- **OAuth Flow**:
  - `GET /api/auth/facebook` - Initiate OAuth
  - `GET /api/auth/facebook/callback` - Handle callback

- **Facebook Management**:
  - `GET /api/facebook/pages` - List pages
  - `POST /api/facebook/pages` - Manage pages
  - `POST /api/facebook/webhook` - Receive webhooks

### 5. Test the Integration

1. **Initiate OAuth**: Visit `https://atlas-fitness-onboarding.vercel.app/api/auth/facebook`
2. **Complete Flow**: Approve permissions and get redirected back
3. **Check Database**: Verify data is saved in `facebook_integrations` and `facebook_pages`

## 🎯 Features Included

### OAuth Flow
- ✅ Secure OAuth 2.0 with CSRF protection
- ✅ Token storage with expiry tracking
- ✅ Error handling and user feedback

### Page Management
- ✅ Automatic page discovery and storage
- ✅ Primary page selection
- ✅ Active/inactive page management
- ✅ Page refresh functionality

### Lead Generation
- ✅ Real-time webhook processing
- ✅ Automatic lead form creation
- ✅ Facebook lead → CRM lead conversion
- ✅ Lead data validation and processing

### Security
- ✅ Row-level security policies
- ✅ Multi-tenant data isolation
- ✅ Webhook signature verification
- ✅ Token encryption and secure storage

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Ensure the redirect URI in Facebook app matches exactly
   - Check for http vs https mismatch

2. **"Token expired"**
   - Facebook tokens expire; implement token refresh
   - Page tokens typically don't expire

3. **"Webhook verification failed"**
   - Check the webhook verify token matches
   - Ensure the webhook URL is accessible

4. **"Permission denied"**
   - Some permissions require app review
   - Test with a development app first

### Debug Logs:

Check Vercel function logs for detailed error messages:
- Authentication errors
- Facebook API responses
- Database operation results

## 📊 Database Schema Details

### facebook_integrations
- Stores OAuth tokens and user information
- Links users to their Facebook accounts
- Tracks token expiry and refresh

### facebook_pages
- **`is_active`** - Controls whether page is used for lead gen
- **`is_primary`** - Designates the main page for the organization
- Stores page access tokens and permissions

### facebook_leads
- Raw lead data from Facebook
- **Auto-processing** - Triggers convert to CRM leads
- Status tracking (pending/processed/failed)

## 🚀 Next Steps

1. **Run the database migration** to fix immediate errors
2. **Set up Facebook app** with correct URLs
3. **Add environment variables** to Vercel
4. **Test the OAuth flow** end-to-end
5. **Set up webhooks** for real-time lead capture

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify database tables exist
3. Confirm environment variables are set
4. Test Facebook app configuration

The integration supports the complete lead generation workflow from Facebook ads to your CRM system.