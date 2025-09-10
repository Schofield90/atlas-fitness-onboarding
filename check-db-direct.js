#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use the connection details from .env.local
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: 6543, // Supabase pooler port
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkNutritionSchema() {
  console.log('🔍 Checking nutrition_profiles table schema directly...\n');
  
  const client = await pool.connect();
  
  try {
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nutrition_profiles'
      );
    `;
    
    const existsResult = await client.query(tableExistsQuery);
    console.log('Table exists:', existsResult.rows[0].exists);
    
    if (!existsResult.rows[0].exists) {
      console.log('❌ nutrition_profiles table does not exist!');
      return;
    }
    
    // Get column information
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'nutrition_profiles'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnQuery);
    console.log('📊 Table structure:');
    console.table(columnsResult.rows);
    
    // Check constraints
    const constraintsQuery = `
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        cc.check_clause
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.check_constraints AS cc
        ON cc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'nutrition_profiles';
    `;
    
    const constraintsResult = await client.query(constraintsQuery);
    console.log('\n🔗 Constraints:');
    console.table(constraintsResult.rows);
    
    // Check indexes
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'nutrition_profiles';
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log('\n📇 Indexes:');
    console.table(indexResult.rows);
    
    // Try sample queries to test what works
    console.log('\n🧪 Testing column references...');
    
    // Test client_id
    try {
      await client.query('SELECT client_id FROM nutrition_profiles LIMIT 0');
      console.log('✅ client_id column exists and is accessible');
    } catch (error) {
      console.log('❌ client_id error:', error.message);
    }
    
    // Test lead_id
    try {
      await client.query('SELECT lead_id FROM nutrition_profiles LIMIT 0');
      console.log('✅ lead_id column exists and is accessible');
    } catch (error) {
      console.log('❌ lead_id error:', error.message);
    }
    
    // Test user_id
    try {
      await client.query('SELECT user_id FROM nutrition_profiles LIMIT 0');
      console.log('✅ user_id column exists and is accessible');
    } catch (error) {
      console.log('❌ user_id error:', error.message);
    }
    
    // Check if there are any existing rows
    const countResult = await client.query('SELECT COUNT(*) FROM nutrition_profiles');
    console.log(`\n📈 Total rows in nutrition_profiles: ${countResult.rows[0].count}`);
    
    if (parseInt(countResult.rows[0].count) > 0) {
      // Get a sample row
      const sampleResult = await client.query('SELECT * FROM nutrition_profiles LIMIT 1');
      console.log('\n🔍 Sample row structure:');
      console.log('Columns:', Object.keys(sampleResult.rows[0]));
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
  }
}

async function checkRelatedTables() {
  console.log('\n🔍 Checking related tables...\n');
  
  const client = await pool.connect();
  
  try {
    // Check clients table
    const clientsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'clients'
      ORDER BY ordinal_position;
    `;
    
    const clientsResult = await client.query(clientsQuery);
    console.log('📊 Clients table structure:');
    console.table(clientsResult.rows);
    
    // Check if leads table exists
    const leadsExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leads'
      );
    `;
    
    const leadsExistsResult = await client.query(leadsExistsQuery);
    console.log('\nLeads table exists:', leadsExistsResult.rows[0].exists);
    
    if (leadsExistsResult.rows[0].exists) {
      const leadsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads'
        ORDER BY ordinal_position;
      `;
      
      const leadsResult = await client.query(leadsQuery);
      console.log('📊 Leads table structure:');
      console.table(leadsResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error checking related tables:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkNutritionSchema();
    await checkRelatedTables();
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\n🔧 Trying with provided password...');
    
    // Try with the password provided in the task
    const altPool = new Pool({
      host: 'db.lzlrojoaxrqvmhempnkn.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '@Aa80236661',
      ssl: { rejectUnauthorized: false }
    });
    
    const altClient = await altPool.connect();
    
    try {
      const result = await altClient.query('SELECT version()');
      console.log('✅ Connected with provided password');
      
      // Check nutrition_profiles table
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'nutrition_profiles'
        );
      `;
      
      const existsResult = await altClient.query(tableExistsQuery);
      console.log('Table exists:', existsResult.rows[0].exists);
      
    } catch (altError) {
      console.error('❌ Alternative connection also failed:', altError.message);
    } finally {
      altClient.release();
      await altPool.end();
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);