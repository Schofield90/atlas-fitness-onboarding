'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FixMessagesPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    checkMessagesTable()
  }, [])

  const checkMessagesTable = async () => {
    setStatus('checking')
    setMessage('Checking messages table status...')
    
    try {
      const response = await fetch('/api/debug/check-messages-table')
      const data = await response.json()
      
      setDetails(data)
      
      if (data.tableExists === false) {
        setMessage('Messages table does not exist. Click the button below to create it.')
        setStatus('idle')
      } else if (data.tableExists === true) {
        setMessage('Messages table exists and is working correctly!')
        setStatus('success')
      } else {
        setMessage('Unable to determine table status')
        setStatus('error')
      }
    } catch (error) {
      setMessage('Failed to check table status')
      setStatus('error')
      console.error(error)
    }
  }

  const runMigration = async () => {
    setStatus('migrating')
    setMessage('Running migration...')
    
    try {
      const supabase = createClient()
      
      // Run the migration SQL
      const migrationSQL = `
-- Create messages table for storing all communication history
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Message details
  type TEXT NOT NULL CHECK (type IN ('sms', 'whatsapp', 'email', 'call')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  
  -- Content
  subject TEXT, -- For emails
  body TEXT NOT NULL,
  
  -- Metadata
  from_number TEXT, -- For SMS/WhatsApp/Calls
  to_number TEXT, -- For SMS/WhatsApp/Calls
  from_email TEXT, -- For email
  to_email TEXT, -- For email
  
  -- External IDs
  twilio_sid TEXT, -- Twilio message/call ID
  resend_id TEXT, -- Resend email ID
  
  -- Error tracking
  error_message TEXT,
  error_code TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization's messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages for their organization" ON messages;
DROP POLICY IF EXISTS "Users can update their organization's messages" ON messages;

-- RLS Policy: Users can see messages from their organization
CREATE POLICY "Users can view their organization's messages" ON messages
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create messages for their organization
CREATE POLICY "Users can create messages for their organization" ON messages
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can update their organization's messages
CREATE POLICY "Users can update their organization's messages" ON messages
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`

      const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
      
      if (error) {
        // Try direct execution as fallback
        const { error: directError } = await supabase.from('messages').select('count').single()
        
        if (directError && directError.message.includes('does not exist')) {
          setMessage('Unable to create table automatically. Please run the migration manually in Supabase SQL Editor.')
          setStatus('error')
          setDetails({
            error: 'Manual migration required',
            instructions: [
              '1. Go to your Supabase dashboard',
              '2. Navigate to SQL Editor',
              '3. Copy the migration from /supabase/messages-table.sql',
              '4. Run the migration',
              '5. Refresh this page'
            ]
          })
          return
        }
      }
      
      // Check if migration was successful
      await checkMessagesTable()
      
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
        <h1 className="text-3xl font-bold mb-8">Fix Messages Table</h1>
        
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
          
          {status === 'idle' && details?.tableExists === false && (
            <button
              onClick={runMigration}
              className="bg-orange-600 hover:bg-orange-700 px-6 py-2 rounded font-medium transition-colors"
            >
              Create Messages Table
            </button>
          )}
          
          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-900/50 rounded">
              <p className="text-green-300">✅ Messages table is ready!</p>
              <p className="text-sm text-gray-400 mt-2">
                You can now send emails, SMS, WhatsApp messages, and make calls.
              </p>
            </div>
          )}
        </div>
        
        {details && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Manual Migration Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Go to your <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Supabase Dashboard</a></li>
            <li>Select your project</li>
            <li>Navigate to the SQL Editor</li>
            <li>Open the file <code className="bg-gray-900 px-2 py-1 rounded text-sm">/supabase/messages-table.sql</code></li>
            <li>Copy and paste the SQL content</li>
            <li>Click "Run" to execute the migration</li>
            <li>Return here and refresh the page</li>
          </ol>
        </div>
        
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