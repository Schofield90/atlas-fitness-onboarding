#!/usr/bin/env node

/**
 * Database inspection script for booking links and Google Calendar integrations
 * This script will help debug current database state for Google Calendar integration testing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function inspectDatabase() {
  console.log('🔍 Inspecting booking links and Google Calendar integrations...\n')

  try {
    // 1. Check booking_links table
    console.log('📋 BOOKING LINKS:')
    console.log('================')
    
    const { data: bookingLinks, error: bookingLinksError } = await supabase
      .from('booking_links')
      .select('*')
      .order('created_at', { ascending: false })

    if (bookingLinksError) {
      console.error('❌ Error fetching booking links:', bookingLinksError.message)
    } else {
      if (bookingLinks.length === 0) {
        console.log('⚠️  No booking links found in database')
      } else {
        console.log(`✅ Found ${bookingLinks.length} booking link(s):`)
        bookingLinks.forEach((link, index) => {
          console.log(`\n  ${index + 1}. ID: ${link.id}`)
          console.log(`     Title: ${link.title || 'N/A'}`)
          console.log(`     Slug: ${link.slug || 'N/A'}`)
          console.log(`     User ID: ${link.user_id || 'N/A'}`)
          console.log(`     Organization ID: ${link.organization_id || 'N/A'}`)
          console.log(`     Active: ${link.is_active ? 'Yes' : 'No'}`)
          console.log(`     Created: ${link.created_at}`)
        })
      }
    }

    // 2. Check for users with proper organization relationships
    console.log('\n👤 USERS WITH ORGANIZATION:')
    console.log('============================')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, organization_id')
      .not('organization_id', 'is', null)
      .limit(10)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
    } else {
      if (users.length === 0) {
        console.log('⚠️  No users with organization_id found')
      } else {
        console.log(`✅ Found ${users.length} user(s) with organization:`)
        users.forEach((user, index) => {
          console.log(`\n  ${index + 1}. ID: ${user.id}`)
          console.log(`     Email: ${user.email || 'N/A'}`)
          console.log(`     Organization ID: ${user.organization_id}`)
        })
      }
    }

    // 3. Check Google Calendar tokens
    console.log('\n🗓️  GOOGLE CALENDAR TOKENS:')
    console.log('============================')
    
    const { data: calendarTokens, error: tokensError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .order('created_at', { ascending: false })

    if (tokensError) {
      console.error('❌ Error fetching Google Calendar tokens:', tokensError.message)
    } else {
      if (calendarTokens.length === 0) {
        console.log('⚠️  No Google Calendar tokens found')
      } else {
        console.log(`✅ Found ${calendarTokens.length} Google Calendar token(s):`)
        calendarTokens.forEach((token, index) => {
          const expiryDate = new Date(token.expiry_date)
          const isExpired = expiryDate < new Date()
          console.log(`\n  ${index + 1}. User ID: ${token.user_id}`)
          console.log(`     Has Access Token: ${token.access_token ? 'Yes' : 'No'}`)
          console.log(`     Has Refresh Token: ${token.refresh_token ? 'Yes' : 'No'}`)
          console.log(`     Expires: ${token.expiry_date}`)
          console.log(`     Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`)
          console.log(`     Scope: ${token.scope || 'N/A'}`)
        })
      }
    }

    // 4. Check calendar sync settings
    console.log('\n⚙️  CALENDAR SYNC SETTINGS:')
    console.log('===========================')
    
    const { data: syncSettings, error: syncError } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .order('created_at', { ascending: false })

    if (syncError) {
      console.error('❌ Error fetching sync settings:', syncError.message)
    } else {
      if (syncSettings.length === 0) {
        console.log('⚠️  No calendar sync settings found')
      } else {
        console.log(`✅ Found ${syncSettings.length} sync setting(s):`)
        syncSettings.forEach((setting, index) => {
          console.log(`\n  ${index + 1}. User ID: ${setting.user_id}`)
          console.log(`     Sync Enabled: ${setting.sync_enabled ? 'Yes' : 'No'}`)
          console.log(`     Calendar ID: ${setting.calendar_id || 'N/A'}`)
          console.log(`     Auto Create Events: ${setting.auto_create_events ? 'Yes' : 'No'}`)
          console.log(`     Bidirectional Sync: ${setting.bidirectional_sync ? 'Yes' : 'No'}`)
        })
      }
    }

    // 5. Check organizations
    console.log('\n🏢 ORGANIZATIONS:')
    console.log('==================')
    
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(10)

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError.message)
    } else {
      if (organizations.length === 0) {
        console.log('⚠️  No organizations found')
      } else {
        console.log(`✅ Found ${organizations.length} organization(s):`)
        organizations.forEach((org, index) => {
          console.log(`\n  ${index + 1}. ID: ${org.id}`)
          console.log(`     Name: ${org.name || 'N/A'}`)
          console.log(`     Slug: ${org.slug || 'N/A'}`)
          console.log(`     Plan: ${org.plan || 'N/A'}`)
        })
      }
    }

    // 6. Cross-reference: Find booking links with valid user_id and organization
    console.log('\n🔗 VALID BOOKING LINKS FOR TESTING:')
    console.log('====================================')
    
    if (bookingLinks && bookingLinks.length > 0 && users && users.length > 0) {
      const validLinks = bookingLinks.filter(link => 
        link.user_id && link.organization_id &&
        users.some(user => user.id === link.user_id)
      )
      
      if (validLinks.length === 0) {
        console.log('⚠️  No booking links with proper user/organization setup found')
        console.log('\n💡 RECOMMENDATION: Create a booking link with a valid user_id')
      } else {
        console.log(`✅ Found ${validLinks.length} valid booking link(s) for testing:`)
        validLinks.forEach((link, index) => {
          const user = users.find(u => u.id === link.user_id)
          console.log(`\n  ${index + 1}. Link: ${link.title} (${link.slug})`)
          console.log(`     User: ${user?.email || 'Unknown'} (${link.user_id})`)
          console.log(`     Organization: ${link.organization_id}`)
          console.log(`     URL: /book/${link.slug}`)
        })
      }
    }

    console.log('\n✨ Inspection complete!')

  } catch (error) {
    console.error('💥 Fatal error during inspection:', error.message)
    process.exit(1)
  }
}

// Run the inspection
inspectDatabase()
  .then(() => {
    console.log('\n🎉 Database inspection finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Inspection failed:', error)
    process.exit(1)
  })