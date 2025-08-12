#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 GoHighLevel Automation Explorer Runner\n');

// Check if session file exists
const sessionFile = path.join(__dirname, 'leaddec-session.json');
if (!fs.existsSync(sessionFile)) {
  console.error('❌ Session file not found!');
  console.error('Please run: node manual-login-capture.js');
  process.exit(1);
}

// Check session age
const stats = fs.statSync(sessionFile);
const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

if (ageInHours > 24) {
  console.warn('⚠️  Session file is older than 24 hours and may be expired.');
  console.warn('If the explorer fails, run: node manual-login-capture.js\n');
}

console.log('✅ Session file found');
console.log(`📅 Session age: ${ageInHours.toFixed(1)} hours\n`);

// Ask user which script to run
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Which explorer would you like to run?');
console.log('1. JavaScript version (ghl-automation-explorer.js)');
console.log('2. TypeScript version (ghl-automation-explorer.ts)');
console.log('3. Exit\n');

rl.question('Enter your choice (1-3): ', (answer) => {
  rl.close();
  
  let command;
  switch (answer.trim()) {
    case '1':
      command = 'node ghl-automation-explorer.js';
      break;
    case '2':
      // Check if ts-node is available
      try {
        require.resolve('ts-node');
        command = 'npx ts-node ghl-automation-explorer.ts';
      } catch (e) {
        console.log('⚠️  ts-node not found, using tsx instead...');
        command = 'npx tsx ghl-automation-explorer.ts';
      }
      break;
    case '3':
      console.log('👋 Exiting...');
      process.exit(0);
    default:
      console.error('❌ Invalid choice');
      process.exit(1);
  }
  
  console.log(`\n🏃 Running: ${command}\n`);
  
  // Execute the chosen script
  const child = exec(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
  
  // Pipe output
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\n✅ Explorer completed successfully!');
      console.log(`📁 Check the results in: ${path.join(__dirname, 'data/ghl_automation/')}`);
    } else {
      console.error(`\n❌ Explorer exited with code ${code}`);
    }
  });
});