const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('Applying session_tokens migration...');
  
  try {
    // Create session_tokens table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS session_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        redirect_url TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        used_at TIMESTAMPTZ
      );
    `;
    
    // Since we can't execute raw SQL directly, we'll need to use Supabase's admin API
    // For now, let's at least verify the table doesn't exist and provide instructions
    
    console.log('Checking if session_tokens table exists...');
    const { data, error } = await supabase
      .from('session_tokens')
      .select('*')
      .limit(1);
    
    if (error?.code === '42P01') {
      console.log('Table does not exist. Please create it using the Supabase Dashboard SQL Editor:');
      console.log('\nSQL to execute:\n');
      console.log(`-- Create session_tokens table for custom authentication flow
-- This replaces Supabase magic links to avoid domain redirect issues

CREATE TABLE IF NOT EXISTS session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  redirect_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_session_tokens_token ON session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires ON session_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_org ON session_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_email ON session_tokens(email);

-- Enable RLS
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access session tokens
CREATE POLICY "Service role only" ON session_tokens
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Automatic cleanup of expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_session_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM session_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
      
      console.log('\nPlease go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
      console.log('And execute the above SQL to create the session_tokens table.');
      
      return false;
    } else if (!error) {
      console.log('✅ session_tokens table already exists!');
      return true;
    } else {
      console.error('Unexpected error:', error);
      return false;
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
    return false;
  }
}

applyMigration().then(success => {
  if (success) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log('\n⚠️ Manual action required - please execute the SQL in Supabase Dashboard');
  }
  process.exit(success ? 0 : 1);
});