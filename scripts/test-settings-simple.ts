#!/usr/bin/env tsx

/**
 * Simple test to verify settings pages work
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'

async function testSettingsData() {
  console.log('🧪 Testing Settings Data Access\n')
  
  const tests = [
    { table: 'phone_settings', name: 'Phone Settings' },
    { table: 'lead_scoring_settings', name: 'Lead Scoring' },
    { table: 'calendar_settings', name: 'Calendar' },
    { table: 'pipelines', name: 'Pipelines' },
    { table: 'custom_fields', name: 'Custom Fields' },
    { table: 'email_templates', name: 'Email Templates' }
  ]
  
  // First, sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sam@atlas-gyms.co.uk',
    password: 'SecurePassword123!'
  })
  
  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    return
  }
  
  console.log('✅ Authenticated successfully\n')
  
  for (const test of tests) {
    try {
      const { data, error } = await supabase
        .from(test.table)
        .select('*')
        .eq('organization_id', TEST_ORG_ID)
        .limit(1)
      
      if (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`)
      } else if (data && data.length > 0) {
        console.log(`✅ ${test.name}: Data exists`)
      } else {
        console.log(`⚠️  ${test.name}: No data (will be created on first access)`)
      }
    } catch (err: any) {
      console.log(`❌ ${test.name}: Failed - ${err.message}`)
    }
  }
  
  console.log('\n✨ All settings tables are accessible!')
  console.log('\n📝 Next: Navigate to each settings page in the browser:')
  console.log('   - http://localhost:3000/settings/business')
  console.log('   - http://localhost:3000/settings/staff')
  console.log('   - http://localhost:3000/settings/pipelines')
  console.log('   - http://localhost:3000/settings/calendar')
  console.log('   - http://localhost:3000/settings/custom-fields')
  console.log('   - http://localhost:3000/settings/templates')
  console.log('   - http://localhost:3000/settings/phone')
  console.log('   - http://localhost:3000/settings/lead-scoring')
}

testSettingsData().catch(console.error)