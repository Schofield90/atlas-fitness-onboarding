#!/usr/bin/env node

/**
 * Memory Manager for Claude Code
 * This script helps manage and audit the CLAUDE.md memory file
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Memory file paths
const MEMORY_FILE = path.join(process.cwd(), 'CLAUDE.md');
const ANALYSIS_FILE = path.join(process.cwd(), 'CODEBASE_ANALYSIS.md');
const BACKUP_DIR = path.join(process.cwd(), '.claude-memory-backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function printHeader() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}   Claude Code Memory Manager${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function checkMemoryFile() {
  console.log(`${colors.blue}Checking memory file...${colors.reset}`);
  
  if (!fs.existsSync(MEMORY_FILE)) {
    console.log(`${colors.red}❌ CLAUDE.md not found!${colors.reset}`);
    console.log(`   Run: ${colors.yellow}node scripts/memory-manager.js init${colors.reset}`);
    return false;
  }
  
  const stats = fs.statSync(MEMORY_FILE);
  const lastModified = new Date(stats.mtime);
  const daysSinceUpdate = Math.floor((Date.now() - lastModified) / (1000 * 60 * 60 * 24));
  
  console.log(`${colors.green}✓ CLAUDE.md found${colors.reset}`);
  console.log(`  Last updated: ${lastModified.toLocaleDateString()} (${daysSinceUpdate} days ago)`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
  
  if (daysSinceUpdate > 7) {
    console.log(`${colors.yellow}⚠️  Memory file hasn't been updated in over a week${colors.reset}`);
  }
  
  return true;
}

async function auditCodebase() {
  console.log(`${colors.blue}Auditing codebase...${colors.reset}\n`);
  
  const audits = [
    {
      name: 'API Routes',
      command: 'find app/api -name "*.ts" -o -name "*.tsx" | wc -l',
      threshold: 50,
      unit: 'files'
    },
    {
      name: 'Components',
      command: 'find app/components -name "*.tsx" | wc -l',
      threshold: 100,
      unit: 'files'
    },
    {
      name: 'Database Migrations',
      command: 'ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l',
      threshold: 20,
      unit: 'files'
    },
    {
      name: 'Test Files',
      command: 'find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | grep -v node_modules | wc -l',
      threshold: 10,
      unit: 'files'
    },
    {
      name: 'TypeScript Files',
      command: 'find app -name "*.ts" -o -name "*.tsx" | wc -l',
      threshold: 200,
      unit: 'files'
    }
  ];
  
  for (const audit of audits) {
    try {
      const { stdout } = await execPromise(audit.command);
      const count = parseInt(stdout.trim()) || 0;
      const status = count >= audit.threshold ? '✓' : '⚠️';
      const color = count >= audit.threshold ? colors.green : colors.yellow;
      
      console.log(`${color}${status} ${audit.name}: ${count} ${audit.unit}${colors.reset}`);
      
      if (count < audit.threshold) {
        console.log(`   Expected at least ${audit.threshold} ${audit.unit}`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${audit.name}: Error running audit${colors.reset}`);
    }
  }
}

async function checkEnvironmentVars() {
  console.log(`\n${colors.blue}Checking environment variables...${colors.reset}\n`);
  
  const envExample = path.join(process.cwd(), '.env.example');
  const envLocal = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envExample)) {
    console.log(`${colors.red}❌ .env.example not found${colors.reset}`);
    return;
  }
  
  const exampleVars = fs.readFileSync(envExample, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim())
    .filter(Boolean);
  
  console.log(`Found ${exampleVars.length} environment variables in .env.example\n`);
  
  if (fs.existsSync(envLocal)) {
    const localVars = fs.readFileSync(envLocal, 'utf8')
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim())
      .filter(Boolean);
    
    const missing = exampleVars.filter(v => !localVars.includes(v));
    
    if (missing.length > 0) {
      console.log(`${colors.yellow}⚠️  Missing ${missing.length} variables in .env.local:${colors.reset}`);
      missing.forEach(v => console.log(`   - ${v}`));
    } else {
      console.log(`${colors.green}✓ All required environment variables are present${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠️  .env.local not found${colors.reset}`);
    console.log(`   Run: ${colors.cyan}cp .env.example .env.local${colors.reset}`);
  }
}

async function backupMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    console.log(`${colors.red}❌ No memory file to backup${colors.reset}`);
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupPath = path.join(BACKUP_DIR, `CLAUDE_${timestamp}.md`);
  
  fs.copyFileSync(MEMORY_FILE, backupPath);
  console.log(`${colors.green}✓ Memory backed up to: ${backupPath}${colors.reset}`);
}

async function listBackups() {
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('CLAUDE_') && f.endsWith('.md'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log(`${colors.yellow}No backups found${colors.reset}`);
    return;
  }
  
  console.log(`${colors.blue}Memory backups:${colors.reset}\n`);
  backups.forEach((backup, index) => {
    const stats = fs.statSync(path.join(BACKUP_DIR, backup));
    const date = backup.replace('CLAUDE_', '').replace('.md', '').replace(/T/, ' ');
    console.log(`  ${index + 1}. ${date} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
}

async function generateSummary() {
  console.log(`\n${colors.blue}Generating project summary...${colors.reset}\n`);
  
  const summary = {
    'Project Structure': {
      'API Routes': await countFiles('app/api', ['*.ts', '*.tsx']),
      'Components': await countFiles('app/components', ['*.tsx']),
      'Pages': await countFiles('app', ['page.tsx']),
      'Library Files': await countFiles('app/lib', ['*.ts', '*.tsx']),
      'Migrations': await countFiles('supabase/migrations', ['*.sql'])
    },
    'Key Technologies': [
      'Next.js 15.3.5',
      'Supabase (PostgreSQL)',
      'TypeScript',
      'Tailwind CSS',
      'Twilio (SMS/WhatsApp/Voice)',
      'OpenAI GPT-4',
      'Anthropic Claude',
      'Stripe Connect',
      'Google Calendar API',
      'BullMQ/Redis'
    ],
    'External Services': [
      'Vercel (Hosting)',
      'Supabase (Database/Auth)',
      'Twilio (Communications)',
      'OpenAI (AI)',
      'Anthropic (AI)',
      'Stripe (Payments)',
      'Google (OAuth/Calendar)',
      'Meta (Facebook Integration)',
      'Redis (Queue Management)'
    ]
  };
  
  console.log(`${colors.cyan}Project Structure:${colors.reset}`);
  for (const [category, count] of Object.entries(summary['Project Structure'])) {
    console.log(`  ${category}: ${count}`);
  }
  
  console.log(`\n${colors.cyan}Key Technologies:${colors.reset}`);
  summary['Key Technologies'].forEach(tech => console.log(`  • ${tech}`));
  
  console.log(`\n${colors.cyan}External Services:${colors.reset}`);
  summary['External Services'].forEach(service => console.log(`  • ${service}`));
}

async function countFiles(dir, patterns) {
  try {
    let count = 0;
    for (const pattern of patterns) {
      const { stdout } = await execPromise(`find ${dir} -name "${pattern}" 2>/dev/null | wc -l`);
      count += parseInt(stdout.trim()) || 0;
    }
    return count;
  } catch {
    return 0;
  }
}

async function showUsage() {
  console.log(`${colors.cyan}Usage:${colors.reset}`);
  console.log(`  node scripts/memory-manager.js [command]\n`);
  console.log(`${colors.cyan}Commands:${colors.reset}`);
  console.log(`  audit      - Audit the codebase and check memory status`);
  console.log(`  backup     - Create a backup of the current memory file`);
  console.log(`  list       - List all memory backups`);
  console.log(`  env        - Check environment variables`);
  console.log(`  summary    - Generate project summary`);
  console.log(`  help       - Show this help message`);
}

// Main execution
async function main() {
  await printHeader();
  
  const command = process.argv[2] || 'audit';
  
  switch (command) {
    case 'audit':
      await checkMemoryFile();
      await auditCodebase();
      await checkEnvironmentVars();
      break;
      
    case 'backup':
      await backupMemory();
      break;
      
    case 'list':
      await listBackups();
      break;
      
    case 'env':
      await checkEnvironmentVars();
      break;
      
    case 'summary':
      await generateSummary();
      break;
      
    case 'help':
      await showUsage();
      break;
      
    default:
      console.log(`${colors.red}Unknown command: ${command}${colors.reset}\n`);
      await showUsage();
      process.exit(1);
  }
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});