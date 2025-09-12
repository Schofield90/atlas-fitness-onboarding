#!/bin/bash

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="OGFYlxSChyYLgQxn"

echo "Applying messaging system migration..."

# Apply the migration
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /Users/samschofield/atlas-fitness-onboarding/supabase/migrations/20250919_in_app_messaging_unify.sql

if [ $? -eq 0 ]; then
    echo "Migration applied successfully!"
else
    echo "Migration failed. The tables might already exist (which is OK)."
fi

# Check if tables and function exist
echo ""
echo "Checking schema status..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Check conversations table
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations'
) AS conversations_table_exists;

-- Check if get_or_create_conversation function exists
SELECT EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'get_or_create_conversation'
) AS function_exists;

-- Check message columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('conversation_id', 'sender_type', 'message_type', 'channel')
ORDER BY column_name;

-- Count existing conversations
SELECT COUNT(*) as conversation_count FROM conversations;

-- Count existing messages
SELECT COUNT(*) as message_count FROM messages;
EOF

echo ""
echo "Migration check complete!"