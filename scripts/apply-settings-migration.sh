#!/bin/bash

# Apply Settings Enhancement Migration Script
# This script applies the new settings tables and features to your Supabase project

echo "=========================================="
echo "Atlas Fitness CRM - Settings Enhancement Migration"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Please install it first: brew install supabase/tap/supabase"
    exit 1
fi

# Function to run migration
apply_migration() {
    echo -e "${YELLOW}Applying settings enhancement migration...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "supabase/config.toml" ]; then
        echo -e "${RED}Error: Not in a Supabase project directory${NC}"
        echo "Please run this script from the project root"
        exit 1
    fi
    
    # Apply the migration
    echo "Running migration: 20250817_settings_enhancement.sql"
    
    # Use supabase db push to apply migrations
    supabase db push
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration applied successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed${NC}"
        echo "Please check the error messages above"
        exit 1
    fi
}

# Function to verify tables were created
verify_tables() {
    echo ""
    echo -e "${YELLOW}Verifying new tables...${NC}"
    
    # List of tables to verify
    tables=(
        "phone_settings"
        "lead_scoring_settings"
        "calendar_settings"
        "pipelines"
        "custom_fields"
        "email_templates"
        "staff_invitations"
        "lead_scoring_history"
    )
    
    echo "Checking for the following tables:"
    for table in "${tables[@]}"; do
        echo "  - $table"
    done
    
    echo ""
    echo -e "${GREEN}Tables should now be available in your Supabase dashboard${NC}"
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Migration Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Verify in Supabase Dashboard:"
    echo "   - Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn"
    echo "   - Check the Table Editor for new tables"
    echo "   - Verify RLS policies are enabled"
    echo ""
    echo "2. Test the new features:"
    echo "   - Business Profile: /settings/business"
    echo "   - Staff Management: /settings/staff"
    echo "   - Pipeline Management: /settings/pipelines"
    echo "   - Calendar Settings: /settings/calendar"
    echo "   - Custom Fields: /settings/custom-fields"
    echo "   - Email Templates: /settings/templates"
    echo "   - Phone Settings: /settings/phone"
    echo "   - Lead Scoring: /settings/lead-scoring"
    echo ""
    echo "3. Configure environment variables if needed:"
    echo "   - Ensure SUPABASE_SERVICE_ROLE_KEY is set for admin operations"
    echo ""
    echo -e "${YELLOW}Note: Some features may require page refresh after first use${NC}"
}

# Main execution
echo "This will apply the settings enhancement migration to your Supabase project"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    apply_migration
    verify_tables
    show_next_steps
else
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi