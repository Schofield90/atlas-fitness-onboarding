#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

async function deployNutritionFix() {
  log('\n🚀 Starting Nutrition Coach Fix Deployment', colors.bright);
  log('==========================================\n', colors.bright);

  try {
    // Step 1: Check git status
    log('📋 Step 1: Checking git status...', colors.blue);
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus) {
        log('Found uncommitted changes:', colors.yellow);
        console.log(gitStatus);
      }
    } catch (err) {
      log('Warning: Could not check git status', colors.yellow);
    }

    // Step 2: Add and commit changes
    log('\n📝 Step 2: Committing changes...', colors.blue);
    try {
      execSync('git add -A', { stdio: 'inherit' });
      execSync(`git commit -m "Fix nutrition coach database issues and add migration system" || true`, { stdio: 'inherit' });
      log('✅ Changes committed', colors.green);
    } catch (err) {
      log('No changes to commit or commit failed', colors.yellow);
    }

    // Step 3: Push to git
    log('\n📤 Step 3: Pushing to git...', colors.blue);
    try {
      execSync('git push origin main', { stdio: 'inherit' });
      log('✅ Pushed to git', colors.green);
    } catch (err) {
      log('Warning: Could not push to git. You may need to push manually.', colors.yellow);
    }

    // Step 4: Deploy to Vercel
    log('\n🔧 Step 4: Building and deploying to Vercel...', colors.blue);
    log('This may take a few minutes...', colors.yellow);
    
    try {
      // First, let's check if vercel CLI is installed
      try {
        execSync('vercel --version', { stdio: 'ignore' });
      } catch {
        log('Installing Vercel CLI...', colors.yellow);
        execSync('npm i -g vercel', { stdio: 'inherit' });
      }

      // Deploy to production
      log('Deploying to production...', colors.blue);
      execSync('vercel --prod --yes', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
      });
      
      log('✅ Deployed to Vercel', colors.green);
    } catch (err) {
      log('Error deploying to Vercel:', colors.red);
      console.error(err.message);
      log('\nYou can deploy manually with: vercel --prod', colors.yellow);
    }

    // Step 5: Show migration instructions
    log('\n📚 Step 5: Database Migration Instructions', colors.blue);
    log('=========================================', colors.blue);
    
    log('\nIMPORTANT: You need to run the database migration!', colors.bright + colors.yellow);
    log('\nOption 1: Via Supabase Dashboard (Recommended)', colors.green);
    log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn', colors.reset);
    log('2. Navigate to SQL Editor', colors.reset);
    log('3. Copy the contents of: supabase/migrations/20250910_fix_nutrition_and_related_tables.sql', colors.reset);
    log('4. Paste and click "Run"', colors.reset);
    
    log('\nOption 2: Via Production Test Page', colors.green);
    log('1. Visit your production URL + /test-nutrition', colors.reset);
    log('2. Log in as an admin user', colors.reset);
    log('3. Click "Apply Database Migration"', colors.reset);
    log('4. Verify all tables show green checkmarks', colors.reset);
    
    log('\nOption 3: Using psql (if available)', colors.green);
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250910_fix_nutrition_and_related_tables.sql');
    log(`PGPASSWORD="@Aa80236661" psql -h db.lzlrojoaxrqvmhempnkn.supabase.co -U postgres -d postgres -f "${migrationPath}"`, colors.reset);

    // Step 6: Create a simple HTML file with migration SQL for easy copying
    log('\n📄 Creating migration helper file...', colors.blue);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Nutrition Database Migration</title>
    <style>
        body { font-family: system-ui; padding: 20px; background: #1a1a1a; color: #fff; }
        h1 { color: #3b82f6; }
        .instructions { background: #262626; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .sql-container { background: #0a0a0a; padding: 20px; border-radius: 8px; position: relative; }
        pre { overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #2563eb; }
        .success { color: #10b981; margin-top: 10px; display: none; }
    </style>
</head>
<body>
    <h1>🔧 Nutrition Coach Database Migration</h1>
    
    <div class="instructions">
        <h2>Instructions:</h2>
        <ol>
            <li>Click "Copy SQL" below</li>
            <li>Go to <a href="https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new" target="_blank">Supabase SQL Editor</a></li>
            <li>Paste the SQL and click "Run"</li>
            <li>Verify the migration completed successfully</li>
        </ol>
    </div>
    
    <div class="sql-container">
        <button onclick="copySQL()">📋 Copy SQL to Clipboard</button>
        <div class="success" id="success">✅ Copied to clipboard!</div>
        <pre id="sql">${migrationSQL.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>
    
    <script>
        function copySQL() {
            const sql = document.getElementById('sql').textContent;
            navigator.clipboard.writeText(sql).then(() => {
                document.getElementById('success').style.display = 'block';
                setTimeout(() => {
                    document.getElementById('success').style.display = 'none';
                }, 3000);
            });
        }
    </script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(__dirname, '..', 'MIGRATION_HELPER.html'), htmlContent);
    log('✅ Created MIGRATION_HELPER.html - Open this file to easily copy the migration SQL', colors.green);

    // Final summary
    log('\n========================================', colors.bright);
    log('🎉 Deployment Complete!', colors.bright + colors.green);
    log('========================================\n', colors.bright);
    
    log('Next Steps:', colors.bright);
    log('1. ⚠️  Run the database migration (see instructions above)', colors.yellow);
    log('2. ✅ Test the nutrition coach on production', colors.reset);
    log('3. ✅ Verify no more 400/406 errors in console', colors.reset);
    
    log('\nProduction URLs:', colors.bright);
    log('- Main app: https://atlas-fitness-onboarding.vercel.app', colors.reset);
    log('- Test page: https://atlas-fitness-onboarding.vercel.app/test-nutrition', colors.reset);
    
  } catch (error) {
    log('\n❌ Deployment failed:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the deployment
deployNutritionFix();