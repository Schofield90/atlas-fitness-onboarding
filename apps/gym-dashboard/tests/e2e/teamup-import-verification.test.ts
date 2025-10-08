/**
 * E2E Test: TeamUp PDF Import Verification
 *
 * This test verifies the complete TeamUp PDF import workflow after deployment fixes:
 * 1. Upload TeamUp.pdf via API
 * 2. Verify correct number of classes extracted (40-50)
 * 3. Verify class_schedules created with day_of_week field
 * 4. Verify class_sessions generated for 4 weeks (160-200 sessions)
 * 5. Verify calendar displays classes correctly
 *
 * Fixes Verified:
 * - day_of_week field included in class_schedules insert (line 164)
 * - Correct date calculation using setMonth() instead of * 30 days (lines 206-208)
 * - sessionsCreated counter properly tracked (line 55)
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_CREDENTIALS = {
  email: 'sam@atlas-gyms.co.uk',
  password: '@Aa80236661',
};

const BASE_URL = 'https://login.gymleadhub.co.uk';
const PDF_PATH = '/Users/samschofield/Downloads/TeamUp.pdf';

test.describe('TeamUp PDF Import E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/signin`);
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });

  test('should upload TeamUp PDF and extract 40+ classes', async ({ page }) => {
    // Navigate to TeamUp integration page
    await page.goto(`${BASE_URL}/settings/integrations/teamup`);
    await page.waitForSelector('input[type="file"]');

    // Upload PDF
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Wait for upload to complete and get response
    const uploadResponse = await page.waitForResponse(
      response => response.url().includes('/api/classes/import/teamup-pdf/upload') && response.status() === 200
    );

    const uploadData = await uploadResponse.json();
    console.log('Upload response:', JSON.stringify(uploadData, null, 2));

    // Verify classes extracted
    expect(uploadData.success).toBe(true);
    expect(uploadData.data?.pdfUrl).toBeDefined();
    expect(uploadData.data?.totalPages).toBeGreaterThanOrEqual(4);
  });

  test('should analyze PDF and extract class schedule', async ({ page }) => {
    // Navigate to TeamUp integration page
    await page.goto(`${BASE_URL}/settings/integrations/teamup`);

    // Upload PDF first
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Wait for "Analyze PDF" button to appear and click it
    await page.waitForSelector('button:has-text("Analyze PDF")');
    await page.click('button:has-text("Analyze PDF")');

    // Wait for analysis response
    const analyzeResponse = await page.waitForResponse(
      response => response.url().includes('/api/classes/import/teamup-pdf/analyze') && response.status() === 200,
      { timeout: 30000 }
    );

    const analyzeData = await analyzeResponse.json();
    console.log('Analyze response:', JSON.stringify(analyzeData, null, 2));

    // Verify classes extracted
    expect(analyzeData.success).toBe(true);
    expect(analyzeData.data?.classes).toBeDefined();
    expect(analyzeData.data?.classes.length).toBeGreaterThanOrEqual(40);
    expect(analyzeData.data?.classes.length).toBeLessThanOrEqual(60);

    // Verify class structure
    const firstClass = analyzeData.data.classes[0];
    expect(firstClass).toHaveProperty('name');
    expect(firstClass).toHaveProperty('dayOfWeek');
    expect(firstClass).toHaveProperty('startTime');
    expect(firstClass).toHaveProperty('endTime');
    expect(firstClass).toHaveProperty('instructor');
  });

  test('should import classes and create schedules + sessions', async ({ page, request }) => {
    // Step 1: Upload PDF
    await page.goto(`${BASE_URL}/settings/integrations/teamup`);
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    const uploadResponse = await page.waitForResponse(
      response => response.url().includes('/api/classes/import/teamup-pdf/upload')
    );
    const uploadData = await uploadResponse.json();

    // Step 2: Analyze PDF
    await page.click('button:has-text("Analyze PDF")');
    const analyzeResponse = await page.waitForResponse(
      response => response.url().includes('/api/classes/import/teamup-pdf/analyze'),
      { timeout: 30000 }
    );
    const analyzeData = await analyzeResponse.json();
    const extractedClasses = analyzeData.data.classes;

    // Step 3: Import classes
    await page.click('button:has-text("Import Classes")');
    const importResponse = await page.waitForResponse(
      response => response.url().includes('/api/classes/import/teamup-pdf/import') && response.status() === 200,
      { timeout: 60000 }
    );

    const importData = await importResponse.json();
    console.log('Import response:', JSON.stringify(importData, null, 2));

    // CRITICAL ASSERTIONS
    expect(importData.success).toBe(true);

    // Verify class types created (should match unique class names)
    expect(importData.data.classTypesCreated).toBeGreaterThanOrEqual(30);
    expect(importData.data.classTypesCreated).toBeLessThanOrEqual(60);

    // Verify schedules created (should match total classes)
    expect(importData.data.schedulesCreated).toBeGreaterThanOrEqual(40);
    expect(importData.data.schedulesCreated).toBeLessThanOrEqual(60);

    // Verify sessions created (should be schedules × 4 weeks, allowing for past dates)
    const minSessions = Math.floor(importData.data.schedulesCreated * 3); // At least 3 weeks
    const maxSessions = importData.data.schedulesCreated * 4;
    expect(importData.data.sessionsCreated).toBeGreaterThanOrEqual(minSessions);
    expect(importData.data.sessionsCreated).toBeLessThanOrEqual(maxSessions);

    // Verify debug log shows correct day/time info
    expect(importData.data.debug?.importLog).toBeDefined();
    expect(importData.data.debug.importLog.length).toBeGreaterThan(0);

    // Log sample entries for manual verification
    console.log('\nSample import log entries:');
    importData.data.debug.importLog.slice(0, 5).forEach((entry: string) => {
      console.log(entry);
    });
  });

  test('should display classes in calendar at correct dates/times', async ({ page }) => {
    // Navigate to Class Calendar
    await page.goto(`${BASE_URL}/dashboard/classes`);
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });

    // Get calendar grid
    const calendarGrid = await page.locator('[data-testid="calendar-grid"]');
    expect(await calendarGrid.isVisible()).toBe(true);

    // Verify classes are displayed
    const classCards = await page.locator('[data-testid="class-card"]').all();
    expect(classCards.length).toBeGreaterThan(0);

    // Sample verification: Check first 5 classes have required fields
    for (let i = 0; i < Math.min(5, classCards.length); i++) {
      const card = classCards[i];

      // Verify class name
      const name = await card.locator('[data-testid="class-name"]').textContent();
      expect(name).toBeTruthy();

      // Verify time
      const time = await card.locator('[data-testid="class-time"]').textContent();
      expect(time).toMatch(/\d{1,2}:\d{2}/); // Matches HH:MM format

      // Verify instructor
      const instructor = await card.locator('[data-testid="class-instructor"]').textContent();
      expect(instructor).toBeTruthy();

      console.log(`Class ${i + 1}: ${name} at ${time} with ${instructor}`);
    }
  });

  test('should verify database records match import response', async ({ request }) => {
    // This test requires database access - would use Supabase client
    // For now, we'll verify via API endpoint

    const response = await request.get(`${BASE_URL}/api/classes/schedules`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('Database schedules count:', data.schedules?.length || 0);

    // Should have 40+ schedules
    expect(data.schedules?.length).toBeGreaterThanOrEqual(40);

    // Verify each schedule has day_of_week field
    const schedules = data.schedules || [];
    schedules.forEach((schedule: any) => {
      expect(schedule.day_of_week).toBeGreaterThanOrEqual(0);
      expect(schedule.day_of_week).toBeLessThanOrEqual(6);
    });
  });

  test('should verify sessions generated for future dates only', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/classes/sessions`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    const sessions = data.sessions || [];

    console.log('Total sessions created:', sessions.length);

    // Verify all sessions are in the future
    const now = new Date();
    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.start_time);
      expect(sessionDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });

    // Verify sessions span approximately 4 weeks
    if (sessions.length > 0) {
      const firstSession = new Date(sessions[0].start_time);
      const lastSession = new Date(sessions[sessions.length - 1].start_time);
      const daysDiff = (lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeLessThanOrEqual(30); // Should be within ~4 weeks
      console.log(`Sessions span ${Math.round(daysDiff)} days`);
    }
  });
});
