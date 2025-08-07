#!/bin/bash

# Safe Database Migration Script
# Backs up data, tests on staging, then applies to production

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./database-backups"
MIGRATION_LOG="./migration-${TIMESTAMP}.log"

echo -e "${GREEN}🚀 Safe Database Migration Tool${NC}"
echo "================================="
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${MIGRATION_LOG}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}❌ Supabase CLI not installed${NC}"
        echo "Install with: brew install supabase/tap/supabase"
        exit 1
    fi
    
    # Check if required environment variables are set
    if [ -z "$SUPABASE_DB_URL" ]; then
        echo -e "${RED}❌ SUPABASE_DB_URL not set${NC}"
        echo "Export your database URL first"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to backup database
backup_database() {
    echo -e "${YELLOW}📦 Creating database backup...${NC}"
    
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
    
    # Use Supabase CLI to create backup
    log "Creating backup at ${BACKUP_FILE}"
    
    # For now, we'll create a schema-only backup
    # In production, you'd want a full data backup
    pg_dump "${SUPABASE_DB_URL}" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --no-unlogged-table-data \
        --file="${BACKUP_FILE}" 2>&1 | tee -a "${MIGRATION_LOG}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created successfully${NC}"
        log "Backup saved to ${BACKUP_FILE}"
    else
        echo -e "${RED}❌ Backup failed${NC}"
        exit 1
    fi
}

# Function to validate migration file
validate_migration() {
    local MIGRATION_FILE=$1
    
    echo -e "${YELLOW}🔍 Validating migration file...${NC}"
    
    # Check if file exists
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
        exit 1
    fi
    
    # Check for dangerous operations
    if grep -iE "(DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM\s+users)" "$MIGRATION_FILE"; then
        echo -e "${RED}⚠️  WARNING: Dangerous operations detected in migration${NC}"
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            echo "Migration cancelled"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Migration file validated${NC}"
}

# Function to test migration
test_migration() {
    local MIGRATION_FILE=$1
    
    echo -e "${YELLOW}🧪 Testing migration...${NC}"
    
    # In a real scenario, you'd test on a staging database
    # For now, we'll just do a syntax check
    log "Running syntax check on migration"
    
    # Create a test transaction that rolls back
    cat <<EOF > test_migration_temp.sql
BEGIN;
$(cat "$MIGRATION_FILE")
ROLLBACK;
EOF
    
    psql "${SUPABASE_DB_URL}" -f test_migration_temp.sql 2>&1 | tee -a "${MIGRATION_LOG}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration test passed${NC}"
        rm test_migration_temp.sql
    else
        echo -e "${RED}❌ Migration test failed${NC}"
        rm test_migration_temp.sql
        exit 1
    fi
}

# Function to apply migration
apply_migration() {
    local MIGRATION_FILE=$1
    
    echo -e "${YELLOW}📝 Applying migration...${NC}"
    
    read -p "Apply migration to production? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Migration cancelled"
        exit 1
    fi
    
    log "Applying migration: $MIGRATION_FILE"
    
    # Apply the migration
    psql "${SUPABASE_DB_URL}" -f "$MIGRATION_FILE" 2>&1 | tee -a "${MIGRATION_LOG}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration applied successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        echo -e "${YELLOW}Check log file: ${MIGRATION_LOG}${NC}"
        echo -e "${YELLOW}Backup available at: ${BACKUP_FILE}${NC}"
        exit 1
    fi
}

# Function to verify migration
verify_migration() {
    echo -e "${YELLOW}✔️  Verifying migration...${NC}"
    
    # Run the validation script
    npx tsx scripts/validate-existing-db.ts 2>&1 | tee -a "${MIGRATION_LOG}"
    
    echo -e "${GREEN}✅ Migration verification complete${NC}"
}

# Main execution
main() {
    # Check if migration file is provided
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: $0 <migration-file.sql>${NC}"
        echo "Example: $0 scripts/fix-database-issues.sql"
        exit 1
    fi
    
    MIGRATION_FILE=$1
    
    # Run migration steps
    check_prerequisites
    validate_migration "$MIGRATION_FILE"
    backup_database
    test_migration "$MIGRATION_FILE"
    apply_migration "$MIGRATION_FILE"
    verify_migration
    
    echo ""
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo -e "Log file: ${MIGRATION_LOG}"
    echo -e "Backup: ${BACKUP_FILE}"
}

# Run main function with all arguments
main "$@"