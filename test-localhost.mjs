import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3001...');
  
  try {
    const response = await page.goto('http://localhost:3001', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Status:', response.status());
    console.log('✅ URL:', page.url());
    
    const title = await page.title();
    console.log('✅ Page Title:', title);
    
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('✅ Body preview:', bodyText);
    
    console.log('\n✅ SUCCESS: Page loaded successfully!');
    
  } catch (error) {
    console.error('❌ Error loading page:', error.message);
    
    // Try to get any error details from the page
    try {
      const content = await page.content();
      console.log('Page content preview:', content.substring(0, 1000));
    } catch (e) {
      console.log('Could not get page content');
    }
  }
  
  await browser.close();
})();
