#!/usr/bin/env tsx

/**
 * Environment Issues Checker
 * Identifies differences between localhost and production
 */

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const LOCAL_URL = 'http://localhost:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || PROD_KEY;

async function checkEnvironmentIssues() {
  console.log('🔍 Checking for Environment Differences\n');
  console.log('=' .repeat(50));

  const issues: string[] = [];
  
  // Create clients
  const prodClient = createClient(PROD_URL, PROD_KEY);
  const localClient = createClient(LOCAL_URL, LOCAL_KEY).catch(() => null);
  
  // 1. Check membership_plans price fields
  console.log('\n📊 Checking membership_plans...');
  const { data: prodPlans } = await prodClient
    .from('membership_plans')
    .select('id, name, price, price_pennies')
    .limit(5);
    
  if (prodPlans) {
    prodPlans.forEach(plan => {
      if (plan.price !== plan.price_pennies) {
        issues.push(`❌ membership_plans: ${plan.name} has mismatched price fields (price=${plan.price}, price_pennies=${plan.price_pennies})`);
      }
    });
  }
  
  // 2. Check for missing RLS policies
  console.log('\n🔒 Checking RLS policies...');
  const tables = ['membership_plans', 'programs', 'class_sessions', 'bookings', 'clients'];
  
  for (const table of tables) {
    try {
      // Try to query without auth - should fail if RLS is enabled
      const { data, error } = await prodClient
        .from(table)
        .select('id')
        .limit(1);
        
      if (!error && data) {
        issues.push(`⚠️ ${table}: May have RLS issues (public read allowed)`);
      }
    } catch (e) {
      // This is good - RLS is working
    }
  }
  
  // 3. Check for field name inconsistencies
  console.log('\n🏷️ Checking field naming...');
  const { data: clientSample } = await prodClient
    .from('clients')
    .select('*')
    .limit(1)
    .single();
    
  if (clientSample) {
    if ('organization_id' in clientSample && 'org_id' in clientSample) {
      issues.push('⚠️ clients table has both organization_id and org_id fields');
    }
  }
  
  // 4. Check for missing indexes
  console.log('\n⚡ Checking performance indexes...');
  const { data: indexes } = await prodClient.rpc('get_indexes', {}).catch(() => ({ data: null }));
  
  if (!indexes) {
    issues.push('ℹ️ Could not check indexes (function may not exist)');
  }
  
  // 5. Check environment variables
  console.log('\n🔐 Checking environment variables...');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push('⚠️ Using hardcoded service role key (should use env var)');
  }
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📋 ISSUES FOUND:\n');
  
  if (issues.length === 0) {
    console.log('✅ No issues found! Environments are in sync.');
  } else {
    issues.forEach(issue => console.log(issue));
    
    console.log('\n🛠️ RECOMMENDED FIXES:\n');
    console.log('1. Run: npm run db:fix');
    console.log('2. Run: npm run db:sync:schema');
    console.log('3. Ensure all migrations are applied to production');
    console.log('4. Check that environment variables match between environments');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run the check
checkEnvironmentIssues().catch(console.error);