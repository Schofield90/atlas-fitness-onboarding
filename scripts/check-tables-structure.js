#!/usr/bin/env node

const { Client } = require('pg');

// Database connection string
const databaseUrl = 'postgresql://postgres:${DB_PASSWORD}@db.lzlrojoaxrqvmhempnkn.supabase.co:5432/postgres';

async function checkTables() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check if class_credits table exists
    console.log('📝 Checking class_credits table...');
    const classCreditResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_credits'
      );
    `);
    
    if (classCreditResult.rows[0].exists) {
      console.log('✅ class_credits table exists');
      
      // Get columns
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'class_credits'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nColumns in class_credits:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('❌ class_credits table does not exist');
      
      // Create the table
      console.log('\n📝 Creating class_credits table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.class_credits (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          organization_id UUID NOT NULL,
          client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
          customer_id UUID,
          credits INTEGER DEFAULT 0,
          credits_used INTEGER DEFAULT 0,
          expiry_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_class_credits_client ON public.class_credits(client_id);
        CREATE INDEX IF NOT EXISTS idx_class_credits_customer ON public.class_credits(customer_id);
        CREATE INDEX IF NOT EXISTS idx_class_credits_org ON public.class_credits(organization_id);
      `);
      
      // Grant permissions
      await client.query(`
        GRANT ALL ON public.class_credits TO authenticated;
        GRANT ALL ON public.class_credits TO service_role;
      `);
      
      // Enable RLS
      await client.query(`
        ALTER TABLE public.class_credits ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.class_credits;
        CREATE POLICY "Enable read for authenticated users" ON public.class_credits
          FOR SELECT USING (true);
      `);
      
      console.log('✅ class_credits table created');
    }

    // Check bookings table structure
    console.log('\n📝 Checking bookings table...');
    const bookingsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'bookings'
      AND column_name IN ('client_id', 'customer_id', 'class_sessions', 'status')
      ORDER BY column_name;
    `);
    
    console.log('\nRelevant columns in bookings:');
    bookingsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if class_sessions is a column or a separate table
    const classSessionsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_sessions'
      );
    `);
    
    if (classSessionsResult.rows[0].exists) {
      console.log('\n✅ class_sessions is a separate table (correct)');
      
      // Check relationship
      const fkResult = await client.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'bookings'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name LIKE '%session%';
      `);
      
      if (fkResult.rows.length > 0) {
        console.log('Foreign keys linking to sessions:');
        fkResult.rows.forEach(fk => {
          console.log(`  - ${fk.column_name} (${fk.constraint_name})`);
        });
      } else {
        console.log('⚠️  No foreign key to class_sessions found in bookings');
      }
    }

    // Check programs table
    const programsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'programs'
      );
    `);
    
    console.log(`\n${programsResult.rows[0].exists ? '✅' : '❌'} programs table exists`);

    // Check organization_locations table
    const locationsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_locations'
      );
    `);
    
    console.log(`${locationsResult.rows[0].exists ? '✅' : '❌'} organization_locations table exists`);

    // Check organization_staff table
    const staffResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_staff'
      );
    `);
    
    console.log(`${staffResult.rows[0].exists ? '✅' : '❌'} organization_staff table exists`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database check completed!');
  }
}

checkTables();