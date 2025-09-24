import { test, expect } from '@playwright/test';

test.describe('Class Calendar Timezone Issue', () => {
  test('verify class times display correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto('https://login.gymleadhub.co.uk');

    // Log in
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk');
    await page.fill('input[type="password"]', 'process.env.TEST_USER_PASSWORD || 'test123'');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Navigate to class calendar
    await page.goto('https://login.gymleadhub.co.uk/class-calendar');

    // Wait for the calendar to load
    await page.waitForSelector('.grid.grid-cols-8', { timeout: 10000 });

    // Look for time slots in the calendar
    const timeSlots = await page.$$eval('.text-xs.text-gray-500.font-medium', elements =>
      elements.map(el => el.textContent?.trim()).filter(Boolean)
    );

    console.log('Time slots found:', timeSlots);

    // Check for any class blocks
    const classBlocks = await page.$$('[class*="ClassBlock"]');
    console.log('Number of class blocks found:', classBlocks.length);

    // Get the first class if exists
    if (classBlocks.length > 0) {
      const firstClassTime = await classBlocks[0].textContent();
      console.log('First class time text:', firstClassTime);

      // Also check the actual position of the class in the grid
      const firstClassStyle = await classBlocks[0].getAttribute('style');
      console.log('First class positioning style:', firstClassStyle);
    }

    // Check the raw data by intercepting API calls
    const classesPromise = page.waitForResponse(
      response => response.url().includes('/api/booking/classes') && response.status() === 200
    );

    // Refresh the page to trigger API call
    await page.reload();

    const classesResponse = await classesPromise;
    const classesData = await classesResponse.json();

    console.log('API Response - Number of classes:', classesData.classes?.length);
    if (classesData.classes && classesData.classes.length > 0) {
      console.log('First class from API:', {
        id: classesData.classes[0].id,
        start_time: classesData.classes[0].start_time,
        instructor: classesData.classes[0].instructor_name,
        program: classesData.classes[0].program?.name
      });

      // Parse and display the time in different formats
      const startTime = new Date(classesData.classes[0].start_time);
      console.log('Start time parsed:', {
        iso: startTime.toISOString(),
        utc: startTime.toUTCString(),
        local: startTime.toString(),
        hours_utc: startTime.getUTCHours(),
        hours_local: startTime.getHours(),
        formatted_uk: startTime.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London'
        })
      });
    }

    // Take a screenshot for visual inspection
    await page.screenshot({ path: 'class-calendar-timezone.png', fullPage: true });
  });
});