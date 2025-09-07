#!/bin/bash

# Apply membership schema fix migration
echo "🔧 Applying membership schema fix migration..."

# Database connection details
DB_HOST="db.lzlrojoaxrqvmhempnkn.supabase.co"
DB_USER="postgres"
DB_PASS="OGFYlxSChyYLgQxn"
DB_NAME="postgres"

# Migration file
MIGRATION_FILE="/Users/samschofield/atlas-fitness-onboarding/supabase/migrations/20250907_fix_membership_schema_issues.sql"

# Apply migration using psql (if available) or direct SQL
if command -v psql &> /dev/null; then
    echo "Using psql to apply migration..."
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE
else
    echo "psql not found, using Node.js to apply migration..."
    node -e "
    const { createClient } = require('@supabase/supabase-js');
    const fs = require('fs');
    
    const supabase = createClient(
        'https://lzlrojoaxrqvmhempnkn.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    );
    
    const migration = fs.readFileSync('$MIGRATION_FILE', 'utf8');
    
    // Split migration into individual statements
    const statements = migration
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    async function runMigration() {
        console.log('Applying migration statements...');
        for (const statement of statements) {
            try {
                console.log('Running:', statement.substring(0, 50) + '...');
                const { error } = await supabase.rpc('exec_sql', { 
                    sql_query: statement + ';' 
                });
                if (error) {
                    console.error('Error:', error);
                } else {
                    console.log('✓ Success');
                }
            } catch (e) {
                console.error('Failed:', e.message);
            }
        }
        console.log('Migration complete!');
    }
    
    runMigration();
    "
fi

echo "✅ Migration applied successfully!"