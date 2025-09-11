import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you might want to make this more secure
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    
    // First, check if the channel column exists
    const { data: tableInfo, error: tableError } = await admin
      .from('messages')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('Error checking table:', tableError);
    }

    // Try to run the migration SQL directly
    const migrationSQL = `
      -- Add channel column if it doesn't exist
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

      -- Add other missing columns
      DO $$
      BEGIN
        -- conversation_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
        ) THEN
          ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
        END IF;

        -- sender_type
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
        ) THEN
          ALTER TABLE public.messages ADD COLUMN sender_type VARCHAR(10) CHECK (sender_type IN ('coach','client'));
        END IF;

        -- message_type
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type'
        ) THEN
          ALTER TABLE public.messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','file','system'));
        END IF;
      END $$;

      -- Update constraint for channel
      ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_check;
      ALTER TABLE public.messages ADD CONSTRAINT messages_channel_check
        CHECK (channel IN ('sms','whatsapp','email','in_app'));
    `;

    // Execute via raw SQL if possible
    // Note: Supabase admin client doesn't directly support raw SQL execution
    // We'll need to use the REST API directly
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (!response.ok) {
      // If exec_sql doesn't exist, try alternative approach
      console.log('exec_sql not available, trying alternative...');
      
      // Create conversations table first
      const { error: convError } = await admin
        .from('conversations')
        .select('*')
        .limit(0);
        
      if (convError && convError.message.includes('does not exist')) {
        console.log('Conversations table does not exist');
      }
      
      // Test if we can insert with the channel field
      const testMessage = {
        organization_id: '00000000-0000-0000-0000-000000000000',
        client_id: '00000000-0000-0000-0000-000000000000', 
        content: 'Schema test - can be deleted',
        channel: 'in_app',
        sender_type: 'client',
        message_type: 'text',
        status: 'sent'
      };
      
      const { error: insertError } = await admin
        .from('messages')
        .insert(testMessage);
        
      if (insertError) {
        return NextResponse.json({ 
          error: 'Schema update needed',
          details: insertError.message,
          suggestion: 'Please run the migration SQL directly in Supabase dashboard SQL editor'
        }, { status: 500 });
      }
      
      // Clean up test message
      await admin
        .from('messages')
        .delete()
        .eq('content', 'Schema test - can be deleted');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Schema fix attempted. Please verify in Supabase dashboard.'
    });

  } catch (error: any) {
    console.error('Error fixing schema:', error);
    return NextResponse.json({ 
      error: 'Failed to fix schema',
      details: error.message 
    }, { status: 500 });
  }
}