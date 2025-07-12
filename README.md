# Atlas Fitness Staff Onboarding System

A web application for automating staff onboarding at Schofield Fitness Ltd (trading as Atlas Fitness).

## Features

- **Admin Interface**: Create new employee records and generate unique onboarding links
- **Email Notifications**: Automatically sends onboarding links to new employees
- **Telegram Notifications**: Sends notifications to admin when new onboarding is created
- **Document Review**: Employees can review and sign three employment documents:
  - Statement of Main Terms of Employment
  - Restrictive Covenant Agreement
  - Deductions from Pay Agreement
- **PDF Generation**: Signed documents are automatically converted to PDFs
- **Google Drive Integration**: PDFs are saved to Google Drive for record keeping
- **Expiring Links**: Onboarding links expire after 48 hours for security

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- Resend account for email sending
- Telegram Bot Token
- Google Cloud Service Account with Drive API access
- Vercel account for deployment

### 2. Clone and Install

```bash
git clone <repository-url>
cd atlas-fitness-onboarding
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL editor
3. Copy your project URL and API keys

### 4. Set up Google Drive

1. Create a Google Cloud project
2. Enable the Google Drive API
3. Create a service account and download the JSON key
4. Create a folder in Google Drive called "Staff Documents"
5. Share the folder with your service account email
6. Copy the folder ID from the URL

### 5. Set up Telegram Bot

1. Message @BotFather on Telegram
2. Create a new bot and get the token
3. Your Telegram Chat ID is already set in the code (7840453544)

### 6. Set up Resend

1. Create a Resend account
2. Verify your domain (atlasfitness.co.uk)
3. Create an API key

### 7. Configure Environment Variables

Copy `.env.local` and fill in all values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (Email)
RESEND_API_KEY=re_YOUR_API_KEY

# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=7840453544

# Google Drive
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID=YOUR_FOLDER_ID

# App URL (update for production)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 8. Update Document Templates

The document templates are in `/lib/documents/templates.ts`. Update them with the actual content from your Word documents.

### 9. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to access the admin interface.

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

## Usage

### Admin Flow

1. Go to the main page (/)
2. Fill in new employee details
3. Click "Create Onboarding Link"
4. Employee receives email with link
5. You receive Telegram notification

### Employee Flow

1. Employee clicks link in email
2. Reviews three documents
3. Checks confirmation boxes
4. Types name as signature
5. Submits form
6. Documents are saved to Google Drive

## Security Notes

- The admin interface has no authentication (add security via URL or auth system)
- Onboarding links expire after 48 hours
- Each link can only be used once
- All data is transmitted over HTTPS

## Troubleshooting

### Email not sending
- Check Resend API key
- Verify domain in Resend dashboard
- Check email logs in Resend

### Telegram notifications not working
- Verify bot token is correct
- Make sure bot is not blocked

### Google Drive upload failing
- Check service account permissions
- Verify folder is shared with service account
- Check Google Cloud quotas

### PDF generation issues
- Check console for errors
- Ensure all required fields are filled
- Try with shorter content first

## Support

For issues or questions, please contact the development team.
