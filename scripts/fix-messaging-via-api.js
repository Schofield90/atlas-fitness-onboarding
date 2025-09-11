const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMessagingSchema() {
  try {
    console.log('Checking messages table structure...');
    
    // First check what columns exist
    const { data: columns, error: columnsError } = await supabase
      .from('messages')
      .select('*')
      .limit(0);
    
    if (columnsError) {
      console.log('Error checking messages table:', columnsError);
    }
    
    // Try to add the channel column using raw SQL via RPC
    console.log('Adding channel column if missing...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'channel'
          ) THEN
            ALTER TABLE public.messages 
            ADD COLUMN channel TEXT NOT NULL DEFAULT 'in_app';
          END IF;
        END $$;
      `
    });
    
    if (alterError) {
      console.log('Note: Could not execute via RPC (may not exist), trying alternative...');
      
      // Alternative: Insert a test message with the channel field to force schema update
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          organization_id: '00000000-0000-0000-0000-000000000000',
          client_id: '00000000-0000-0000-0000-000000000000',
          content: 'Schema test',
          channel: 'in_app',
          status: 'test'
        });
      
      if (insertError) {
        console.log('Insert test failed:', insertError.message);
      }
    }
    
    console.log('Schema fix attempted. The column may need to be added manually via Supabase dashboard.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixMessagingSchema();