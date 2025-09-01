#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sql = `
-- Fix clients table to use org_id instead of organization_id
DO $$ 
BEGIN
    -- Check if organization_id column exists and org_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'organization_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Rename the column
        ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
        RAISE NOTICE 'Renamed organization_id to org_id';
    
    -- Check if neither column exists
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        -- Add org_id column with default organization
        ALTER TABLE clients 
        ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' 
        REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added org_id column';
    ELSE
        RAISE NOTICE 'org_id column already exists';
    END IF;
END $$;

-- Ensure RLS policies use org_id
DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;

CREATE POLICY "Users can view clients in their organization"
    ON clients FOR SELECT
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create clients in their organization"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete clients in their organization"
    ON clients FOR DELETE
    TO authenticated
    USING (
        org_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
`

async function executeSql() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`)
  
  const options = {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  }

  return new Promise((resolve, reject) => {
    console.log('🔧 Executing SQL to fix clients table...')
    
    const req = https.request(url.toString(), options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log('✅ SQL executed successfully!')
          resolve(data)
        } else {
          console.error('❌ Failed to execute SQL:', res.statusCode, data)
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error)
      reject(error)
    })
    
    req.write(options.body)
    req.end()
  })
}

// Alternative approach using fetch if available
async function executeWithFetch() {
  console.log('🔧 Attempting to fix clients table via Supabase API...')
  
  try {
    // First, let's try a direct approach
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    // Test current state
    console.log('📋 Testing current table state...')
    const { error: testError } = await supabase
      .from('clients')
      .select('id')
      .limit(1)
    
    if (testError && testError.message.includes('org_id')) {
      console.log('⚠️  Confirmed: org_id column issue exists')
      
      // Since we can't run raw SQL via the JS client, let's provide the final solution
      console.log('\n📝 MANUAL FIX REQUIRED')
      console.log('=' .repeat(50))
      console.log('\nPlease go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new')
      console.log('\nCopy and paste this EXACT SQL (all of it):')
      console.log('\n--- START SQL ---')
      console.log(sql)
      console.log('--- END SQL ---')
      console.log('\n' + '=' .repeat(50))
      console.log('\nAfter running the SQL, the customers page will work correctly.')
      
    } else if (testError) {
      console.error('Different error:', testError.message)
    } else {
      console.log('✅ Table appears to be working! Testing insert...')
      
      // Test insert
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          first_name: 'Test',
          last_name: 'Fix',
          email: `test-${Date.now()}@fix.com`,
          org_id: '63589490-8f55-4157-bd3a-e141594b748e'
        })
      
      if (insertError) {
        console.error('❌ Insert failed:', insertError.message)
        if (insertError.message.includes('org_id')) {
          console.log('\n⚠️  The org_id issue still exists. Please run the SQL manually as shown above.')
        }
      } else {
        console.log('✅ Insert successful! The clients table is fixed!')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\nPlease run the SQL manually in the Supabase dashboard.')
  }
}

// Run the fix
executeWithFetch().catch(console.error)