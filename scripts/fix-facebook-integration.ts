#!/usr/bin/env tsx

/**
 * Facebook Integration Diagnostic and Fix Script
 * This script helps diagnose and fix Facebook integration issues
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkFacebookIntegration() {
  console.log('🔍 Facebook Integration Diagnostic Tool\n')
  console.log('=' .repeat(50))
  
  // Step 1: Check environment variables
  console.log('\n1️⃣ Checking Environment Variables...')
  const requiredEnvVars = {
    'FACEBOOK_APP_ID': process.env.FACEBOOK_APP_ID,
    'NEXT_PUBLIC_FACEBOOK_APP_ID': process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    'FACEBOOK_APP_SECRET': process.env.FACEBOOK_APP_SECRET,
  }
  
  let envOk = true
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.log(`  ❌ ${key}: Missing`)
      envOk = false
    } else {
      console.log(`  ✅ ${key}: Set`)
    }
  }
  
  if (!envOk) {
    console.log('\n⚠️ Missing environment variables. Please set them in .env.local')
    return
  }
  
  // Step 2: Check Facebook integrations in database
  console.log('\n2️⃣ Checking Database Records...')
  
  const { data: integrations, error: intError } = await supabase
    .from('facebook_integrations')
    .select('*')
    .eq('is_active', true)
  
  if (intError) {
    console.log(`  ❌ Error fetching integrations: ${intError.message}`)
    return
  }
  
  if (!integrations || integrations.length === 0) {
    console.log('  ⚠️ No active Facebook integrations found')
    console.log('\n📝 Solution: User needs to reconnect Facebook account')
    return
  }
  
  console.log(`  ✅ Found ${integrations.length} active integration(s)`)
  
  // Step 3: Check each integration
  for (const integration of integrations) {
    console.log(`\n3️⃣ Checking Integration ID: ${integration.id}`)
    console.log(`  Organization: ${integration.organization_id}`)
    console.log(`  User: ${integration.facebook_user_name || 'Unknown'}`)
    console.log(`  Connected: ${integration.created_at}`)
    
    // Check token expiration
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at)
      const now = new Date()
      if (expiresAt < now) {
        console.log(`  ❌ Token expired on ${expiresAt.toISOString()}`)
        console.log('  📝 Solution: User needs to reconnect Facebook account')
        continue
      } else {
        console.log(`  ✅ Token valid until ${expiresAt.toISOString()}`)
      }
    }
    
    // Check granted scopes
    const requiredScopes = [
      'pages_show_list',
      'pages_read_engagement', 
      'leads_retrieval',
      'ads_management'
    ]
    
    const grantedScopes = integration.granted_scopes || []
    console.log('\n  📋 Permission Check:')
    
    const missingScopes = []
    for (const scope of requiredScopes) {
      if (grantedScopes.includes(scope)) {
        console.log(`    ✅ ${scope}`)
      } else {
        console.log(`    ❌ ${scope} - MISSING`)
        missingScopes.push(scope)
      }
    }
    
    if (missingScopes.length > 0) {
      console.log(`\n  ⚠️ Missing ${missingScopes.length} required permissions`)
      console.log('  📝 Solution: User needs to reconnect and grant all permissions')
    }
    
    // Step 4: Test Facebook API with the token
    if (integration.access_token) {
      console.log('\n4️⃣ Testing Facebook API Access...')
      
      // Test 1: User profile
      try {
        const meResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${integration.access_token}`
        )
        const meData = await meResponse.json()
        
        if (meData.error) {
          console.log(`  ❌ User Profile: ${meData.error.message}`)
          if (meData.error.code === 190) {
            console.log('  📝 Token is invalid or expired - reconnection required')
          }
        } else {
          console.log(`  ✅ User Profile: ${meData.name || meData.id}`)
        }
      } catch (error) {
        console.log(`  ❌ User Profile: Network error`)
      }
      
      // Test 2: Pages access
      try {
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${integration.access_token}`
        )
        const pagesData = await pagesResponse.json()
        
        if (pagesData.error) {
          console.log(`  ❌ Pages Access: ${pagesData.error.message}`)
          console.log('  📝 Ensure user has admin access to at least one Facebook Page')
        } else if (!pagesData.data || pagesData.data.length === 0) {
          console.log(`  ⚠️ Pages Access: No pages found`)
          console.log('  📝 User needs admin access to Facebook Pages')
        } else {
          console.log(`  ✅ Pages Access: Found ${pagesData.data.length} page(s)`)
          for (const page of pagesData.data.slice(0, 3)) {
            console.log(`     - ${page.name}`)
          }
        }
      } catch (error) {
        console.log(`  ❌ Pages Access: Network error`)
      }
      
      // Test 3: Ad Accounts access
      try {
        const adAccountsResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${integration.access_token}`
        )
        const adAccountsData = await adAccountsResponse.json()
        
        if (adAccountsData.error) {
          console.log(`  ❌ Ad Accounts: ${adAccountsData.error.message}`)
          console.log('  📝 Ensure user has Business Manager access')
        } else if (!adAccountsData.data || adAccountsData.data.length === 0) {
          console.log(`  ⚠️ Ad Accounts: No ad accounts found`)
          console.log('  📝 User needs access to ad accounts in Business Manager')
        } else {
          console.log(`  ✅ Ad Accounts: Found ${adAccountsData.data.length} account(s)`)
          for (const account of adAccountsData.data.slice(0, 3)) {
            console.log(`     - ${account.name || account.id}`)
          }
        }
      } catch (error) {
        console.log(`  ❌ Ad Accounts: Network error`)
      }
    }
  }
  
  // Step 5: Check Facebook Pages table
  console.log('\n5️⃣ Checking Stored Facebook Pages...')
  const { data: pages, error: pagesError } = await supabase
    .from('facebook_pages')
    .select('*')
    .eq('is_active', true)
  
  if (pagesError) {
    console.log(`  ❌ Error fetching pages: ${pagesError.message}`)
  } else if (!pages || pages.length === 0) {
    console.log('  ⚠️ No Facebook pages stored in database')
    console.log('  📝 Run the sync pages endpoint after fixing permissions')
  } else {
    console.log(`  ✅ Found ${pages.length} stored page(s)`)
  }
  
  // Summary and recommendations
  console.log('\n' + '=' .repeat(50))
  console.log('📊 SUMMARY & RECOMMENDATIONS\n')
  
  console.log('If you\'re experiencing issues, follow these steps in order:\n')
  console.log('1. Disconnect the current Facebook integration')
  console.log('2. Clear browser cache and Facebook cookies')
  console.log('3. Reconnect Facebook and grant ALL permissions:')
  console.log('   - pages_show_list')
  console.log('   - pages_read_engagement')
  console.log('   - leads_retrieval')
  console.log('   - ads_management')
  console.log('   - business_management')
  console.log('4. Ensure you have:')
  console.log('   - Admin access to at least one Facebook Page')
  console.log('   - Business Manager account set up')
  console.log('   - Ad Account access (if using ads features)')
  console.log('5. After reconnecting, click "Sync Pages" button')
  
  console.log('\n✨ Script completed!')
}

// Run the diagnostic
checkFacebookIntegration().catch(console.error)