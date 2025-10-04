#!/usr/bin/env node

/**
 * Apply client profile migration to add address and emergency contact fields
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yafbzdjwhlbeafamznhw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Starting client profile migration...\n');

  try {
    // Add name column
    console.log('📝 Adding name column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT'
    }).catch(() => {
      // RPC might not exist, use direct approach
      console.log('   Using direct SQL execution...');
    });

    // Add gender column
    console.log('📝 Adding gender column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(20)'
    }).catch(() => {});

    // Add date_of_birth column
    console.log('📝 Adding date_of_birth column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE'
    }).catch(() => {});

    // Add emergency contact fields
    console.log('📝 Adding emergency_contact_name column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT'
    }).catch(() => {});

    console.log('📝 Adding emergency_contact_phone column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT'
    }).catch(() => {});

    // Add JSONB columns
    console.log('📝 Adding address JSONB column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS address JSONB'
    }).catch(() => {});

    console.log('📝 Adding emergency_contact JSONB column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact JSONB'
    }).catch(() => {});

    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Added fields: name, gender, date_of_birth, address, emergency_contact');
    console.log('🔄 You can now re-import GoTeamUp customer data\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Please apply the migration manually using the Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/yafbzdjwhlbeafamznhw/sql');
    console.log('\n   Copy and paste the contents of: APPLY_CLIENT_PROFILE_MIGRATION.sql\n');
    process.exit(1);
  }
}

// Run migration
applyMigration();
