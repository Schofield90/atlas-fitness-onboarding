-- Simple fix for facebook_integrations table
-- Just add the missing column if the table exists

ALTER TABLE facebook_integrations 
ADD COLUMN IF NOT EXISTS facebook_user_email TEXT;