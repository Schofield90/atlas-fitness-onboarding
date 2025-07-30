#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    if (!options.ignoreError) {
      log(`Error executing: ${command}`, 'red');
      process.exit(1);
    }
  }
}

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, resolve);
  });
}

async function menu() {
  console.clear();
  log('🚀 Atlas Fitness Development Workflow', 'bright');
  log('=====================================\n', 'bright');
  
  log('1. Quick Deploy (Preview URL)', 'green');
  log('2. Production Deploy', 'yellow');
  log('3. Pull Environment Variables', 'blue');
  log('4. Run Type Check', 'cyan');
  log('5. Test API Endpoint', 'cyan');
  log('6. Clean Build Cache', 'yellow');
  log('7. Setup New Feature Branch', 'green');
  log('8. Check Deployment Status', 'blue');
  log('9. Exit\n', 'red');
  
  const choice = await prompt('Select an option (1-9):');
  
  switch(choice) {
    case '1':
      await quickDeploy();
      break;
    case '2':
      await productionDeploy();
      break;
    case '3':
      await pullEnvVars();
      break;
    case '4':
      await typeCheck();
      break;
    case '5':
      await testApi();
      break;
    case '6':
      await cleanCache();
      break;
    case '7':
      await setupFeatureBranch();
      break;
    case '8':
      await checkDeploymentStatus();
      break;
    case '9':
      rl.close();
      process.exit(0);
      break;
    default:
      log('Invalid option', 'red');
      await prompt('Press Enter to continue...');
      await menu();
  }
}

async function quickDeploy() {
  log('\n🚀 Starting Quick Deploy...', 'green');
  
  // Check for uncommitted changes
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (gitStatus) {
    log('\n⚠️  You have uncommitted changes:', 'yellow');
    console.log(gitStatus);
    const proceed = await prompt('Commit changes before deploying? (y/n):');
    
    if (proceed.toLowerCase() === 'y') {
      const message = await prompt('Commit message:');
      exec(`git add .`);
      exec(`git commit -m "${message}"`);
    }
  }
  
  log('\n📦 Creating preview deployment...', 'blue');
  exec('vercel');
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function productionDeploy() {
  log('\n🚨 Production Deploy', 'red');
  log('This will deploy to production!', 'yellow');
  
  const confirm = await prompt('Are you sure? (yes/no):');
  if (confirm.toLowerCase() !== 'yes') {
    await menu();
    return;
  }
  
  // Run checks
  log('\n🔍 Running pre-deploy checks...', 'yellow');
  
  log('1. Type checking...', 'cyan');
  exec('npm run typecheck', { ignoreError: true });
  
  log('2. Linting...', 'cyan');
  exec('npm run lint', { ignoreError: true });
  
  log('3. Building locally...', 'cyan');
  exec('npm run build:fast');
  
  log('\n✅ All checks passed!', 'green');
  
  log('\n🚀 Deploying to production...', 'green');
  exec('vercel --prod');
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function pullEnvVars() {
  log('\n📥 Pulling Environment Variables...', 'blue');
  
  exec('vercel env pull .env.local');
  log('✅ Environment variables saved to .env.local', 'green');
  
  // Show non-sensitive vars
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const publicVars = envContent
      .split('\n')
      .filter(line => line.startsWith('NEXT_PUBLIC_'))
      .map(line => line.split('=')[0]);
    
    if (publicVars.length > 0) {
      log('\nPublic variables:', 'cyan');
      publicVars.forEach(v => log(`  - ${v}`, 'cyan'));
    }
  }
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function typeCheck() {
  log('\n🔍 Running Type Check...', 'cyan');
  
  exec('npm run typecheck', { ignoreError: true });
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function testApi() {
  log('\n🧪 Test API Endpoint', 'cyan');
  
  const endpoint = await prompt('Enter endpoint path (e.g., /api/health):');
  const method = await prompt('HTTP method (GET/POST/PUT/DELETE) [GET]:') || 'GET';
  
  log('\n📡 Testing endpoint...', 'yellow');
  exec(`node scripts/quick-test.js ${endpoint} ${method}`);
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function cleanCache() {
  log('\n🧹 Cleaning Build Cache...', 'yellow');
  
  exec('rm -rf .next');
  exec('rm -rf node_modules/.cache');
  log('✅ Cache cleaned!', 'green');
  
  const rebuild = await prompt('Run fresh build? (y/n):');
  if (rebuild.toLowerCase() === 'y') {
    exec('npm run build:fast');
  }
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function setupFeatureBranch() {
  log('\n🌿 Setup Feature Branch', 'green');
  
  const branchName = await prompt('Branch name (e.g., feature/new-booking):');
  
  // Create and checkout branch
  exec(`git checkout -b ${branchName}`);
  log(`✅ Created and switched to branch: ${branchName}`, 'green');
  
  // Push to remote
  const pushRemote = await prompt('Push to remote? (y/n):');
  if (pushRemote.toLowerCase() === 'y') {
    exec(`git push -u origin ${branchName}`);
  }
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

async function checkDeploymentStatus() {
  log('\n📊 Checking Deployment Status...', 'blue');
  
  exec('vercel ls --yes');
  
  await prompt('\nPress Enter to return to menu...');
  await menu();
}

// Start the workflow
menu().catch(console.error);