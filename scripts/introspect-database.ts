import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function introspectDatabase() {
  try {
    // Query to get all tables
    const tablesQuery = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      query: tablesQuery
    })

    if (tablesError) {
      console.log('Direct SQL not available, using alternate method...')
      
      // List of all possible tables based on the check
      const allTables = [
        'users', 'organizations', 'leads', 'contacts', 'appointments',
        'tasks', 'forms', 'email_logs', 'sms_logs', 'whatsapp_logs',
        'facebook_integrations', 'facebook_pages', 'facebook_lead_forms', 
        'facebook_leads', 'facebook_webhooks', 'facebook_ad_accounts',
        'facebook_campaigns', 'workflows', 'workflow_triggers', 'workflow_actions',
        'workflow_executions', 'class_sessions', 'bookings', 'programs', 
        'memberships', 'class_credits', 'waitlist_entries', 'staff_invitations',
        'organization_staff', 'instructors', 'analytics_events', 'daily_reports',
        'knowledge', 'ai_feedback', 'conversation_contexts', 'message_templates',
        'notification_settings', 'security_settings', 'custom_fields',
        'custom_field_values', 'audit_logs', 'google_calendar_tokens',
        'calendar_sync_settings', 'calendar_sync_events', 'google_calendar_watches',
        'saas_plans', 'saas_subscriptions', 'organization_usage_metrics',
        'organization_payment_settings', 'payment_transactions', 'platform_commissions'
      ]

      console.log('Checking all potential tables...\n')
      
      const existingTables = []
      for (const table of allTables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          if (!error) {
            existingTables.push(table)
            console.log(`✓ ${table}: exists (${count} records)`)
          } else {
            // Log to see what's happening
            if (error.code !== '42P01') {  // Not a "table doesn't exist" error
              console.log(`? ${table}: ${error.message}`)
            }
          }
        } catch (e) {
          console.log(`✗ ${table}: Exception - ${e}`)
        }
      }

      console.log(`\nFound ${existingTables.length} tables`)
      console.log('\nGenerating Prisma schema based on found tables...')
      
      // Generate a basic Prisma schema
      let schemaContent = `// This is your Prisma schema file,
// Generated from existing Supabase database

generator client {
  provider = "prisma-client-js"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Note: This is a basic schema. Run 'npx prisma db pull' with proper credentials
// to get the complete schema with all columns and relationships.

`

      for (const table of existingTables) {
        schemaContent += `model ${table} {\n`
        schemaContent += `  id String @id @default(uuid())\n`
        schemaContent += `  // Add columns here based on actual table structure\n`
        schemaContent += `  created_at DateTime @default(now())\n`
        schemaContent += `  updated_at DateTime @updatedAt\n`
        schemaContent += `}\n\n`
      }

      // Save to a temporary schema file
      const tempSchemaPath = path.join(process.cwd(), 'prisma', 'schema.temp.prisma')
      fs.writeFileSync(tempSchemaPath, schemaContent)
      
      console.log(`\nBasic schema saved to: ${tempSchemaPath}`)
      console.log('\nNext steps:')
      console.log('1. Set up proper database credentials')
      console.log('2. Run: npx prisma db pull')
      console.log('3. Or manually update the schema based on your table structures')
      
      return existingTables
    }

    console.log('Tables found:', tables)
    return tables
  } catch (error) {
    console.error('Error:', error)
  }
}

introspectDatabase()