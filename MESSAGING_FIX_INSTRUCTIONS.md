# Fix for In-App Messaging System

## Problem
The messaging system is encountering two issues:
1. Missing 'channel' column in the messages table
2. Cookie parsing error with base64 encoded values

## Solutions Applied

### 1. Cookie Parsing Fix
Updated `/app/lib/supabase/client.ts` to properly handle base64 encoded cookies and URL decoding.

### 2. Database Schema Fix
The 'channel' column needs to be added to the messages table. Since we couldn't connect directly to the database, you need to run this migration manually.

## Manual Steps Required

### Step 1: Apply Database Migration
Go to your Supabase Dashboard:
1. Navigate to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/editor
2. Click on "SQL Editor"
3. Paste and run the following SQL:

```sql
-- Add channel column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN channel TEXT NOT NULL DEFAULT 'in_app';
  END IF;
END $$;

-- Add other missing columns for in-app messaging
DO $$
BEGIN
  -- conversation_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
  END IF;

  -- sender_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_type VARCHAR(10) CHECK (sender_type IN ('coach','client'));
  END IF;

  -- message_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','file','system'));
  END IF;
END $$;

-- Update constraint for channel
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check
  CHECK (channel IN ('sms','whatsapp','email','in_app'));
```

### Step 2: Run Full Migration (Optional but Recommended)
For complete messaging system setup, also run the full migration from `/supabase/migrations/20250919_in_app_messaging_unify.sql` in the SQL editor.

### Step 3: Deploy the Code Changes
The cookie parsing fix has been applied to the code. Deploy to Vercel:

```bash
git add -A
git commit -m "Fix in-app messaging: cookie parsing and schema updates"
git push
```

### Step 4: Test the Messaging System
1. Log in as a client at `/client`
2. Navigate to the Messages section
3. Try sending a message to your coach
4. The message should send successfully without errors

## Files Modified
- `/app/lib/supabase/client.ts` - Fixed cookie parsing for base64 encoded values
- `/app/api/admin/fix-messages-schema/route.ts` - Created admin endpoint for schema fixes (optional)

## Additional Notes
- The cookie parsing error was caused by base64 encoded session data not being properly decoded
- The schema error was due to the 'channel' column missing from the messages table
- The migration adds support for in-app messaging between clients and coaches with conversation tracking