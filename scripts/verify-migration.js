const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const expectedTables = [
  'organizations',
  'users',
  'organization_members',
  'leads',
  'clients',
  'opportunities',
  'classes',
  'class_sessions',
  'bookings',
  'staff',
  'timesheets',
  'payroll_batches',
  'messages',
  'email_templates',
  'workflows',
  'workflow_executions',
  'webhooks',
  'integration_tokens',
  'analytics_events',
  'daily_metrics',
  'audit_logs',
  'data_export_requests'
];

async function verifyMigration() {
  console.log('🔍 Verifying Multi-Tenant CRM Migration...\n');
  
  let allTablesExist = true;
  const missingTables = [];
  
  for (const table of expectedTables) {
    try {
      // Try to query the table
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`❌ Table '${table}' - Missing`);
        missingTables.push(table);
        allTablesExist = false;
      } else if (error) {
        console.log(`⚠️  Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' - Exists`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' - Error: ${err.message}`);
      missingTables.push(table);
      allTablesExist = false;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Total tables expected: ${expectedTables.length}`);
  console.log(`Tables found: ${expectedTables.length - missingTables.length}`);
  console.log(`Tables missing: ${missingTables.length}`);
  
  if (allTablesExist) {
    console.log('\n✅ All tables exist! The migration appears to be complete.');
    
    // Check if demo organization exists
    const { data: demoOrg } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
      
    if (demoOrg) {
      console.log(`\n🏢 Demo organization found: ${demoOrg.name}`);
    }
  } else {
    console.log('\n❌ Migration is incomplete. Missing tables:');
    missingTables.forEach(table => console.log(`   - ${table}`));
    console.log('\n📝 Please run the migration using the instructions in:');
    console.log('   /supabase/migrations/README.md');
  }
  
  // Check for existing tables that might conflict
  console.log('\n🔍 Checking for existing tables that might need migration...');
  
  const existingTables = [
    'organization_staff',
    'forms',
    'sops',
    'chatbot_settings'
  ];
  
  for (const table of existingTables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
      
    if (!error || !error.message.includes('does not exist')) {
      console.log(`📌 Existing table found: ${table} (from previous migrations)`);
    }
  }
}

verifyMigration().catch(console.error);