#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFacebookConnection() {
  console.log('🔍 Debugging Facebook Connection Issue\n')
  console.log('========================================')
  
  try {
    // 1. Check if facebook_integrations table exists
    console.log('\n1️⃣ Checking if facebook_integrations table exists...')
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'facebook_integrations')
      .single()
    
    if (tableError || !tables) {
      console.error('❌ Table facebook_integrations does not exist!')
      console.log('Creating table...')
      
      // Create the table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS facebook_integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            facebook_user_id TEXT NOT NULL,
            facebook_user_name TEXT,
            facebook_user_email TEXT,
            access_token TEXT NOT NULL,
            token_expires_at TIMESTAMPTZ,
            granted_scopes TEXT[],
            is_active BOOLEAN DEFAULT true,
            settings JSONB DEFAULT '{}',
            last_sync_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(organization_id, facebook_user_id)
          );
          
          -- Create indexes
          CREATE INDEX idx_facebook_integrations_org ON facebook_integrations(organization_id);
          CREATE INDEX idx_facebook_integrations_user ON facebook_integrations(user_id);
          CREATE INDEX idx_facebook_integrations_active ON facebook_integrations(is_active);
        `
      })
      
      if (createError) {
        console.error('Failed to create table:', createError)
      } else {
        console.log('✅ Table created successfully')
      }
    } else {
      console.log('✅ Table exists')
    }
    
    // 2. Check all Facebook integrations
    console.log('\n2️⃣ Checking all Facebook integrations...')
    const { data: integrations, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (intError) {
      console.error('❌ Error fetching integrations:', intError)
    } else if (!integrations || integrations.length === 0) {
      console.log('⚠️ No Facebook integrations found in database')
    } else {
      console.log(`✅ Found ${integrations.length} integration(s):`)
      integrations.forEach((int, i) => {
        console.log(`\n  Integration ${i + 1}:`)
        console.log(`    - ID: ${int.id}`)
        console.log(`    - User ID: ${int.user_id}`)
        console.log(`    - Organization ID: ${int.organization_id}`)
        console.log(`    - Facebook User: ${int.facebook_user_name} (${int.facebook_user_id})`)
        console.log(`    - Active: ${int.is_active}`)
        console.log(`    - Token Expires: ${int.token_expires_at}`)
        console.log(`    - Created: ${int.created_at}`)
      })
    }
    
    // 3. Check for the specific user (sam@gymleadhub.co.uk)
    console.log('\n3️⃣ Checking for sam@gymleadhub.co.uk user...')
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', 'sam@gymleadhub.co.uk')
      .single()
    
    if (userError || !userData) {
      console.error('❌ User not found:', userError)
    } else {
      console.log(`✅ User found: ${userData.email} (ID: ${userData.id})`)
      
      // Check integrations for this user
      const { data: userIntegrations, error: userIntError } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('user_id', userData.id)
      
      if (userIntError) {
        console.error('❌ Error fetching user integrations:', userIntError)
      } else if (!userIntegrations || userIntegrations.length === 0) {
        console.log('⚠️ No Facebook integrations for this user')
      } else {
        console.log(`✅ Found ${userIntegrations.length} integration(s) for this user`)
      }
    }
    
    // 4. Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...')
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename = 'facebook_integrations'
      `
    })
    
    if (policyError) {
      console.error('❌ Error checking policies:', policyError)
    } else if (!policies || policies.length === 0) {
      console.log('⚠️ No RLS policies found for facebook_integrations')
      console.log('Creating RLS policies...')
      
      // Create RLS policies
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Enable RLS
          ALTER TABLE facebook_integrations ENABLE ROW LEVEL SECURITY;
          
          -- Users can view their own integrations
          CREATE POLICY "Users can view own integrations"
            ON facebook_integrations
            FOR SELECT
            USING (auth.uid() = user_id);
          
          -- Users can insert their own integrations
          CREATE POLICY "Users can insert own integrations"
            ON facebook_integrations
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
          
          -- Users can update their own integrations
          CREATE POLICY "Users can update own integrations"
            ON facebook_integrations
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
          
          -- Users can delete their own integrations
          CREATE POLICY "Users can delete own integrations"
            ON facebook_integrations
            FOR DELETE
            USING (auth.uid() = user_id);
        `
      })
      
      if (rlsError) {
        console.error('Failed to create RLS policies:', rlsError)
      } else {
        console.log('✅ RLS policies created')
      }
    } else {
      console.log(`✅ Found ${policies.length} RLS policies`)
      policies.forEach((policy: any) => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`)
      })
    }
    
    // 5. Test inserting a dummy integration
    console.log('\n5️⃣ Testing database write access...')
    if (userData) {
      const testIntegration = {
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e', // Default Atlas org
        user_id: userData.id,
        facebook_user_id: 'test_' + Date.now(),
        facebook_user_name: 'Test User',
        access_token: 'test_token',
        is_active: false
      }
      
      const { data: testData, error: testError } = await supabase
        .from('facebook_integrations')
        .insert(testIntegration)
        .select()
        .single()
      
      if (testError) {
        console.error('❌ Failed to insert test integration:', testError)
        console.log('This might be an RLS issue')
      } else {
        console.log('✅ Successfully inserted test integration')
        
        // Clean up
        const { error: deleteError } = await supabase
          .from('facebook_integrations')
          .delete()
          .eq('id', testData.id)
        
        if (!deleteError) {
          console.log('✅ Test integration cleaned up')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
  
  console.log('\n========================================')
  console.log('Debug complete!')
}

debugFacebookConnection()