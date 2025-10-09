#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Copies shared resources from root /app to specific app directories
 * Usage: node scripts/copy-shared-to-app.js <app-name>
 * Example: node scripts/copy-shared-to-app.js gym-dashboard
 */

const appName = process.argv[2];

if (!appName) {
  console.error('❌ Error: App name is required');
  console.log('Usage: node scripts/copy-shared-to-app.js <app-name>');
  process.exit(1);
}

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'apps', appName);

if (!fs.existsSync(APP_DIR)) {
  console.error(`❌ Error: App directory not found: ${APP_DIR}`);
  process.exit(1);
}

// Directories to copy from root /app to apps/{appName}/app
const SHARED_DIRS = [
  'api',
  'components',
  'lib',
  'settings',
  'hooks',
  'types',
  'org'     // Path-based multi-tenant routes
  // Note: 'members' is NOT copied - each app has its own member pages
];

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⏭️  Skipping ${path.basename(src)} (doesn't exist in root)`);
    return;
  }

  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`\n📦 Copying shared resources to ${appName}...\n`);

for (const dir of SHARED_DIRS) {
  const src = path.join(ROOT_DIR, 'app', dir);
  const dest = path.join(APP_DIR, 'app', dir);

  if (fs.existsSync(dest)) {
    // Remove existing directory first
    fs.rmSync(dest, { recursive: true, force: true });
  }

  copyDir(src, dest);
  console.log(`✅ Copied ${dir}`);
}

console.log(`\n✨ Done! Shared resources copied to ${appName}\n`);
