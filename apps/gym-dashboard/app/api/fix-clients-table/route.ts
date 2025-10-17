import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // This is a one-time fix endpoint - should be secured in production
    const adminClient = createAdminClient()
    
    console.log('Starting clients table fix...')
    
    // SQL to fix the clients table
    const fixSQL = `
      -- Add missing columns to clients table
      DO $$ 
      BEGIN
          -- created_by column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'created_by') THEN
              ALTER TABLE clients ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
              RAISE NOTICE 'Added created_by column';
          END IF;
          
          -- date_of_birth column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'date_of_birth') THEN
              ALTER TABLE clients ADD COLUMN date_of_birth DATE;
              RAISE NOTICE 'Added date_of_birth column';
          END IF;
          
          -- address column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'address') THEN
              ALTER TABLE clients ADD COLUMN address TEXT;
              RAISE NOTICE 'Added address column';
          END IF;
          
          -- emergency_contact_name column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'emergency_contact_name') THEN
              ALTER TABLE clients ADD COLUMN emergency_contact_name TEXT;
              RAISE NOTICE 'Added emergency_contact_name column';
          END IF;
          
          -- emergency_contact_phone column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'emergency_contact_phone') THEN
              ALTER TABLE clients ADD COLUMN emergency_contact_phone TEXT;
              RAISE NOTICE 'Added emergency_contact_phone column';
          END IF;
          
          -- goals column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'goals') THEN
              ALTER TABLE clients ADD COLUMN goals TEXT;
              RAISE NOTICE 'Added goals column';
          END IF;
          
          -- medical_conditions column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'medical_conditions') THEN
              ALTER TABLE clients ADD COLUMN medical_conditions TEXT;
              RAISE NOTICE 'Added medical_conditions column';
          END IF;
          
          -- source column
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_name = 'clients' AND column_name = 'source') THEN
              ALTER TABLE clients ADD COLUMN source TEXT DEFAULT 'manual';
              RAISE NOTICE 'Added source column';
          END IF;
      END $$;
    `
    
    // Execute the fix
    const { error: migrationError } = await adminClient.rpc('exec_sql', { sql: fixSQL })
    
    // If exec_sql doesn't exist, provide the SQL for manual execution
    if (migrationError) {
      console.error('Database fix error:', migrationError)
      
      // Check if clients table exists to provide better guidance
      const { data: tableCheck, error: checkError } = await adminClient
        .from('clients')
        .select('*')
        .limit(0)
      
      return NextResponse.json({
        success: false,
        error: 'Migration needs to be applied manually',
        message: 'Please run the following SQL in your Supabase SQL Editor:',
        sql: fixSQL,
        table_exists: !checkError,
        original_error: migrationError.message
      }, { status: 200 }) // Return 200 so frontend can handle this case
    }
    
    console.log('Clients table fix completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Clients table fix applied successfully'
    })
    
  } catch (error) {
    console.error('Error applying clients table fix:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}