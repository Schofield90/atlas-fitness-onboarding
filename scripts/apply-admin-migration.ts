import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting Admin HQ migration...\n')
  
  // Check if admin tables already exist
  console.log('Checking existing tables...')
  const { data: existingTables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['super_admin_users', 'admin_activity_logs', 'admin_organization_access'])
  
  if (existingTables && existingTables.length > 0) {
    console.log('⚠️  Some admin tables already exist:', existingTables.map(t => t.table_name).join(', '))
    console.log('   Proceeding with caution...\n')
  }

  const results = {
    success: [],
    failed: [],
    skipped: []
  }

  try {
    // 1. Create admin role enum (if not exists)
    console.log('1. Creating admin role enum...')
    const { error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE admin_role AS ENUM ('platform_owner', 'platform_admin', 'platform_support', 'platform_readonly');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    })
    if (enumError) {
      console.log('   ⚠️  Admin role enum might already exist')
      results.skipped.push('admin_role enum')
    } else {
      console.log('   ✅ Admin role enum created')
      results.success.push('admin_role enum')
    }

    // 2. Create super_admin_users table
    console.log('2. Creating super_admin_users table...')
    const { error: adminTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS super_admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role admin_role NOT NULL DEFAULT 'platform_readonly',
          is_active BOOLEAN DEFAULT true,
          permissions JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID REFERENCES auth.users(id),
          UNIQUE(user_id)
        );
      `
    })
    if (adminTableError) {
      console.log('   ❌ Failed:', adminTableError.message)
      results.failed.push('super_admin_users table')
    } else {
      console.log('   ✅ Table created')
      results.success.push('super_admin_users table')
    }

    // 3. Create admin_activity_logs table
    console.log('3. Creating admin_activity_logs table...')
    const { error: logsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_user_id UUID NOT NULL REFERENCES super_admin_users(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
          target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          resource_type TEXT,
          resource_id TEXT,
          action_details JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          session_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })
    if (logsTableError) {
      console.log('   ❌ Failed:', logsTableError.message)
      results.failed.push('admin_activity_logs table')
    } else {
      console.log('   ✅ Table created')
      results.success.push('admin_activity_logs table')
    }

    // 4. Create admin_organization_access table
    console.log('4. Creating admin_organization_access table...')
    const { error: accessTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_organization_access (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_user_id UUID NOT NULL REFERENCES super_admin_users(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write')),
          reason TEXT NOT NULL,
          granted_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          revoked_by UUID REFERENCES super_admin_users(id),
          revoke_reason TEXT,
          is_active BOOLEAN GENERATED ALWAYS AS (
            revoked_at IS NULL AND expires_at > NOW()
          ) STORED,
          CONSTRAINT valid_expiry CHECK (expires_at > granted_at),
          CONSTRAINT max_duration CHECK (expires_at <= granted_at + INTERVAL '4 hours')
        );
      `
    })
    if (accessTableError) {
      console.log('   ❌ Failed:', accessTableError.message)
      results.failed.push('admin_organization_access table')
    } else {
      console.log('   ✅ Table created')
      results.success.push('admin_organization_access table')
    }

    // 5. Create indexes
    console.log('5. Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON admin_activity_logs(admin_user_id);',
      'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_org ON admin_activity_logs(target_organization_id);',
      'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON admin_activity_logs(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_admin_org_access_active ON admin_organization_access(is_active) WHERE is_active = true;',
      'CREATE INDEX IF NOT EXISTS idx_admin_org_access_admin ON admin_organization_access(admin_user_id);'
    ]
    
    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql })
      if (!error) {
        console.log('   ✅ Index created')
        results.success.push('index')
      }
    }

    // 6. Enable RLS
    console.log('6. Enabling RLS on admin tables...')
    const rlsTables = ['super_admin_users', 'admin_activity_logs', 'admin_organization_access']
    for (const table of rlsTables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      })
      if (!error) {
        console.log(`   ✅ RLS enabled on ${table}`)
        results.success.push(`RLS on ${table}`)
      }
    }

    // 7. Set up sam@gymleadhub.co.uk as platform owner
    console.log('7. Setting up sam@gymleadhub.co.uk as platform owner...')
    
    // First check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'sam@gymleadhub.co.uk')
      .single()
    
    if (user) {
      const { error: adminError } = await supabase
        .from('super_admin_users')
        .upsert({
          user_id: user.id,
          role: 'platform_owner',
          is_active: true,
          created_by: user.id
        }, {
          onConflict: 'user_id'
        })
      
      if (adminError) {
        console.log('   ❌ Failed to set platform owner:', adminError.message)
        results.failed.push('platform owner setup')
      } else {
        console.log('   ✅ sam@gymleadhub.co.uk is now platform owner!')
        results.success.push('platform owner setup')
      }
    } else {
      console.log('   ⚠️  User sam@gymleadhub.co.uk not found in database')
      console.log('      Please sign up with this email first, then re-run this script')
      results.skipped.push('platform owner setup')
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary:')
    console.log(`   ✅ Successful: ${results.success.length}`)
    console.log(`   ❌ Failed: ${results.failed.length}`)
    console.log(`   ⚠️  Skipped: ${results.skipped.length}`)
    
    if (results.failed.length === 0) {
      console.log('\n🎉 Admin HQ migration completed successfully!')
      console.log('\nNext steps:')
      console.log('1. Sign in to the application with sam@gymleadhub.co.uk')
      console.log('2. Navigate to /admin to access the Admin HQ')
      console.log('3. You now have full platform owner privileges')
    } else {
      console.log('\n⚠️  Migration completed with some errors.')
      console.log('Failed items:', results.failed.join(', '))
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error)
    process.exit(1)
  }
}

// Run the migration
console.log('Admin HQ Migration Script')
console.log('=========================\n')
runMigration().catch(console.error)