'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FixAllFeaturesPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle')
  const [currentTask, setCurrentTask] = useState('')
  const [issues, setIssues] = useState<{
    messages: boolean
    memberships: boolean
    forms: boolean
    staff: boolean
    discounts: boolean
  }>({
    messages: false,
    memberships: false,
    forms: false,
    staff: false,
    discounts: false
  })
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    checkAllSystems()
  }, [])

  const checkAllSystems = async () => {
    setStatus('checking')
    setCurrentTask('Checking all systems...')
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setCurrentTask('No user logged in. Please log in first.')
        setStatus('error')
        return
      }

      // Check each system
      const systemChecks = {
        messages: await checkTable(supabase, 'messages'),
        memberships: await checkTable(supabase, 'membership_plans'),
        forms: await checkTable(supabase, 'forms'),
        staff: await checkTable(supabase, 'staff_members'),
        discounts: await checkTable(supabase, 'discount_codes')
      }

      setIssues(systemChecks)
      
      const hasIssues = Object.values(systemChecks).some(issue => issue)
      
      if (hasIssues) {
        setCurrentTask('Some systems need to be set up. Click "Fix All Issues" to resolve.')
        setStatus('idle')
      } else {
        setCurrentTask('All systems are working correctly!')
        setStatus('success')
      }
      
    } catch (error) {
      setCurrentTask('Failed to check systems')
      setStatus('error')
      console.error(error)
    }
  }

  const checkTable = async (supabase: any, tableName: string) => {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(1)
      return error && error.message.includes('relation') && error.message.includes('does not exist')
    } catch {
      return true
    }
  }

  const fixAllIssues = async () => {
    setStatus('fixing')
    const supabase = createClient()
    
    try {
      // Fix organization issue first
      setCurrentTask('Checking user organization...')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No user logged in')
      }
      
      // Check user organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()
        
      if (!userData?.organization_id) {
        setCurrentTask('Creating organization...')
        
        // Get or create Atlas Fitness organization
        let { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', 'Atlas Fitness')
          .single()
          
        if (!org) {
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({ name: 'Atlas Fitness' })
            .select()
            .single()
            
          if (createError) throw createError
          org = newOrg
        }
        
        // Update user with organization
        const { error: updateError } = await supabase
          .from('users')
          .update({ organization_id: org.id })
          .eq('id', user.id)
          
        if (updateError) throw updateError
      }

      // Now create all missing tables
      const migrations = []

      if (issues.messages) {
        setCurrentTask('Creating messages table...')
        migrations.push(`
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'email', 'call')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  subject TEXT,
  body TEXT NOT NULL,
  from_number TEXT,
  to_number TEXT,
  from_email TEXT,
  to_email TEXT,
  twilio_sid TEXT,
  resend_id TEXT,
  error_message TEXT,
  error_code TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's messages" ON messages;
CREATE POLICY "Users can view their organization's messages" ON messages
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create messages for their organization" ON messages;
CREATE POLICY "Users can create messages for their organization" ON messages
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their organization's messages" ON messages;
CREATE POLICY "Users can update their organization's messages" ON messages
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`)
      }

      if (issues.memberships) {
        setCurrentTask('Creating membership tables...')
        migrations.push(`
-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'one-time')),
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_members INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_organization_id ON membership_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_is_active ON membership_plans(is_active);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's membership plans" ON membership_plans;
CREATE POLICY "Users can view their organization's membership plans" ON membership_plans
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create membership plans for their organization" ON membership_plans;
CREATE POLICY "Users can create membership plans for their organization" ON membership_plans
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their organization's membership plans" ON membership_plans;
CREATE POLICY "Users can update their organization's membership plans" ON membership_plans
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Create memberships table
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

CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's memberships" ON memberships;
CREATE POLICY "Users can view their organization's memberships" ON memberships
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`)
      }

      if (issues.forms) {
        setCurrentTask('Creating forms table...')
        migrations.push(`
-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('waiver', 'health', 'contract', 'assessment', 'other')),
  fields JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  require_signature BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forms_organization_id ON forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_type ON forms(type);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's forms" ON forms;
CREATE POLICY "Users can view their organization's forms" ON forms
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create forms for their organization" ON forms;
CREATE POLICY "Users can create forms for their organization" ON forms
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their organization's forms" ON forms;
CREATE POLICY "Users can update their organization's forms" ON forms
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`)
      }

      if (issues.staff) {
        setCurrentTask('Creating staff tables...')
        migrations.push(`
-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  hourly_rate INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_members_organization_id ON staff_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_is_active ON staff_members(is_active);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's staff" ON staff_members;
CREATE POLICY "Users can view their organization's staff" ON staff_members
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create staff for their organization" ON staff_members;
CREATE POLICY "Users can create staff for their organization" ON staff_members
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their organization's staff" ON staff_members;
CREATE POLICY "Users can update their organization's staff" ON staff_members
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`)
      }

      if (issues.discounts) {
        setCurrentTask('Creating discount codes table...')
        migrations.push(`
-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  applies_to TEXT[] DEFAULT '{}',
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_organization_id ON discount_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_is_active ON discount_codes(is_active);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's discount codes" ON discount_codes;
CREATE POLICY "Users can view their organization's discount codes" ON discount_codes
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create discount codes for their organization" ON discount_codes;
CREATE POLICY "Users can create discount codes for their organization" ON discount_codes
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their organization's discount codes" ON discount_codes;
CREATE POLICY "Users can update their organization's discount codes" ON discount_codes
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`)
      }

      // Add update trigger function if not exists
      if (migrations.length > 0) {
        migrations.unshift(`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';`)

        // Add triggers for each table
        if (issues.messages) {
          migrations.push(`
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
        }
        if (issues.memberships) {
          migrations.push(`
DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON membership_plans;
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
        }
        if (issues.forms) {
          migrations.push(`
DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
        }
        if (issues.staff) {
          migrations.push(`
DROP TRIGGER IF EXISTS update_staff_members_updated_at ON staff_members;
CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
        }
        if (issues.discounts) {
          migrations.push(`
DROP TRIGGER IF EXISTS update_discount_codes_updated_at ON discount_codes;
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`)
        }
      }

      if (migrations.length > 0) {
        const fullMigration = migrations.join('\n\n')
        
        setDetails({
          error: 'Manual migration required',
          sql: fullMigration,
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the SQL from below',
            '4. Run the migration',
            '5. Refresh this page'
          ]
        })
        
        setCurrentTask('Migration SQL generated. Please run it in Supabase SQL Editor.')
        setStatus('error')
      } else {
        setCurrentTask('All systems are working correctly!')
        setStatus('success')
      }
      
    } catch (error) {
      setCurrentTask('Failed to fix issues')
      setStatus('error')
      setDetails({ error: error instanceof Error ? error.message : 'Unknown error' })
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">System Setup & Fixes</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">System Status</h2>
            <div className={`px-3 py-1 rounded text-sm ${
              status === 'success' ? 'bg-green-600' :
              status === 'error' ? 'bg-red-600' :
              status === 'checking' || status === 'fixing' ? 'bg-yellow-600' :
              'bg-gray-600'
            }`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
          
          <p className="text-gray-300 mb-6">{currentTask}</p>
          
          {/* System Check Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${issues.messages ? 'bg-red-900/50 border border-red-600' : 'bg-green-900/50 border border-green-600'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Messaging System</span>
                <span className={`text-2xl ${issues.messages ? 'text-red-500' : 'text-green-500'}`}>
                  {issues.messages ? '✗' : '✓'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Email, SMS, WhatsApp, Calls</p>
            </div>
            
            <div className={`p-4 rounded-lg ${issues.memberships ? 'bg-red-900/50 border border-red-600' : 'bg-green-900/50 border border-green-600'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Memberships</span>
                <span className={`text-2xl ${issues.memberships ? 'text-red-500' : 'text-green-500'}`}>
                  {issues.memberships ? '✗' : '✓'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Plans & Subscriptions</p>
            </div>
            
            <div className={`p-4 rounded-lg ${issues.forms ? 'bg-red-900/50 border border-red-600' : 'bg-green-900/50 border border-green-600'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Forms & Documents</span>
                <span className={`text-2xl ${issues.forms ? 'text-red-500' : 'text-green-500'}`}>
                  {issues.forms ? '✗' : '✓'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Waivers & Questionnaires</p>
            </div>
            
            <div className={`p-4 rounded-lg ${issues.staff ? 'bg-red-900/50 border border-red-600' : 'bg-green-900/50 border border-green-600'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Staff Management</span>
                <span className={`text-2xl ${issues.staff ? 'text-red-500' : 'text-green-500'}`}>
                  {issues.staff ? '✗' : '✓'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Team & Permissions</p>
            </div>
            
            <div className={`p-4 rounded-lg ${issues.discounts ? 'bg-red-900/50 border border-red-600' : 'bg-green-900/50 border border-green-600'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Discount Codes</span>
                <span className={`text-2xl ${issues.discounts ? 'text-red-500' : 'text-green-500'}`}>
                  {issues.discounts ? '✗' : '✓'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Promotions & Offers</p>
            </div>
          </div>
          
          {status === 'idle' && Object.values(issues).some(issue => issue) && (
            <button
              onClick={fixAllIssues}
              className="w-full bg-orange-600 hover:bg-orange-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Fix All Issues
            </button>
          )}
          
          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-900/50 rounded">
              <p className="text-green-300">✅ All systems are operational!</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.location.href = '/memberships'}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm transition-colors"
                >
                  Go to Memberships
                </button>
                <button
                  onClick={() => window.location.href = '/forms'}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm transition-colors"
                >
                  Go to Forms
                </button>
              </div>
            </div>
          )}
        </div>
        
        {details && status === 'error' && details.sql && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Manual Migration Required</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Follow these steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                {details.instructions.map((instruction: string, index: number) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
            <div className="bg-gray-900 rounded p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 whitespace-pre">{details.sql}</pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(details.sql)
                alert('SQL copied to clipboard!')
              }}
              className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm transition-colors"
            >
              Copy SQL to Clipboard
            </button>
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