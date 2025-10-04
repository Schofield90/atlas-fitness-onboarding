#!/usr/bin/env node

/**
 * Apply client profile migration to add address and emergency contact fields
 * Uses direct PostgreSQL connection
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection - using direct database URL (not pooler)
const DATABASE_URL = 'postgres://postgres.lzlrojoaxrqvmhempnkn:OGFYlxSChyYLgQxn@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function applyMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Applying client profile migration...\n');

    // Execute migration queries
    const queries = [
      {
        name: 'Add name column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT'
      },
      {
        name: 'Add gender column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(20)'
      },
      {
        name: 'Add date_of_birth column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS date_of_birth DATE'
      },
      {
        name: 'Add emergency_contact_name column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT'
      },
      {
        name: 'Add emergency_contact_phone column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT'
      },
      {
        name: 'Add address JSONB column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS address JSONB'
      },
      {
        name: 'Add emergency_contact JSONB column',
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_contact JSONB'
      },
      {
        name: 'Create index on name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)'
      },
      {
        name: 'Create index on date_of_birth',
        sql: 'CREATE INDEX IF NOT EXISTS idx_clients_date_of_birth ON clients(date_of_birth)'
      }
    ];

    for (const query of queries) {
      console.log(`📝 ${query.name}...`);
      await pool.query(query.sql);
    }

    // Verify columns were added
    console.log('\n🔍 Verifying columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      AND column_name IN ('name', 'gender', 'date_of_birth', 'address', 'emergency_contact', 'emergency_contact_name', 'emergency_contact_phone')
      ORDER BY column_name
    `);

    console.log('\n📋 Added columns:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('🔄 You can now re-import GoTeamUp customer data\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Please apply the migration manually using the Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql');
    console.log('\n   Copy and paste the contents of: APPLY_CLIENT_PROFILE_MIGRATION.sql\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
applyMigration();
