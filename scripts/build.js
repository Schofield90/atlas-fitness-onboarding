#!/usr/bin/env node

// Set up global polyfills before build
global.self = global;
global.globalThis = global.globalThis || global;
global.global = global;

// Import and run Next.js build
const { execSync } = require('child_process');

console.log('Starting Next.js build with polyfills...');

try {
  execSync('next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}