#!/usr/bin/env tsx
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.test' })

const COMMANDS = {
  all: 'npm test',
  security: 'npm test -- tests/security',
  api: 'npm test -- tests/api',
  database: 'npm test -- tests/database',
  performance: 'npm test -- tests/database/performance.test.ts',
  coverage: 'npm test -- --coverage',
  watch: 'npm test -- --watch'
}

function showMenu() {
  console.log(`
🧪 Atlas Fitness Testing Suite
==============================

Choose a test suite to run:

1. All Tests          - Run all test suites
2. Security Tests     - Test organization isolation and RLS
3. API Tests          - Test API endpoints and middleware  
4. Database Tests     - Test database structure and queries
5. Performance Tests  - Test query performance and indexes
6. Coverage Report    - Run tests with coverage analysis
7. Watch Mode         - Run tests in watch mode

0. Exit
`)
}

async function runCommand(command: string) {
  console.log(`\n🚀 Running: ${command}\n`)
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('\n✅ Tests completed successfully!')
  } catch (error) {
    console.error('\n❌ Tests failed!')
    process.exit(1)
  }
}

async function setupTestDatabase() {
  console.log('📦 Setting up test database helpers...')
  
  const sqlPath = path.join(__dirname, '../tests/setup/database-helpers.sql')
  if (fs.existsSync(sqlPath)) {
    console.log('   ℹ️  Run the database-helpers.sql in your test database')
  }
}

async function main() {
  // Check if jest is installed
  try {
    require.resolve('jest')
  } catch {
    console.log('📦 Installing test dependencies...')
    execSync('npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom', {
      stdio: 'inherit'
    })
  }
  
  await setupTestDatabase()
  
  while (true) {
    showMenu()
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>(resolve => {
      readline.question('Select an option (0-7): ', resolve)
    })
    
    readline.close()
    
    switch (answer) {
      case '1':
        await runCommand(COMMANDS.all)
        break
      case '2':
        await runCommand(COMMANDS.security)
        break
      case '3':
        await runCommand(COMMANDS.api)
        break
      case '4':
        await runCommand(COMMANDS.database)
        break
      case '5':
        await runCommand(COMMANDS.performance)
        break
      case '6':
        await runCommand(COMMANDS.coverage)
        break
      case '7':
        await runCommand(COMMANDS.watch)
        break
      case '0':
        console.log('👋 Goodbye!')
        process.exit(0)
      default:
        console.log('❌ Invalid option. Please try again.')
    }
    
    // Wait a bit before showing menu again
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

main().catch(console.error)