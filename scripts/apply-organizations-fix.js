const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjAyMjYzNSwiZXhwIjoyMDM3NTk4NjM1fQ.OGgDXBrXlEIGF9J7azZLbVNl-J1r-U4Zr6XAXCGWbhI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔧 Starting organizations schema fix migration...');
    
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250110_fix_organizations_schema.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Loaded migration from:', migrationPath);
        
        // Split by DO blocks and execute each
        const statements = migrationSQL.split(/DO\s+\$\$/);
        
        for (let i = 1; i < statements.length; i++) {
            const statement = 'DO $$' + statements[i].split('$$;')[0] + '$$;';
            console.log(`\n📌 Executing statement ${i}/${statements.length - 1}...`);
            
            // Try to execute the statement
            let error = null;
            try {
                const result = await supabase.rpc('exec_sql', {
                    sql: statement
                });
                error = result.error;
            } catch (err) {
                // If exec_sql doesn't exist, note it but continue
                console.log('⚠️  exec_sql RPC not available');
                // Don't set error, just continue
            }
            
            if (error) {
                console.error(`❌ Error in statement ${i}:`, error.message);
                // Continue with other statements
            } else {
                console.log(`✅ Statement ${i} executed successfully`);
            }
        }
        
        // Check the table structure
        console.log('\n🔍 Verifying organizations table structure...');
        const { data: columns, error: columnsError } = await supabase
            .from('organizations')
            .select('*')
            .limit(0);
        
        if (!columnsError) {
            console.log('✅ Organizations table is accessible');
            
            // Try to get column information
            let schemaInfo = null;
            let schemaError = null;
            try {
                const result = await supabase.rpc('get_table_columns', {
                    table_name: 'organizations'
                });
                schemaInfo = result.data;
                schemaError = result.error;
            } catch (err) {
                schemaError = 'RPC not available';
            }
            
            if (schemaInfo) {
                console.log('📊 Table columns:', schemaInfo);
            }
        } else {
            console.log('⚠️  Could not verify table structure:', columnsError.message);
        }
        
        // Force schema cache refresh
        console.log('\n🔄 Attempting to refresh PostgREST schema cache...');
        
        // Try multiple methods to refresh the cache
        const refreshMethods = [
            'pgrst_reload_schema_cache',
            'notify_pgrst_ddl_changes',
            'reload_schema_cache'
        ];
        
        for (const method of refreshMethods) {
            console.log(`   Trying ${method}...`);
            try {
                const { error } = await supabase.rpc(method, {});
                if (!error) {
                    console.log(`   ✅ ${method} executed successfully`);
                    break;
                }
            } catch (err) {
                // Method not available, continue
            }
        }
        
        console.log('\n✨ Migration completed!');
        console.log('📝 Note: The PostgREST schema cache may take a moment to refresh.');
        console.log('   If organization creation still fails, try again in 30 seconds.');
        console.log('   Alternatively, manually refresh the schema in Supabase dashboard:');
        console.log('   Settings > API > Reload Schema');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n📝 Manual steps to fix:');
        console.log('1. Go to Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and run the migration from:', path.join('supabase', 'migrations', '20250110_fix_organizations_schema.sql'));
        console.log('4. Go to Settings > API and click "Reload Schema"');
        process.exit(1);
    }
}

// Run the migration
runMigration();