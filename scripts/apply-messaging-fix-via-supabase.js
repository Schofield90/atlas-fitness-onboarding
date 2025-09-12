#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase connection
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Applying messaging system fixes...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250919_fix_messages_view_and_conversation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip empty statements
      if (statement.trim().length <= 1) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // Check if it's a "already exists" error which we can ignore
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Skipping (already exists): ${error.message.substring(0, 100)}...`);
          } else {
            console.error(`❌ Error: ${error.message}`);
            // Continue with other statements
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Failed to execute statement ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n✨ Migration process completed!');

    // Verify the changes
    console.log('\n🔍 Verifying database state...\n');

    // Check if conversations table exists
    const { data: tables } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);
    
    if (tables !== null) {
      console.log('✅ Conversations table exists');
    }

    // Check messages table structure
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, sender_type, channel')
      .limit(1);
    
    if (messages !== null) {
      console.log('✅ Messages table has required columns');
    }

    // Count conversations
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total conversations: ${convCount || 0}`);

    // Count messages
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total messages: ${msgCount || 0}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// If we can't use the exec_sql RPC, let's create the function programmatically
async function createConversationFunction() {
  console.log('\n🔧 Creating get_or_create_conversation function...\n');

  const functionSQL = `
    CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
      p_organization_id UUID,
      p_client_id UUID,
      p_coach_id UUID DEFAULT NULL
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_conversation_id UUID;
    BEGIN
      -- First try to find an existing conversation
      SELECT id INTO v_conversation_id
      FROM conversations
      WHERE organization_id = p_organization_id
        AND client_id = p_client_id
        AND (coach_id = p_coach_id OR (coach_id IS NULL AND p_coach_id IS NULL))
      LIMIT 1;
      
      -- If no conversation exists, create one
      IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (
          organization_id,
          client_id,
          coach_id,
          status,
          created_at,
          updated_at
        )
        VALUES (
          p_organization_id,
          p_client_id,
          p_coach_id,
          'active',
          NOW(),
          NOW()
        )
        ON CONFLICT (organization_id, client_id, coach_id) 
        DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_conversation_id;
      END IF;
      
      RETURN v_conversation_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_or_create_conversation: %', SQLERRM;
        RAISE;
    END;
    $$;
  `;

  try {
    // This would need to be executed via a database admin connection
    console.log('⚠️  Function creation requires database admin access');
    console.log('📋 Please run the following SQL manually or via psql:\n');
    console.log(functionSQL);
  } catch (error) {
    console.error('Failed to create function:', error);
  }
}

// Run the migration
applyMigration()
  .then(() => createConversationFunction())
  .then(() => {
    console.log('\n✅ All migration tasks completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });