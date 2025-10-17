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
  'org',          // Path-based multi-tenant routes (includes /org/[orgSlug]/ai-agents)
  'ai-agents'     // Top-level redirect to /org/[orgSlug]/ai-agents
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

// Copy /app/* directories
for (const dir of SHARED_DIRS) {
  const src = path.join(ROOT_DIR, 'app', dir);
  const dest = path.join(APP_DIR, 'app', dir);

  if (fs.existsSync(dest)) {
    // Remove existing directory first
    fs.rmSync(dest, { recursive: true, force: true });
  }

  copyDir(src, dest);
  console.log(`✅ Copied app/${dir}`);
}

// Copy root /lib directory (for @/lib imports)
const libSrc = path.join(ROOT_DIR, 'lib');
const libDest = path.join(APP_DIR, 'lib');

if (fs.existsSync(libDest)) {
  fs.rmSync(libDest, { recursive: true, force: true });
}

copyDir(libSrc, libDest);
console.log(`✅ Copied lib/ (root level)`);

// Copy app/lib from gym-dashboard (contains supabase, toast, etc.)
const appLibSrc = path.join(ROOT_DIR, 'apps', 'gym-dashboard', 'app', 'lib');
const appLibDest = path.join(APP_DIR, 'app', 'lib');

if (fs.existsSync(appLibSrc)) {
  if (fs.existsSync(appLibDest)) {
    fs.rmSync(appLibDest, { recursive: true, force: true });
  }
  copyDir(appLibSrc, appLibDest);
  console.log(`✅ Copied app/lib from gym-dashboard`);
}

console.log(`\n✨ Done! Shared resources copied to ${appName}\n`);
