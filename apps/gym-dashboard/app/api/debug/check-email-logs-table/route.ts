import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Simple check - does the table exist and can we query it?
    const { data, error, count } = await adminSupabase
      .from('email_logs')
      .select('id, to_email, subject, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      // Table might not exist - provide migration instructions
      if (error.code === '42P01') {
        return NextResponse.json({
          tableExists: false,
          error: 'Table email_logs does not exist',
          solution: 'Run this SQL in Supabase SQL Editor:',
          migrationSQL: `
-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Enable RLS but with permissive policies for now
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can read email logs" ON email_logs
  FOR SELECT USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access" ON email_logs
  FOR ALL USING (true);
          `.trim()
        })
      }
      
      return NextResponse.json({
        tableExists: true,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }
    
    // Table exists and we can query it
    return NextResponse.json({
      tableExists: true,
      recordCount: count || 0,
      recentLogs: data || [],
      status: count === 0 ? 'Table exists but is empty' : 'Table exists with data',
      
      // If empty, provide test instructions
      testInstructions: count === 0 ? {
        message: 'Table is empty. Send a test email to create records.',
        steps: [
          '1. Go to a lead detail page',
          '2. Click the email button',
          '3. Send a test email',
          '4. Check this endpoint again'
        ]
      } : null
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Check failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}