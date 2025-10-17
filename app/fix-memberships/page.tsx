'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function FixMembershipsPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    checkMembershipsSetup()
  }, [])

  const checkMembershipsSetup = async () => {
    setStatus('checking')
    setMessage('Checking memberships setup...')
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage('No user logged in. Please log in first.')
        setStatus('error')
        return
      }
      
      // Check user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, organization_id, organizations(id, name)')
        .eq('id', user.id)
        .single()
        
      if (userError) {
        setMessage('Error fetching user data')
        setStatus('error')
        setDetails({ userError })
        return
      }
      
      setUserInfo(userData)
      
      if (!userData?.organization_id) {
        setMessage('User has no organization assigned. Need to fix this.')
        setStatus('error')
        setDetails({ userData, issue: 'missing_organization' })
        return
      }
      
      // Check if membership_plans table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('membership_plans')
        .select('*')
        .limit(1)
        
      if (tableError && tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        setMessage('Membership plans table does not exist. Click the button below to create it.')
        setStatus('idle')
        setDetails({ tableExists: false })
      } else if (tableError) {
        setMessage('Error checking membership plans table')
        setStatus('error')
        setDetails({ tableError })
      } else {
        setMessage('Memberships system is ready!')
        setStatus('success')
        setDetails({ tableExists: true, userData })
      }
    } catch (error) {
      setMessage('Failed to check memberships setup')
      setStatus('error')
      console.error(error)
    }
  }

  const fixUserOrganization = async () => {
    setStatus('migrating')
    setMessage('Fixing user organization...')
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage('No user logged in')
        setStatus('error')
        return
      }
      
      // Get or create Atlas Fitness organization
      let { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Atlas Fitness')
        .single()
        
      if (!org) {
        // Create organization
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({ name: 'Atlas Fitness' })
          .select()
          .single()
          
        if (createError) {
          setMessage('Failed to create organization')
          setStatus('error')
          setDetails({ createError })
          return
        }
        org = newOrg
      }
      
      // Update user with organization
      const { error: updateError } = await supabase
        .from('users')
        .update({ organization_id: org.id })
        .eq('id', user.id)
        
      if (updateError) {
        setMessage('Failed to update user organization')
        setStatus('error')
        setDetails({ updateError })
        return
      }
      
      // Recheck setup
      await checkMembershipsSetup()
      
    } catch (error) {
      setMessage('Failed to fix user organization')
      setStatus('error')
      console.error(error)
    }
  }

  const runMigration = async () => {
    setStatus('migrating')
    setMessage('Creating membership tables...')
    
    try {
      const supabase = createClient()
      
      // Create membership_plans table
      const migrationSQL = `
-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Price in pence
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'one-time')),
  features TEXT[], -- Array of feature descriptions
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_members INTEGER, -- NULL for unlimited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_plans_organization_id ON membership_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_is_active ON membership_plans(is_active);

-- Enable RLS
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their organization's membership plans" ON membership_plans;
CREATE POLICY "Users can view their organization's membership plans" ON membership_plans
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create membership plans for their organization" ON membership_plans;
CREATE POLICY "Users can create membership plans for their organization" ON membership_plans
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their organization's membership plans" ON membership_plans;
CREATE POLICY "Users can update their organization's membership plans" ON membership_plans
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Create memberships table (for actual member subscriptions)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  membership_plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for memberships
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- Enable RLS for memberships
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memberships
DROP POLICY IF EXISTS "Users can view their organization's memberships" ON memberships;
CREATE POLICY "Users can view their organization's memberships" ON memberships
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`

      // Try to execute via SQL Editor simulation
      let error: any
      try {
        const result = await supabase.rpc('exec_sql', { sql: migrationSQL })
        error = result.error
      } catch (e) {
        error = 'exec_sql not available'
      }
      
      if (error) {
        // Provide manual instructions
        setMessage('Unable to create tables automatically. Please run the migration manually.')
        setStatus('error')
        setDetails({
          error: 'Manual migration required',
          sql: migrationSQL,
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the SQL from the details below',
            '4. Run the migration',
            '5. Refresh this page'
          ]
        })
        return
      }
      
      // Check if migration was successful
      await checkMembershipsSetup()
      
    } catch (error) {
      setMessage('Migration failed')
      setStatus('error')
      setDetails({ error: error instanceof Error ? error.message : 'Unknown error' })
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Fix Memberships System</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Status</h2>
            <div className={`px-3 py-1 rounded text-sm ${
              status === 'success' ? 'bg-green-600' :
              status === 'error' ? 'bg-red-600' :
              status === 'checking' || status === 'migrating' ? 'bg-yellow-600' :
              'bg-gray-600'
            }`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
          
          <p className="text-gray-300 mb-4">{message}</p>
          
          {userInfo && (
            <div className="mb-4 p-4 bg-gray-700 rounded">
              <p className="text-sm">
                <strong>User:</strong> {userInfo.email}<br />
                <strong>Organization ID:</strong> {userInfo.organization_id || 'None'}<br />
                <strong>Organization Name:</strong> {userInfo.organizations?.name || 'Not assigned'}
              </p>
            </div>
          )}
          
          {status === 'error' && details?.issue === 'missing_organization' && (
            <button
              onClick={fixUserOrganization}
              className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded font-medium transition-colors"
            >
              Fix User Organization
            </button>
          )}
          
          {status === 'idle' && details?.tableExists === false && (
            <button
              onClick={runMigration}
              className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded font-medium transition-colors"
            >
              Create Membership Tables
            </button>
          )}
          
          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-900/50 rounded">
              <p className="text-green-300">✅ Memberships system is ready!</p>
              <p className="text-sm text-gray-400 mt-2">
                You can now create membership plans and manage subscriptions.
              </p>
              <button
                onClick={() => window.location.href = '/memberships'}
                className="mt-4 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm transition-colors"
              >
                Go to Memberships
              </button>
            </div>
          )}
        </div>
        
        {details && status === 'error' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Error Details</h3>
            {details.sql ? (
              <div>
                <p className="text-sm text-gray-400 mb-4">
                  Copy this SQL and run it in your Supabase SQL Editor:
                </p>
                <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-xs">
                  {details.sql}
                </pre>
              </div>
            ) : (
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
          </div>
        )}
        
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}