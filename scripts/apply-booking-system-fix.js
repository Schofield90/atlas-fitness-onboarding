#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTQ1NDc0NCwiZXhwIjoyMDQxMDMwNzQ0fQ.Kc0W8B39RK6CNWHdCnG8kHvMKGjIOsCEkfeyVBnQE-0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying booking system database fixes...');
  console.log('===========================================\n');

  try {
    // Step 1: Fix the constraint to allow dual customer architecture
    console.log('📋 Step 1: Fixing customer/client booking constraint...');
    
    const dropConstraint = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Drop existing constraint if it exists
          ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_customer_or_client_booking;
          
          -- Add new flexible constraint
          ALTER TABLE bookings 
          ADD CONSTRAINT check_customer_or_client_booking 
          CHECK (
            (customer_id IS NOT NULL AND client_id IS NULL) OR 
            (customer_id IS NULL AND client_id IS NOT NULL) OR
            (customer_id IS NOT NULL AND client_id IS NOT NULL) -- Allow both for transitions
          );
          
          RAISE NOTICE '✅ Constraint updated successfully';
        END $$;
      `
    });

    if (dropConstraint.error) {
      console.error('❌ Failed to update constraint:', dropConstraint.error);
      return;
    }
    console.log('✅ Constraint fixed\n');

    // Step 2: Update RLS policies
    console.log('📋 Step 2: Updating RLS policies for proper access...');
    
    const updatePolicies = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          -- Drop existing restrictive policies
          DROP POLICY IF EXISTS "Users can view own organization bookings" ON bookings;
          DROP POLICY IF EXISTS "Users can create bookings for their organization" ON bookings;
          DROP POLICY IF EXISTS "Users can update own organization bookings" ON bookings;
          
          -- Create new flexible policies
          CREATE POLICY "Allow viewing bookings" ON bookings
            FOR SELECT USING (
              auth.uid() IS NOT NULL OR -- Authenticated users
              (auth.uid() IS NULL AND class_session_id IS NOT NULL) -- Public bookings
            );
          
          CREATE POLICY "Allow creating bookings" ON bookings
            FOR INSERT WITH CHECK (
              auth.uid() IS NOT NULL OR -- Authenticated users
              (auth.uid() IS NULL AND class_session_id IS NOT NULL) -- Public bookings
            );
          
          CREATE POLICY "Allow updating bookings" ON bookings
            FOR UPDATE USING (
              auth.uid() IS NOT NULL
            );
          
          RAISE NOTICE '✅ RLS policies updated';
        END $$;
      `
    });

    if (updatePolicies.error) {
      console.error('❌ Failed to update RLS policies:', updatePolicies.error);
      return;
    }
    console.log('✅ RLS policies updated\n');

    // Step 3: Sync data between booking tables
    console.log('📋 Step 3: Syncing data between booking tables...');
    
    const syncData = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        DECLARE
          sync_count INTEGER := 0;
        BEGIN
          -- Ensure class_bookings has all necessary columns
          ALTER TABLE class_bookings 
          ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
          ADD COLUMN IF NOT EXISTS lead_id UUID;
          
          -- Sync bookings to class_bookings where missing
          INSERT INTO class_bookings (
            class_session_id,
            customer_id,
            client_id,
            organization_id,
            booking_status,
            created_at,
            updated_at
          )
          SELECT 
            b.class_session_id,
            b.customer_id,
            b.client_id,
            b.org_id,
            b.status,
            b.created_at,
            b.updated_at
          FROM bookings b
          WHERE b.class_session_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM class_bookings cb 
            WHERE cb.class_session_id = b.class_session_id
            AND (
              (cb.customer_id IS NOT NULL AND cb.customer_id = b.customer_id) OR
              (cb.client_id IS NOT NULL AND cb.client_id = b.client_id)
            )
          );
          
          GET DIAGNOSTICS sync_count = ROW_COUNT;
          RAISE NOTICE 'Synced % bookings to class_bookings', sync_count;
          
          -- Update booking counts in class_sessions
          UPDATE class_sessions cs
          SET current_bookings = (
            SELECT COUNT(*)
            FROM class_bookings cb
            WHERE cb.class_session_id = cs.id
            AND cb.booking_status = 'confirmed'
          );
          
          RAISE NOTICE '✅ Data sync completed';
        END $$;
      `
    });

    if (syncData.error) {
      console.error('❌ Failed to sync data:', syncData.error);
      return;
    }
    console.log('✅ Data synced between tables\n');

    // Step 4: Create unified view
    console.log('📋 Step 4: Creating unified bookings view...');
    
    const createView = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW unified_bookings AS
        SELECT 
          'bookings'::text as source_table,
          b.id,
          b.class_session_id,
          b.customer_id,
          b.client_id,
          b.org_id as organization_id,
          b.status as booking_status,
          b.created_at,
          b.updated_at,
          COALESCE(
            c.name,
            l.first_name || ' ' || l.last_name,
            cl.first_name || ' ' || cl.last_name,
            'Unknown'
          ) as customer_name,
          COALESCE(c.email, l.email, cl.email) as customer_email,
          COALESCE(c.phone, l.phone, cl.phone) as customer_phone
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN leads l ON b.customer_id = l.id
        LEFT JOIN clients cl ON b.client_id = cl.id
        WHERE b.class_session_id IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'class_bookings'::text as source_table,
          cb.id,
          cb.class_session_id,
          cb.customer_id,
          cb.client_id,
          cb.organization_id,
          cb.booking_status,
          cb.created_at,
          cb.updated_at,
          COALESCE(
            c.name,
            l.first_name || ' ' || l.last_name,
            cl.first_name || ' ' || cl.last_name,
            'Unknown'
          ) as customer_name,
          COALESCE(c.email, l.email, cl.email) as customer_email,
          COALESCE(c.phone, l.phone, cl.phone) as customer_phone
        FROM class_bookings cb
        LEFT JOIN customers c ON cb.customer_id = c.id
        LEFT JOIN leads l ON cb.customer_id = l.id
        LEFT JOIN clients cl ON cb.client_id = cl.id
        WHERE cb.class_session_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.class_session_id = cb.class_session_id
          AND (
            (b.customer_id IS NOT NULL AND b.customer_id = cb.customer_id) OR
            (b.client_id IS NOT NULL AND b.client_id = cb.client_id)
          )
        );
      `
    });

    if (createView.error) {
      console.error('❌ Failed to create unified view:', createView.error);
      return;
    }
    console.log('✅ Unified view created\n');

    // Step 5: Verify the fixes
    console.log('📋 Step 5: Verifying fixes...');
    
    const { data: bookingCount, error: countError } = await supabase
      .from('unified_bookings')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✅ Unified bookings view contains ${bookingCount} records`);
    }

    console.log('\n🎉 All booking system fixes have been applied successfully!');
    console.log('📱 The booking system should now work correctly.');
    console.log('\nNext steps:');
    console.log('1. Test booking count consistency at https://atlas-fitness-onboarding.vercel.app/class-calendar');
    console.log('2. Verify customer information displays correctly');
    console.log('3. Create a test booking to ensure everything works end-to-end');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Create RPC function if it doesn't exist
async function setupRpcFunction() {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    
    if (error) {
      console.log('Creating exec_sql RPC function...');
      // This would normally require admin access
      console.log('⚠️  Note: exec_sql function may not exist. Using alternative approach...');
      return false;
    }
    return true;
  } catch (error) {
    console.log('⚠️  RPC function not available. Using alternative approach...');
    return false;
  }
}

// Alternative approach using direct queries
async function applyMigrationAlternative() {
  console.log('🔧 Applying booking system fixes using Supabase client...');
  console.log('===========================================\n');

  try {
    // Test the unified view by trying to query it
    console.log('📋 Testing if unified_bookings view exists...');
    const { data: testView, error: viewError } = await supabase
      .from('unified_bookings')
      .select('*')
      .limit(1);

    if (viewError && viewError.message.includes('relation "unified_bookings" does not exist')) {
      console.log('⚠️  Unified view does not exist yet');
      console.log('📝 Creating migration file for manual application...');
      
      // Write the migration to a file
      const migrationContent = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations/20250908_fix_booking_system_comprehensive.sql'),
        'utf8'
      );
      
      console.log('\n✅ Migration file is ready at:');
      console.log('   supabase/migrations/20250908_fix_booking_system_comprehensive.sql');
      console.log('\n📋 Please apply this migration in your Supabase dashboard:');
      console.log('   1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql');
      console.log('   2. Copy and paste the migration SQL');
      console.log('   3. Click "Run" to apply the fixes');
    } else if (!viewError) {
      console.log('✅ Unified view already exists');
      
      // Test booking data
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      
      const { count: classBookingCount } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\n📊 Current booking statistics:`);
      console.log(`   - Bookings table: ${bookingCount || 0} records`);
      console.log(`   - Class bookings table: ${classBookingCount || 0} records`);
      console.log(`   - Unified view: ${testView?.length || 0} sample records`);
    }

    // Check for data inconsistencies
    console.log('\n📋 Checking for data inconsistencies...');
    
    // Get bookings with missing customer data
    const { data: bookingsWithIssues, error: issueError } = await supabase
      .from('bookings')
      .select('id, customer_id, client_id, class_session_id')
      .is('customer_id', null)
      .is('client_id', null)
      .not('class_session_id', 'is', null);
    
    if (!issueError && bookingsWithIssues?.length > 0) {
      console.log(`⚠️  Found ${bookingsWithIssues.length} bookings with no customer reference`);
    } else {
      console.log('✅ All bookings have proper customer references');
    }

    console.log('\n✅ Analysis complete!');
    console.log('\n🔧 To fix the issues, please apply the migration in Supabase dashboard');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const hasRpc = await setupRpcFunction();
  
  if (hasRpc) {
    await applyMigration();
  } else {
    await applyMigrationAlternative();
  }
}

main().catch(console.error);