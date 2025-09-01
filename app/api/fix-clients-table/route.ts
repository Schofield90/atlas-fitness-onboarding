import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Test the clients table
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('*')
      .limit(1)
    
    let status = {
      tableAccessible: !testError,
      error: testError?.message,
      hasOrgIdIssue: false,
      fixApplied: false
    }
    
    if (testError && testError.message.includes('org_id')) {
      status.hasOrgIdIssue = true
      
      // Try to create a client with organization_id instead
      const { error: altError } = await supabase
        .from('clients')
        .insert({
          first_name: 'Test',
          last_name: 'Client',
          email: `test-${Date.now()}@example.com`,
          organization_id: '63589490-8f55-4157-bd3a-e141594b748e' // Try with organization_id
        })
        .select()
        .single()
      
      if (!altError) {
        status.fixApplied = true
        status.error = 'Table uses organization_id, not org_id. Code needs to be updated.'
      }
    }
    
    // Provide the SQL fix
    const sqlFix = `
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new

-- Fix clients table to use org_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'organization_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        ALTER TABLE clients RENAME COLUMN organization_id TO org_id;
        RAISE NOTICE 'Renamed organization_id to org_id';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'clients' AND column_name = 'org_id') THEN
        ALTER TABLE clients 
        ADD COLUMN org_id UUID NOT NULL DEFAULT '63589490-8f55-4157-bd3a-e141594b748e' 
        REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added org_id column';
    END IF;
END $$;

-- Update RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clients in their organization" ON clients;
CREATE POLICY "Users can view clients in their organization"
    ON clients FOR SELECT TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
CREATE POLICY "Users can create clients in their organization"
    ON clients FOR INSERT TO authenticated
    WITH CHECK (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
CREATE POLICY "Users can update clients in their organization"
    ON clients FOR UPDATE TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;
CREATE POLICY "Users can delete clients in their organization"
    ON clients FOR DELETE TO authenticated
    USING (org_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));
    `
    
    return NextResponse.json({
      status,
      instructions: {
        step1: 'Go to Supabase SQL Editor',
        step2: 'https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new',
        step3: 'Copy and run the SQL below',
        sqlToRun: sqlFix
      }
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Fix error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}