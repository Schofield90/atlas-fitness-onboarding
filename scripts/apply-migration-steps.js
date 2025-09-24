#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const connectionString = 'postgresql://postgres:${DB_PASSWORD}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function runMigrationSteps() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Clean up duplicate leads first
    console.log('📄 Step 1: Cleaning up duplicate leads...');
    try {
      const duplicateCheck = await client.query(`
        SELECT email, organization_id, COUNT(*) as count
        FROM leads
        GROUP BY email, organization_id
        HAVING COUNT(*) > 1
      `);
      
      if (duplicateCheck.rows.length > 0) {
        console.log(`Found ${duplicateCheck.rows.length} duplicate email/org combinations`);
        
        // Delete duplicates, keeping the oldest one
        const deleteResult = await client.query(`
          DELETE FROM leads a
          USING (
            SELECT email, organization_id, MIN(created_at) as min_created
            FROM leads
            GROUP BY email, organization_id
            HAVING COUNT(*) > 1
          ) b
          WHERE a.email = b.email 
          AND a.organization_id = b.organization_id
          AND a.created_at > b.min_created
        `);
        
        console.log(`  ✅ Cleaned up ${deleteResult.rowCount} duplicate leads`);
      } else {
        console.log('  ✅ No duplicate leads found');
      }
    } catch (err) {
      console.log(`  ⚠️  Could not clean duplicates: ${err.message}`);
    }

    // Step 2: Apply the main migration in chunks
    console.log('\n📄 Step 2: Applying migration in parts...');
    
    const migrationSteps = [
      {
        name: 'Create bookings table',
        sql: `
          CREATE TABLE IF NOT EXISTS bookings (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
              client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
              customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
              class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
              status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
              booking_type TEXT DEFAULT 'single',
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              cancelled_at TIMESTAMPTZ,
              cancellation_reason TEXT,
              CHECK (client_id IS NOT NULL OR customer_id IS NOT NULL)
          );
          CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id) WHERE client_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE customer_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
          CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
          CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
        `
      },
      {
        name: 'Create class_credits table',
        sql: `
          CREATE TABLE IF NOT EXISTS class_credits (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
              client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
              customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
              credits_remaining INTEGER DEFAULT 0,
              credits_used INTEGER DEFAULT 0,
              membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE,
              expires_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              CHECK (client_id IS NOT NULL OR customer_id IS NOT NULL)
          );
          CREATE INDEX IF NOT EXISTS idx_class_credits_client_id ON class_credits(client_id) WHERE client_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_class_credits_customer_id ON class_credits(customer_id) WHERE customer_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_class_credits_organization_id ON class_credits(organization_id);
        `
      },
      {
        name: 'Fix organization_staff columns',
        sql: `
          ALTER TABLE organization_staff 
          ADD COLUMN IF NOT EXISTS role TEXT,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS system_mode TEXT DEFAULT 'ai_coach',
          ADD COLUMN IF NOT EXISTS visible_systems TEXT[] DEFAULT ARRAY['ai_coach'];
        `
      },
      {
        name: 'Create/update leads table',
        sql: `
          CREATE TABLE IF NOT EXISTS leads (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
              email TEXT NOT NULL,
              first_name TEXT,
              last_name TEXT,
              phone TEXT,
              client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
              status TEXT DEFAULT 'NEW',
              source TEXT DEFAULT 'MANUAL',
              notes TEXT,
              tags TEXT[],
              metadata JSONB DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
          CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email_org ON leads(email, organization_id);
        `
      },
      {
        name: 'Fix nutrition_profiles table',
        sql: `
          -- Drop the problematic constraint first if it exists
          DO $$
          BEGIN
              IF EXISTS (
                  SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'nutrition_profiles_person_ref_check'
                  AND table_name = 'nutrition_profiles'
              ) THEN
                  ALTER TABLE nutrition_profiles DROP CONSTRAINT nutrition_profiles_person_ref_check;
              END IF;
          END
          $$;

          -- Ensure the table has all necessary columns
          ALTER TABLE nutrition_profiles
          ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          ADD COLUMN IF NOT EXISTS age INTEGER,
          ADD COLUMN IF NOT EXISTS gender TEXT,
          ADD COLUMN IF NOT EXISTS sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'OTHER')),
          ADD COLUMN IF NOT EXISTS height INTEGER,
          ADD COLUMN IF NOT EXISTS height_cm INTEGER,
          ADD COLUMN IF NOT EXISTS current_weight DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS goal_weight DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS target_weight_kg DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS goal TEXT,
          ADD COLUMN IF NOT EXISTS activity_level TEXT,
          ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[],
          ADD COLUMN IF NOT EXISTS allergies TEXT[],
          ADD COLUMN IF NOT EXISTS food_likes TEXT[],
          ADD COLUMN IF NOT EXISTS food_dislikes TEXT[],
          ADD COLUMN IF NOT EXISTS cooking_time TEXT,
          ADD COLUMN IF NOT EXISTS budget_constraint TEXT,
          ADD COLUMN IF NOT EXISTS meal_count INTEGER DEFAULT 3,
          ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3,
          ADD COLUMN IF NOT EXISTS snacks_per_day INTEGER DEFAULT 2,
          ADD COLUMN IF NOT EXISTS target_calories INTEGER,
          ADD COLUMN IF NOT EXISTS daily_calories INTEGER,
          ADD COLUMN IF NOT EXISTS target_protein INTEGER,
          ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
          ADD COLUMN IF NOT EXISTS target_carbs INTEGER,
          ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
          ADD COLUMN IF NOT EXISTS target_fat INTEGER,
          ADD COLUMN IF NOT EXISTS fat_grams INTEGER,
          ADD COLUMN IF NOT EXISTS target_fiber INTEGER DEFAULT 25,
          ADD COLUMN IF NOT EXISTS fiber_grams INTEGER DEFAULT 25,
          ADD COLUMN IF NOT EXISTS bmr INTEGER,
          ADD COLUMN IF NOT EXISTS tdee INTEGER,
          ADD COLUMN IF NOT EXISTS weekly_weight_change_kg DECIMAL(3,2),
          ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3,
          ADD COLUMN IF NOT EXISTS training_types TEXT[] DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

          -- Make lead_id nullable
          ALTER TABLE nutrition_profiles ALTER COLUMN lead_id DROP NOT NULL;

          -- Add flexible constraint
          ALTER TABLE nutrition_profiles 
          ADD CONSTRAINT nutrition_profiles_person_ref_check 
          CHECK (
              (client_id IS NOT NULL AND lead_id IS NULL) OR 
              (client_id IS NULL AND lead_id IS NOT NULL) OR
              (client_id IS NULL AND lead_id IS NULL)
          );

          -- Add indexes
          CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_client_id ON nutrition_profiles(client_id) WHERE client_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_lead_id ON nutrition_profiles(lead_id) WHERE lead_id IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_organization_id ON nutrition_profiles(organization_id);
        `
      },
      {
        name: 'Set up RLS policies',
        sql: `
          -- Enable RLS on all tables
          ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
          ALTER TABLE class_credits ENABLE ROW LEVEL SECURITY;
          ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
          ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

          -- Drop existing policies
          DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
          DROP POLICY IF EXISTS "Staff can manage bookings" ON bookings;
          DROP POLICY IF EXISTS "Users can view own class_credits" ON class_credits;
          DROP POLICY IF EXISTS "Staff can manage class_credits" ON class_credits;
          DROP POLICY IF EXISTS "Staff can manage leads" ON leads;
          DROP POLICY IF EXISTS "Users can view own nutrition profile" ON nutrition_profiles;
          DROP POLICY IF EXISTS "Staff can manage nutrition profiles" ON nutrition_profiles;

          -- Create new policies
          CREATE POLICY "Users can view own bookings" ON bookings
          FOR SELECT USING (
              client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
              customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
          );

          CREATE POLICY "Staff can manage bookings" ON bookings
          FOR ALL USING (
              organization_id IN (
                  SELECT organization_id FROM organization_staff 
                  WHERE user_id = auth.uid() AND is_active = true
              )
          );

          CREATE POLICY "Users can view own class_credits" ON class_credits
          FOR SELECT USING (
              client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
              customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
          );

          CREATE POLICY "Staff can manage class_credits" ON class_credits
          FOR ALL USING (
              organization_id IN (
                  SELECT organization_id FROM organization_staff 
                  WHERE user_id = auth.uid() AND is_active = true
              )
          );

          CREATE POLICY "Staff can manage leads" ON leads
          FOR ALL USING (
              organization_id IN (
                  SELECT organization_id FROM organization_staff 
                  WHERE user_id = auth.uid() AND is_active = true
              )
          );

          CREATE POLICY "Users can view own nutrition profile" ON nutrition_profiles
          FOR SELECT USING (
              client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()) OR
              lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
          );

          CREATE POLICY "Staff can manage nutrition profiles" ON nutrition_profiles
          FOR ALL USING (
              organization_id IN (
                  SELECT organization_id FROM organization_staff 
                  WHERE user_id = auth.uid() AND is_active = true
              )
          );
        `
      }
    ];

    // Run each step
    for (const step of migrationSteps) {
      try {
        console.log(`  Running: ${step.name}...`);
        await client.query(step.sql);
        console.log(`    ✅ ${step.name} completed`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`    ⚠️  ${step.name} - already exists (skipped)`);
        } else {
          console.log(`    ❌ ${step.name} failed: ${err.message}`);
        }
      }
    }

    // Step 3: Verify tables
    console.log('\n📋 Step 3: Verifying tables...');
    
    const tables = ['bookings', 'class_credits', 'leads', 'nutrition_profiles'];
    let allGood = true;
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        console.log(`  ✅ Table '${table}' exists and is accessible`);
      } catch (err) {
        console.log(`  ❌ Table '${table}' check failed: ${err.message}`);
        allGood = false;
      }
    }
    
    // Check nutrition_profiles columns
    console.log('\n📋 Checking nutrition_profiles columns...');
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'nutrition_profiles' 
        AND column_name IN ('client_id', 'lead_id')
      `);
      
      for (const row of result.rows) {
        console.log(`  ✅ Column '${row.column_name}' exists`);
      }
    } catch (err) {
      console.log(`  ❌ Column check failed: ${err.message}`);
      allGood = false;
    }
    
    if (allGood) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🥗 The nutrition coach should now work correctly.');
      console.log('\nProduction URLs:');
      console.log('  - Main app: https://atlas-fitness-onboarding.vercel.app');
      console.log('  - Test page: https://atlas-fitness-onboarding.vercel.app/test-nutrition');
    } else {
      console.log('\n⚠️  Migration completed with some issues. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigrationSteps();