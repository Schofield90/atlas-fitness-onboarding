#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase project details
const PROJECT_REF = 'lzlrojoaxrqvmhempnkn';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase/migrations/20250110_nutrition_system_final.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Use the Supabase REST API to execute raw SQL
async function executeSQLViaREST() {
  console.log('🚀 Executing nutrition system migration via Supabase REST API...\n');

  // Split the migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Since we can't directly execute SQL via the REST API,
  // let's create a simple web interface to execute the migration
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Nutrition System Migration</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #1a1a1a;
            color: #e0e0e0;
        }
        h1 { color: #f97316; }
        .info {
            background: #374151;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .sql-box {
            background: #111;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        button {
            background: #f97316;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin: 20px 0;
        }
        button:hover { background: #ea580c; }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
        }
        .success { background: #065f46; }
        .error { background: #7f1d1d; }
    </style>
</head>
<body>
    <h1>🥗 Atlas Fitness Nutrition System Migration</h1>
    
    <div class="info">
        <h2>Migration Details</h2>
        <p><strong>Project:</strong> ${PROJECT_REF}</p>
        <p><strong>Database:</strong> lzlrojoaxrqvmhempnkn.supabase.co</p>
        <p><strong>Tables to create:</strong> 9 nutrition-related tables</p>
    </div>

    <h3>Migration SQL:</h3>
    <div class="sql-box">${migrationSQL}</div>

    <button onclick="executeMigration()">Execute Migration</button>

    <div id="result"></div>

    <script>
        async function executeMigration() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="info">Executing migration...</div>';
            
            try {
                // Copy the SQL to clipboard
                navigator.clipboard.writeText(\`${migrationSQL.replace(/`/g, '\\`')}\`);
                
                resultDiv.innerHTML = \`
                    <div class="success result">
                        <h3>✅ SQL Copied to Clipboard!</h3>
                        <p>The migration SQL has been copied to your clipboard.</p>
                        <h4>Next steps:</h4>
                        <ol>
                            <li>Go to <a href="https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new" target="_blank" style="color: #f97316;">Supabase SQL Editor</a></li>
                            <li>Paste the SQL (Cmd+V or Ctrl+V)</li>
                            <li>Click "Run" to execute the migration</li>
                        </ol>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="error result">
                        <h3>❌ Error</h3>
                        <p>Could not copy to clipboard. Please manually copy the SQL above.</p>
                    </div>
                \`;
            }
        }
    </script>
</body>
</html>
  `;

  // Save the HTML file
  const htmlPath = path.join(__dirname, 'nutrition-migration.html');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log('✅ Migration helper created!\n');
  console.log('📋 To apply the migration:\n');
  console.log(`1. Open: ${htmlPath}`);
  console.log('2. Click "Execute Migration" to copy the SQL');
  console.log('3. Paste in Supabase SQL Editor and run\n');
  console.log('Or directly go to:');
  console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log('And paste the SQL from:');
  console.log(migrationPath);
}

executeSQLViaREST();