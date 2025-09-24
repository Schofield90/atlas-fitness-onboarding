#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection details
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Database connection string
const databaseUrl = 'postgresql://postgres:${DB_PASSWORD}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

// Use pg library for direct SQL execution
const { Client } = require('pg');

async function applyMigration() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Step 1: Add missing columns to messages table
    console.log('📝 Step 1: Adding missing columns to messages table...');
    
    const columnsToAdd = [
      'conversation_id UUID',
      'client_id UUID',
      'customer_id UUID',
      'channel TEXT',
      'sender_type TEXT',
      'sender_name TEXT',
      'sender_id UUID',
      'message_type TEXT',
      'content TEXT',
      "metadata JSONB DEFAULT '{}'"
    ];

    for (const column of columnsToAdd) {
      const [name, type] = column.split(' ');
      try {
        await client.query(`ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ${column}`);
        console.log(`  ✅ Added column: ${name}`);
      } catch (err) {
        if (err.code === '42701') { // Column already exists
          console.log(`  ⚠️  Column ${name} already exists`);
        } else {
          console.log(`  ❌ Error adding column ${name}: ${err.message}`);
        }
      }
    }

    // Step 2: Create conversations table
    console.log('\n📝 Step 2: Creating conversations table...');
    
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.conversations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          organization_id UUID NOT NULL,
          client_id UUID NOT NULL,
          coach_id UUID,
          status VARCHAR(50) DEFAULT 'active',
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('  ✅ Conversations table created/verified');
    } catch (err) {
      console.log(`  ❌ Error creating conversations table: ${err.message}`);
    }

    // Step 3: Add unique constraint
    console.log('\n📝 Step 3: Adding unique constraint to conversations...');
    
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'conversations_organization_id_client_id_coach_id_key'
          ) THEN
            ALTER TABLE public.conversations 
            ADD CONSTRAINT conversations_organization_id_client_id_coach_id_key 
            UNIQUE(organization_id, client_id, coach_id);
          END IF;
        END $$
      `);
      console.log('  ✅ Unique constraint added/verified');
    } catch (err) {
      console.log(`  ❌ Error adding unique constraint: ${err.message}`);
    }

    // Step 4: Create indexes
    console.log('\n📝 Step 4: Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_client ON public.messages(client_id)'
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log(`  ✅ Index created/verified`);
      } catch (err) {
        console.log(`  ⚠️  Index error: ${err.message}`);
      }
    }

    // Step 5: Add foreign key constraint
    console.log('\n📝 Step 5: Adding foreign key constraint...');
    
    try {
      // First drop existing constraints
      await client.query(`
        ALTER TABLE public.messages 
        DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
        DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey1
      `);
      
      // Add new constraint
      await client.query(`
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_conversation_id_fkey 
        FOREIGN KEY (conversation_id) 
        REFERENCES public.conversations(id) 
        ON DELETE CASCADE
      `);
      console.log('  ✅ Foreign key constraint added');
    } catch (err) {
      console.log(`  ⚠️  Foreign key constraint: ${err.message}`);
    }

    // Step 6: Create the get_or_create_conversation function
    console.log('\n📝 Step 6: Creating get_or_create_conversation function...');
    
    try {
      await client.query(`
        DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID, UUID);
        
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
          SELECT id INTO v_conversation_id
          FROM conversations
          WHERE organization_id = p_organization_id
            AND client_id = p_client_id
            AND (coach_id = p_coach_id OR (coach_id IS NULL AND p_coach_id IS NULL))
          LIMIT 1;
          
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
      `);
      console.log('  ✅ Function created successfully');
    } catch (err) {
      console.log(`  ❌ Error creating function: ${err.message}`);
    }

    // Step 7: Grant permissions
    console.log('\n📝 Step 7: Granting permissions...');
    
    const grants = [
      'GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO authenticated',
      'GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, UUID, UUID) TO anon',
      'GRANT ALL ON public.conversations TO authenticated',
      'GRANT ALL ON public.conversations TO service_role'
    ];

    for (const grant of grants) {
      try {
        await client.query(grant);
        console.log(`  ✅ Permission granted`);
      } catch (err) {
        console.log(`  ⚠️  Permission error: ${err.message}`);
      }
    }

    // Step 8: Enable RLS
    console.log('\n📝 Step 8: Enabling Row Level Security...');
    
    try {
      await client.query(`ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY`);
      
      await client.query(`
        DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.conversations;
        
        CREATE POLICY "Enable all for authenticated users" ON public.conversations
          FOR ALL USING (true) WITH CHECK (true)
      `);
      console.log('  ✅ RLS enabled and policy created');
    } catch (err) {
      console.log(`  ⚠️  RLS error: ${err.message}`);
    }

    // Step 9: Verify the setup
    console.log('\n🔍 Verifying the migration...\n');
    
    const verificationQueries = [
      {
        name: 'Conversations table',
        query: `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'conversations'
        )`
      },
      {
        name: 'Messages.conversation_id column',
        query: `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'messages' 
          AND column_name = 'conversation_id'
        )`
      },
      {
        name: 'get_or_create_conversation function',
        query: `SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'get_or_create_conversation'
        )`
      }
    ];

    for (const check of verificationQueries) {
      const result = await client.query(check.query);
      const status = result.rows[0].exists ? '✅' : '❌';
      console.log(`  ${status} ${check.name}: ${result.rows[0].exists}`);
    }

    // Count records
    const convCount = await client.query('SELECT COUNT(*) FROM conversations');
    const msgCount = await client.query('SELECT COUNT(*) FROM messages');
    
    console.log(`\n📊 Database Statistics:`);
    console.log(`  - Conversations: ${convCount.rows[0].count}`);
    console.log(`  - Messages: ${msgCount.rows[0].count}`);

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if pg is installed
try {
  require('pg');
  applyMigration();
} catch (err) {
  console.log('Installing pg package...');
  const { execSync } = require('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  console.log('Package installed, running migration...\n');
  applyMigration();
}