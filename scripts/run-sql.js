#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTUzNTExMSwiZXhwIjoyMDQxMTExMTExfQ.q-jiLIvgrEtoefosR88sSCiPf6VKDeRXyfKUwpHS_5E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runSQL() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('Usage: node run-sql.js <sql-file>');
    process.exit(1);
  }

  const sqlPath = path.resolve(sqlFile);
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements or comments
    if (!statement || statement.startsWith('--')) continue;
    
    try {
      // For SELECT statements, use .rpc() or direct query
      if (statement.toUpperCase().startsWith('SELECT')) {
        console.log(`\nStatement ${i + 1}: ${statement.substring(0, 50)}...`);
        
        // Extract table name from SELECT statement
        const tableMatch = statement.match(/FROM\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          
          // Simple SELECT * query
          if (statement.includes('*')) {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(10);
            
            if (error) {
              console.error(`Error: ${error.message}`);
            } else {
              console.log(`Results:`, data);
            }
          } else {
            console.log('Complex SELECT - showing first part only');
          }
        }
      } else if (statement.toUpperCase().startsWith('INSERT')) {
        console.log(`\nStatement ${i + 1}: INSERT statement`);
        // For INSERT/UPDATE/DELETE, we need to use RPC or raw SQL
        console.log('INSERT operation - would need direct database connection');
      } else if (statement.toUpperCase().startsWith('UPDATE')) {
        console.log(`\nStatement ${i + 1}: UPDATE statement`);
        console.log('UPDATE operation - would need direct database connection');
      }
    } catch (error) {
      console.error(`Error in statement ${i + 1}:`, error.message);
    }
  }
  
  console.log('\n✅ SQL execution completed');
}

runSQL().catch(console.error);