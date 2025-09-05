#!/bin/bash

echo "==============================================="
echo " Landing Page Builder Setup"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking database tables...${NC}"
node test-landing-pages-db.js

echo ""
echo -e "${YELLOW}Step 2: Migration Instructions${NC}"
echo "-----------------------------------------------"
echo ""
echo "The landing page tables need to be created in your Supabase database."
echo ""
echo -e "${GREEN}To create the tables:${NC}"
echo ""
echo "1. Open your Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new"
echo ""
echo "2. Copy the SQL migration file content:"
echo "   Location: supabase/migrations/20250105_landing_page_builder.sql"
echo ""
echo "3. Paste it in the SQL editor and click 'RUN'"
echo ""
echo "-----------------------------------------------"
echo ""
read -p "Press Enter once you've run the migration to verify..."

echo ""
echo -e "${YELLOW}Step 3: Verifying setup...${NC}"
node test-landing-pages-db.js

echo ""
echo -e "${GREEN}Step 4: Testing OpenAI Integration...${NC}"
node test-openai.js

echo ""
echo "==============================================="
echo -e "${GREEN} Setup Complete!${NC}"
echo "==============================================="
echo ""
echo "You can now access the Landing Page Builder at:"
echo "http://localhost:3002/landing-pages"
echo ""
echo "Features available:"
echo "✅ Drag & drop page building"
echo "✅ AI template generation from URLs"
echo "✅ 8 pre-built components"
echo "✅ Save, publish, and manage pages"
echo "✅ Form submissions tracking"
echo ""