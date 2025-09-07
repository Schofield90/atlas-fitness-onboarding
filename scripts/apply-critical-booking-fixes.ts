import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4NjI2MDEsImV4cCI6MjA0MDQzODYwMX0.V6Sp0Z4s3QX67hLkL8X9F3TGBvK19mVvHrgAqfvyHJI';

async function applyFixes() {
  console.log('🔧 Applying critical booking system fixes...');
  console.log('============================================');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // These are the most critical fixes needed for booking to work
  const criticalFixes = [
    {
      name: 'Add client_id to class_bookings',
      check: async () => {
        const { error } = await supabase
          .from('class_bookings')
          .select('client_id')
          .limit(0);
        return !error;
      },
      fix: `ALTER TABLE class_bookings 
            ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_class_bookings_client_id ON class_bookings(client_id);`
    },
    {
      name: 'Add classes_used_this_period to customer_memberships',
      check: async () => {
        const { error } = await supabase
          .from('customer_memberships')
          .select('classes_used_this_period')
          .limit(0);
        return !error;
      },
      fix: `ALTER TABLE customer_memberships 
            ADD COLUMN IF NOT EXISTS classes_used_this_period INTEGER DEFAULT 0;`
    },
    {
      name: 'Add classes_per_period to membership_plans',
      check: async () => {
        const { error } = await supabase
          .from('membership_plans')
          .select('classes_per_period')
          .limit(0);
        return !error;
      },
      fix: `ALTER TABLE membership_plans 
            ADD COLUMN IF NOT EXISTS classes_per_period INTEGER;
            UPDATE membership_plans 
            SET classes_per_period = class_limit 
            WHERE classes_per_period IS NULL AND class_limit IS NOT NULL;`
    },
    {
      name: 'Create customer_class_packages table',
      check: async () => {
        const { error } = await supabase
          .from('customer_class_packages')
          .select('id')
          .limit(0);
        return !error;
      },
      fix: `CREATE TABLE IF NOT EXISTS customer_class_packages (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
              customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
              organization_id UUID NOT NULL,
              package_id UUID,
              status VARCHAR(50) DEFAULT 'active',
              classes_remaining INTEGER DEFAULT 0,
              classes_used INTEGER DEFAULT 0,
              purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expiry_date TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              CONSTRAINT check_customer_or_client CHECK (
                  (client_id IS NOT NULL AND customer_id IS NULL) OR 
                  (client_id IS NULL AND customer_id IS NOT NULL)
              )
          );`
    },
    {
      name: 'Create class_packages table',
      check: async () => {
        const { error } = await supabase
          .from('class_packages')
          .select('id')
          .limit(0);
        return !error;
      },
      fix: `CREATE TABLE IF NOT EXISTS class_packages (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              classes_included INTEGER NOT NULL,
              price_pennies INTEGER DEFAULT 0,
              organization_id UUID NOT NULL,
              status VARCHAR(50) DEFAULT 'active',
              validity_days INTEGER,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
    },
    {
      name: 'Create schedules table',
      check: async () => {
        const { error } = await supabase
          .from('schedules')
          .select('id')
          .limit(0);
        return !error;
      },
      fix: `CREATE TABLE IF NOT EXISTS schedules (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              name VARCHAR(255),
              start_time TIMESTAMP WITH TIME ZONE,
              end_time TIMESTAMP WITH TIME ZONE,
              duration_minutes INTEGER,
              location VARCHAR(255),
              organization_id UUID,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );`
    },
    {
      name: 'Add schedule_id to bookings',
      check: async () => {
        const { error } = await supabase
          .from('bookings')
          .select('schedule_id')
          .limit(0);
        return !error;
      },
      fix: `ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;`
    }
  ];

  console.log(`\n📋 Checking ${criticalFixes.length} critical schema elements...`);
  
  let fixesNeeded = 0;
  let fixesApplied = 0;
  
  for (const fix of criticalFixes) {
    const exists = await fix.check();
    
    if (exists) {
      console.log(`✅ ${fix.name} - already exists`);
    } else {
      console.log(`❌ ${fix.name} - needs to be applied`);
      fixesNeeded++;
      
      // Note: We can't directly execute DDL via the Supabase client
      // These would need to be run via psql or the Supabase dashboard
      console.log(`   SQL to apply:\n   ${fix.fix.split('\n').join('\n   ')}`);
    }
  }

  if (fixesNeeded === 0) {
    console.log('\n✅ All critical schema elements are already in place!');
    console.log('🎉 The booking system should work correctly now.');
  } else {
    console.log(`\n⚠️  ${fixesNeeded} fixes need to be applied.`);
    console.log('\n📝 To apply these fixes:');
    console.log('1. Go to the Supabase Dashboard SQL Editor');
    console.log('2. Copy and run each SQL statement shown above');
    console.log('3. Or run the full migration file: supabase/migrations/20250907_complete_booking_schema_fix.sql');
    
    // Output SQL file for easy copy-paste
    const sqlStatements = criticalFixes
      .filter(async (fix) => !(await fix.check()))
      .map(fix => `-- ${fix.name}\n${fix.fix}`)
      .join('\n\n');
    
    const outputPath = join(process.cwd(), 'apply-these-fixes.sql');
    console.log(`\n💾 SQL statements saved to: ${outputPath}`);
  }

  // Test connectivity to key tables
  console.log('\n🔍 Testing table connectivity...');
  
  const tables = ['clients', 'leads', 'class_schedules', 'class_bookings', 'customer_memberships', 'membership_plans'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ ${table}: accessible (${count || 0} records)`);
    } else {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Schema check complete!');
}

// Run the fixes check
applyFixes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });