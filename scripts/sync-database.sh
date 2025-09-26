#!/bin/bash

# Database Sync Script - Pull production data to local
# This ensures localhost matches production exactly

echo "🔄 Database Sync Tool"
echo "====================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROD_DB_URL="postgresql://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres"
LOCAL_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Menu
echo "Choose sync option:"
echo "1. Pull SCHEMA only (safe - structure only)"
echo "2. Pull SCHEMA + SAMPLE data (safe - limited data)"
echo "3. Pull SPECIFIC TABLES (choose which tables)"
echo "4. Compare schemas (see differences)"
echo "5. Fix common issues (price fields, RLS, etc.)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo -e "${YELLOW}Pulling production schema to local...${NC}"
    
    # Dump production schema only
    PGPASSWORD=OGFYlxSChyYLgQxn pg_dump \
      -h db.lzlrojoaxrqvmhempnkn.supabase.co \
      -p 5432 \
      -U postgres.lzlrojoaxrqvmhempnkn \
      -d postgres \
      --schema-only \
      --no-owner \
      --no-privileges \
      -f /tmp/prod-schema.sql
    
    # Apply to local
    PGPASSWORD=postgres psql \
      -h 127.0.0.1 \
      -p 54322 \
      -U postgres \
      -d postgres \
      -f /tmp/prod-schema.sql
    
    echo -e "${GREEN}✅ Schema synced!${NC}"
    ;;
    
  2)
    echo -e "${YELLOW}Pulling schema + sample data...${NC}"
    
    # Tables to sync with sample data
    TABLES=(
      "organizations"
      "membership_plans"
      "programs"
      "class_sessions"
      "clients"
      "leads"
    )
    
    for table in "${TABLES[@]}"; do
      echo "Syncing $table..."
      
      # Dump table with limit
      PGPASSWORD=OGFYlxSChyYLgQxn psql \
        -h db.lzlrojoaxrqvmhempnkn.supabase.co \
        -p 5432 \
        -U postgres.lzlrojoaxrqvmhempnkn \
        -d postgres \
        -c "COPY (SELECT * FROM $table LIMIT 100) TO STDOUT WITH CSV HEADER" \
        > /tmp/$table.csv
      
      # Import to local
      PGPASSWORD=postgres psql \
        -h 127.0.0.1 \
        -p 54322 \
        -U postgres \
        -d postgres \
        -c "TRUNCATE $table CASCADE; COPY $table FROM STDIN WITH CSV HEADER" \
        < /tmp/$table.csv
    done
    
    echo -e "${GREEN}✅ Schema and sample data synced!${NC}"
    ;;
    
  3)
    echo "Enter table names to sync (comma-separated):"
    read -p "Tables: " tables
    
    IFS=',' read -ra TABLE_ARRAY <<< "$tables"
    for table in "${TABLE_ARRAY[@]}"; do
      table=$(echo $table | xargs) # trim whitespace
      echo -e "${YELLOW}Syncing $table...${NC}"
      
      PGPASSWORD=OGFYlxSChyYLgQxn pg_dump \
        -h db.lzlrojoaxrqvmhempnkn.supabase.co \
        -p 5432 \
        -U postgres.lzlrojoaxrqvmhempnkn \
        -d postgres \
        -t $table \
        --data-only \
        -f /tmp/$table-data.sql
      
      PGPASSWORD=postgres psql \
        -h 127.0.0.1 \
        -p 54322 \
        -U postgres \
        -d postgres \
        -c "TRUNCATE $table CASCADE"
      
      PGPASSWORD=postgres psql \
        -h 127.0.0.1 \
        -p 54322 \
        -U postgres \
        -d postgres \
        -f /tmp/$table-data.sql
    done
    
    echo -e "${GREEN}✅ Selected tables synced!${NC}"
    ;;
    
  4)
    echo -e "${YELLOW}Comparing schemas...${NC}"
    
    # Get production columns
    PGPASSWORD=OGFYlxSChyYLgQxn psql \
      -h db.lzlrojoaxrqvmhempnkn.supabase.co \
      -p 5432 \
      -U postgres.lzlrojoaxrqvmhempnkn \
      -d postgres \
      -c "SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          ORDER BY table_name, ordinal_position" \
      -t -A -F'|' > /tmp/prod-columns.txt
    
    # Get local columns
    PGPASSWORD=postgres psql \
      -h 127.0.0.1 \
      -p 54322 \
      -U postgres \
      -d postgres \
      -c "SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          ORDER BY table_name, ordinal_position" \
      -t -A -F'|' > /tmp/local-columns.txt
    
    echo ""
    echo "Differences found:"
    echo -e "${RED}< Production only${NC}"
    echo -e "${GREEN}> Local only${NC}"
    echo ""
    diff /tmp/prod-columns.txt /tmp/local-columns.txt
    ;;
    
  5)
    echo -e "${YELLOW}Fixing common issues...${NC}"
    
    # Fix 1: Ensure price fields are consistent
    echo "1. Fixing membership_plans price fields..."
    PGPASSWORD=postgres psql \
      -h 127.0.0.1 \
      -p 54322 \
      -U postgres \
      -d postgres \
      -c "UPDATE membership_plans 
          SET price_pennies = COALESCE(price, 0) 
          WHERE price_pennies = 0 AND price > 0"
    
    # Fix 2: Ensure RLS is enabled
    echo "2. Enabling RLS on all tables..."
    TABLES=(membership_plans programs class_sessions bookings clients leads)
    for table in "${TABLES[@]}"; do
      PGPASSWORD=postgres psql \
        -h 127.0.0.1 \
        -p 54322 \
        -U postgres \
        -d postgres \
        -c "ALTER TABLE $table ENABLE ROW LEVEL SECURITY"
    done
    
    # Fix 3: Ensure test organization exists
    echo "3. Ensuring test organization exists..."
    PGPASSWORD=postgres psql \
      -h 127.0.0.1 \
      -p 54322 \
      -U postgres \
      -d postgres \
      -c "INSERT INTO organizations (id, name, slug, email) 
          VALUES ('eac9a158-d3c7-4140-9620-91a5554a6fe8', 
                  'Atlas Fitness', 
                  'atlas-fitness', 
                  'sam@atlas-gyms.co.uk') 
          ON CONFLICT (id) DO NOTHING"
    
    echo -e "${GREEN}✅ Common issues fixed!${NC}"
    ;;
esac

echo ""
echo "🎉 Sync complete!"
echo ""
echo "Other useful commands:"
echo "  • supabase db pull    - Pull remote schema changes"
echo "  • supabase db push    - Push local schema to remote"
echo "  • supabase db reset   - Reset local database"