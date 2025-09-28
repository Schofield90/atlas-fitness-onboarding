#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Applying schema fix migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250928_fix_owner_login_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Read migration file, executing SQL...\n');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try executing with direct SQL if rpc fails
      console.log('🔄 Trying direct SQL execution...');
      
      const { data: directData, error: directError } = await supabase
        .from('_migrations')  // This won't work but will show the real error
        .select('*');
        
      if (directError) {
        console.log('Direct execution also failed. Trying raw SQL...');
        
        // Split the migration into smaller chunks and execute
        const statements = migrationSQL.split('$$;');
        let successCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement && !statement.startsWith('--') && statement !== '') {
            try {
              console.log(`Executing statement ${i + 1}/${statements.length}...`);
              
              // Use the SQL execution through edge functions or direct API
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey
                },
                body: JSON.stringify({ sql: statement + (statement.endsWith('$$') ? ';' : '') })
              });
              
              if (response.ok) {
                successCount++;
                console.log(`✅ Statement ${i + 1} executed successfully`);
              } else {
                const errorText = await response.text();
                console.log(`⚠️ Statement ${i + 1} failed: ${errorText}`);
              }
            } catch (stmtError) {
              console.log(`⚠️ Statement ${i + 1} error: ${stmtError.message}`);
            }
          }
        }
        
        console.log(`\n📊 Executed ${successCount}/${statements.length} statements successfully`);
      }
    } else {
      console.log('✅ Migration executed successfully:', data);
    }

    // Verify the migration worked
    console.log('\n🔍 Verifying migration results...');
    
    // Check user_organizations table structure
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .limit(1);

    if (userOrgsError) {
      console.error('❌ user_organizations verification failed:', userOrgsError);
    } else {
      console.log('✅ user_organizations table accessible');
      if (userOrgs.length > 0) {
        console.log('Sample columns:', Object.keys(userOrgs[0]));
      }
    }

    // Check Sam's organization links
    const { data: samLinks, error: samError } = await supabase
      .from('user_organizations')
      .select('*');

    if (samError) {
      console.error('❌ Sam verification failed:', samError);
    } else {
      console.log(`✅ Found ${samLinks.length} user_organization records`);
      samLinks.forEach(link => {
        console.log(`- User: ${link.user_id}, Org: ${link.organization_id}, Role: ${link.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Migration application failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

applyMigration().catch(console.error);