# Atlas Fitness Onboarding - Deployment Guide

## Quick Deploy to Vercel

### Step 1: Push to GitHub
```bash
# If you don't have a GitHub repo yet, create one at github.com
# Then run:
git remote add origin https://github.com/yourusername/atlas-fitness-onboarding.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

## Environment Variables for Vercel

Add these in your Vercel dashboard under Settings > Environment Variables:

### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Email (Required)
```
RESEND_API_KEY=re_your-api-key
```

### Telegram (Required)
```
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=7840453544
```

### Google Drive (Required)
```
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
```

### App URL (Required)
```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

## Setup Services Before Deployment

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Run the schema from `supabase-schema.sql`
5. Go to Settings > API to get your keys

### 2. Resend Setup
1. Go to [resend.com](https://resend.com)
2. Add and verify domain: `atlasfitness.co.uk`
3. Create API key

### 3. Telegram Bot Setup
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Get your bot token
4. The chat ID (7840453544) is already configured

### 4. Google Drive Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or use existing
3. Enable Google Drive API
4. Create Service Account
5. Download JSON key file
6. Create "Staff Documents" folder in Google Drive
7. Share folder with service account email
8. Copy folder ID from URL

## Test Deployment

Once deployed:

1. **Test Admin Interface**: Visit your Vercel URL
2. **Create Test Employee**: Fill out the form
3. **Check Email**: Should receive onboarding email
4. **Check Telegram**: You should get notification
5. **Test Onboarding**: Click link in email
6. **Complete Process**: Sign documents
7. **Verify Google Drive**: Check for saved PDFs

## Troubleshooting

- **Email not sending**: Check Resend dashboard for errors
- **Telegram not working**: Verify bot token and chat ID
- **PDF not saving**: Check Google Drive permissions
- **Database errors**: Verify Supabase schema was applied

## Production Checklist

- [ ] All environment variables set
- [ ] Supabase schema applied
- [ ] Domain verified in Resend
- [ ] Google Drive folder created and shared
- [ ] Telegram bot configured
- [ ] Test employee onboarding completed successfully