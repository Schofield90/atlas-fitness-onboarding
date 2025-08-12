const { chromium } = require('@playwright/test');
const readline = require('readline');

// Create readline interface for better input handling
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

(async () => {
  console.log('🚀 Launching interactive browser session...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('📍 Navigating to login.leaddec.com...');
  await page.goto('https://login.leaddec.com');
  
  console.log('✅ Browser opened successfully!\n');
  console.log('='*60);
  console.log('INSTRUCTIONS:');
  console.log('1. Log in manually in the browser window');
  console.log('2. Once logged in, type "capture" and press Enter');
  console.log('3. Type "exit" to close the browser');
  console.log('='*60 + '\n');
  
  let running = true;
  
  while (running) {
    const command = await askQuestion('Command (capture/exit): ');
    
    if (command.toLowerCase() === 'capture') {
      console.log('\n📸 Capturing current state...');
      
      const currentUrl = page.url();
      const pageTitle = await page.title();
      
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `leaddec-capture-${Date.now()}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot saved`);
      
      // Save auth state
      await context.storageState({ path: 'leaddec-session.json' });
      console.log('🔐 Session saved to leaddec-session.json');
      
      // Analyze page
      const pageInfo = await page.evaluate(() => {
        const getText = (selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements)
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0);
        };
        
        return {
          url: window.location.href,
          title: document.title,
          hasLoginForm: !!document.querySelector('#email'),
          links: getText('a').slice(0, 20),
          headings: getText('h1, h2, h3').slice(0, 10),
          buttons: getText('button').slice(0, 10),
        };
      });
      
      console.log('\n📊 Page Analysis:');
      console.log('Is login page:', pageInfo.hasLoginForm && pageInfo.url.includes('login'));
      console.log('Headings:', pageInfo.headings);
      console.log('Buttons:', pageInfo.buttons);
      console.log('Links (first 10):', pageInfo.links.slice(0, 10));
      
      if (!pageInfo.hasLoginForm || !pageInfo.url.includes('login')) {
        console.log('\n✅ Successfully captured logged-in session!');
        console.log('You can now use leaddec-session.json in automated tests.');
      } else {
        console.log('\n⚠️  Still on login page - please complete login first');
      }
      
      console.log('\n');
      
    } else if (command.toLowerCase() === 'exit') {
      running = false;
    } else if (command) {
      console.log('Unknown command. Use "capture" or "exit"\n');
    }
  }
  
  console.log('👋 Closing browser...');
  await browser.close();
  rl.close();
  console.log('✅ Done!');
})();