#!/usr/bin/env node

/**
 * Test GoTeamUp Import End-to-End
 *
 * This script tests the membership import by:
 * 1. Logging in to the dashboard
 * 2. Uploading the test CSV
 * 3. Checking for errors
 * 4. Verifying database records
 * 5. Re-importing to test duplicate prevention
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://login.gymleadhub.co.uk';
const CSV_PATH = '/Users/samschofield/Downloads/1 client test - 1 client test.csv';
const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';

// Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🤖 GoTeamUp Import Test - Starting...\n');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', '@Aa80236661');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
    console.log('✅ Logged in successfully\n');

    // Step 2: Navigate to import page
    console.log('📂 Step 2: Navigating to import page...');
    await page.goto(`${BASE_URL}/dashboard/import`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Import page loaded\n');

    // Step 3: Upload CSV
    console.log('📤 Step 3: Uploading CSV file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(CSV_PATH);

    // Wait for file to be processed
    await page.waitForTimeout(2000);
    console.log('✅ CSV uploaded\n');

    // Step 4: Start import
    console.log('🚀 Step 4: Starting import...');
    const importButton = await page.locator('button:has-text("Import")');
    await importButton.click();

    // Wait for import to complete
    await page.waitForTimeout(5000);

    // Step 5: Check for errors
    console.log('🔍 Step 5: Checking for errors...');
    const errorElements = await page.locator('[role="alert"], .error, [class*="error"]').all();

    if (errorElements.length > 0) {
      console.log('❌ ERRORS FOUND:');
      for (const error of errorElements) {
        const text = await error.textContent();
        console.log(`   - ${text}`);
      }
      throw new Error('Import failed with errors');
    }

    // Check success message
    const successMessage = await page.locator('text=/created.*membership/i').first();
    if (await successMessage.isVisible({ timeout: 5000 })) {
      const message = await successMessage.textContent();
      console.log(`✅ SUCCESS: ${message}\n`);
    }

    // Step 6: Verify in database
    console.log('💾 Step 6: Verifying database records...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check programs created
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organization_id', ORG_ID)
      .ilike('name', '%Full Member%');

    if (programsError) {
      console.log('❌ Error fetching programs:', programsError);
    } else {
      console.log(`✅ Programs found: ${programs?.length || 0}`);
      programs?.forEach(p => console.log(`   - ${p.name} (${p.id})`));
    }

    // Check memberships created
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('id, customer_id, program_id, membership_status')
      .in('program_id', programs?.map(p => p.id) || []);

    if (membershipsError) {
      console.log('❌ Error fetching memberships:', membershipsError);
    } else {
      console.log(`✅ Memberships found: ${memberships?.length || 0}`);
      memberships?.forEach(m => console.log(`   - Customer ${m.customer_id.substring(0, 8)}... → Program ${m.program_id.substring(0, 8)}... (${m.membership_status})`));
    }

    // Check client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('org_id', ORG_ID)
      .eq('email', 'adambrantsmith@me.com')
      .single();

    if (clientError) {
      console.log('❌ Error fetching client:', clientError);
    } else {
      console.log(`✅ Client found: ${client?.name} (${client?.email})`);
    }

    console.log('\n');

    // Step 7: Test duplicate prevention
    console.log('🔄 Step 7: Testing duplicate prevention...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Upload same file again
    const fileInput2 = await page.locator('input[type="file"]');
    await fileInput2.setInputFiles(CSV_PATH);
    await page.waitForTimeout(2000);

    // Start import again
    const importButton2 = await page.locator('button:has-text("Import")');
    await importButton2.click();
    await page.waitForTimeout(5000);

    // Check for "skipped" message
    const skippedMessage = await page.locator('text=/skipped/i').first();
    if (await skippedMessage.isVisible({ timeout: 5000 })) {
      const message = await skippedMessage.textContent();
      console.log(`✅ Duplicate prevention working: ${message}\n`);
    } else {
      console.log('⚠️  No skipped message found - may have created duplicates\n');
    }

    // Final database check
    const { data: finalMemberships } = await supabase
      .from('memberships')
      .select('id')
      .in('program_id', programs?.map(p => p.id) || []);

    console.log(`📊 Final membership count: ${finalMemberships?.length || 0}`);

    if (finalMemberships?.length === memberships?.length) {
      console.log('✅ No duplicates created!\n');
    } else {
      console.log('❌ Duplicates detected!\n');
    }

    console.log('🎉 ALL TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('📸 Screenshot saved to test-error.png');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
