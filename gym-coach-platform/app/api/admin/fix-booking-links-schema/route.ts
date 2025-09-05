import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Since we can't run DDL through Supabase client, let's try to test the current state
    // and provide instructions for manual migration
    
    // Test if the columns exist by trying to select them
    const testQueries = [
      { column: 'assigned_staff_ids', test: 'assigned_staff_ids' },
      { column: 'meeting_title_template', test: 'meeting_title_template' },
      { column: 'meeting_location', test: 'meeting_location' },
      { column: 'availability_rules', test: 'availability_rules' },
      { column: 'form_configuration', test: 'form_configuration' },
      { column: 'confirmation_settings', test: 'confirmation_settings' },
      { column: 'notification_settings', test: 'notification_settings' },
      { column: 'style_settings', test: 'style_settings' },
      { column: 'payment_settings', test: 'payment_settings' },
      { column: 'cancellation_policy', test: 'cancellation_policy' },
      { column: 'booking_limits', test: 'booking_limits' },
      { column: 'buffer_settings', test: 'buffer_settings' }
    ]

    const results = []
    const missingColumns = []

    for (const { column, test } of testQueries) {
      try {
        const { error } = await supabase
          .from('booking_links')
          .select(test)
          .limit(1)

        if (error && error.message.includes('does not exist')) {
          missingColumns.push(column)
          results.push({ column, exists: false, error: error.message })
        } else {
          results.push({ column, exists: true })
        }
      } catch (e) {
        missingColumns.push(column)
        results.push({ column, exists: false, error: (e as Error).message })
      }
    }

    const migrationSQL = `
-- Quick fix for missing assigned_staff_ids column in booking_links table
-- Run this SQL directly in your Supabase SQL Editor

DO $$
BEGIN
  -- Staff assignment column (this is the main one causing the error)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'assigned_staff_ids') THEN
    ALTER TABLE booking_links ADD COLUMN assigned_staff_ids UUID[];
    RAISE NOTICE 'Added assigned_staff_ids column to booking_links table';
  ELSE
    RAISE NOTICE 'assigned_staff_ids column already exists in booking_links table';
  END IF;
  
  -- Add other commonly needed columns that might be missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_title_template') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_title_template TEXT DEFAULT '{{contact.name}} - {{service}}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'meeting_location') THEN
    ALTER TABLE booking_links ADD COLUMN meeting_location JSONB DEFAULT '{"type": "in_person", "details": ""}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'availability_rules') THEN
    ALTER TABLE booking_links ADD COLUMN availability_rules JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'form_configuration') THEN
    ALTER TABLE booking_links ADD COLUMN form_configuration JSONB DEFAULT '{"fields": [], "consent_text": "I agree to receive communications about my booking."}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'confirmation_settings') THEN
    ALTER TABLE booking_links ADD COLUMN confirmation_settings JSONB DEFAULT '{"auto_confirm": true, "redirect_url": "", "custom_message": ""}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'notification_settings') THEN
    ALTER TABLE booking_links ADD COLUMN notification_settings JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "reminder_schedules": ["1 day", "1 hour"]}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'style_settings') THEN
    ALTER TABLE booking_links ADD COLUMN style_settings JSONB DEFAULT '{"primary_color": "#3b82f6", "background_color": "#ffffff", "custom_css": ""}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'payment_settings') THEN
    ALTER TABLE booking_links ADD COLUMN payment_settings JSONB DEFAULT '{"enabled": false, "amount": 0, "currency": "GBP", "description": ""}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'cancellation_policy') THEN
    ALTER TABLE booking_links ADD COLUMN cancellation_policy JSONB DEFAULT '{"allowed": true, "hours_before": 24, "policy_text": "Cancellations allowed up to 24 hours before appointment."}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'booking_limits') THEN
    ALTER TABLE booking_links ADD COLUMN booking_limits JSONB DEFAULT '{"max_per_day": null, "max_per_week": null, "max_per_month": null}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_links' AND column_name = 'buffer_settings') THEN
    ALTER TABLE booking_links ADD COLUMN buffer_settings JSONB DEFAULT '{"before_minutes": 0, "after_minutes": 15}';
  END IF;
END $$;
    `.trim()

    return NextResponse.json({ 
      success: false,
      message: 'Schema check completed. Manual migration required.',
      missing_columns: missingColumns,
      column_status: results,
      migration_sql: migrationSQL,
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Navigate to the SQL Editor',
        '3. Copy and paste the migration_sql provided above',
        '4. Execute the SQL to add the missing columns',
        '5. Try creating the booking link again'
      ]
    })

  } catch (error) {
    console.error('Error checking booking links schema:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check booking links schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check current schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'booking_links')
      .order('column_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requiredColumns = [
      'assigned_staff_ids', 
      'meeting_title_template', 
      'meeting_location', 
      'availability_rules',
      'form_configuration',
      'confirmation_settings',
      'notification_settings',
      'style_settings',
      'payment_settings',
      'cancellation_policy',
      'booking_limits',
      'buffer_settings'
    ]

    const existingColumns = columns?.map(c => c.column_name) || []
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))

    return NextResponse.json({
      current_columns: columns,
      required_columns: requiredColumns,
      missing_columns: missingColumns,
      needs_migration: missingColumns.length > 0
    })

  } catch (error) {
    console.error('Error checking booking links schema:', error)
    return NextResponse.json(
      { error: 'Failed to check schema' },
      { status: 500 }
    )
  }
}