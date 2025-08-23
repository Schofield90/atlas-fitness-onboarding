#!/bin/bash

# Get Supabase credentials from environment
source .env.local

echo "Creating Facebook integrations table..."
echo ""
echo "Please run the following SQL in your Supabase SQL Editor:"
echo "=================================================="
echo ""
cat supabase/migrations/20250823_create_facebook_integrations.sql
echo ""
echo "=================================================="
echo ""
echo "To run this SQL:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the SQL above"
echo "4. Click 'Run' to execute"
echo ""
echo "Or if you have psql installed, you can run:"
echo "psql \"$DATABASE_URL\" -f supabase/migrations/20250823_create_facebook_integrations.sql"