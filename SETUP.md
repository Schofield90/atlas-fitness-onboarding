# Atlas Fitness Onboarding Setup Guide

## Project Overview
This is an AI-powered gym CRM platform built with Next.js 15, TypeScript, and Supabase for Atlas Fitness. It provides complete employee onboarding automation with document management, email notifications, and database integration.

## Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Resend account (for emails)
- Optional: Telegram bot, Google Drive service account

## 1. Environment Setup

### Required Environment Variables
Copy the `.env.local` file and update with your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Resend Email API
RESEND_API_KEY=re_your_api_key_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Environment Variables
```bash
# Telegram Bot (for admin notifications)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Google Drive Integration
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id_here
```

## 2. Supabase Setup

### Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys from Settings > API

### Database Schema
Run the following SQL in your Supabase SQL editor:

```sql
-- Create employees table
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT NOT NULL,
  annual_salary DECIMAL(10, 2) NOT NULL,
  hours_per_week INTEGER NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  postcode TEXT NOT NULL,
  national_insurance_number TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  sort_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create onboarding_sessions table
CREATE TABLE onboarding_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  signature_name TEXT,
  signature_date DATE,
  documents_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_onboarding_token ON onboarding_sessions(token);
CREATE INDEX idx_onboarding_expires ON onboarding_sessions(expires_at);
CREATE INDEX idx_employee_email ON employees(email);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
```

### Storage Setup (Optional)
If you want to store employer signatures:
1. Go to Storage in Supabase
2. Create a bucket named `signatures`
3. Set appropriate policies for public access

## 3. Email Setup (Resend)

1. Create account at [Resend](https://resend.com)
2. Get your API key from the dashboard
3. Verify your domain or use the sandbox domain for testing

## 4. Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 5. Usage

### Admin Interface
- Access the admin panel at `http://localhost:3000`
- Add new employees and generate onboarding links
- Links expire after 48 hours

### Employee Onboarding
- Employees receive email with unique onboarding link
- Complete forms with personal details and signatures
- System automatically generates employment documents

## 6. Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables for Production
- Set all environment variables in your deployment platform
- Update `NEXT_PUBLIC_APP_URL` to your production URL

## 7. Features

- **Employee Management**: Add employees with job details
- **Automated Onboarding**: Generate secure onboarding links
- **Document Generation**: PDF generation for employment contracts
- **Email Notifications**: Automated email sending via Resend
- **Database Integration**: Full Supabase integration with TypeScript
- **Secure Tokens**: Expiring onboarding links (48 hours)
- **Form Validation**: Complete form validation with Zod
- **File Upload**: Employer signature upload support

## 8. Security

- Row Level Security (RLS) enabled on all tables
- Secure token-based onboarding access
- Environment variables for all sensitive data
- HTTPS enforced in production

## 9. Troubleshooting

### Common Issues
1. **Database Connection**: Check Supabase URL and keys
2. **Email Sending**: Verify Resend API key and domain
3. **Build Errors**: Run `npm run build` to check for TypeScript errors
4. **Token Expiry**: Onboarding links expire after 48 hours

### Support
For issues or questions, contact the development team or check the project documentation.