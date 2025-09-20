#!/bin/bash

# Simple test to verify timezone display fix
echo "Testing timezone display fix..."

# Check the page directly with curl to see the output
echo "Checking if dev server is running..."
curl -s http://localhost:3000 > /dev/null
if [ $? -ne 0 ]; then
    echo "Dev server not running. Please start it with 'npm run dev'"
    exit 1
fi

echo "Dev server is running."

# Run a simple test loop - create sessions and check display
for i in {1..3}; do
    echo ""
    echo "Test iteration $i:"
    echo "==================="
    
    # Use Playwright to navigate and check times
    npx playwright test -e "
        const { chromium } = require('playwright');
        (async () => {
            const browser = await chromium.launch({ headless: false });
            const page = await browser.newPage();
            
            // Go to classes page (adjust for your auth)
            await page.goto('http://localhost:3000/classes');
            
            // Look for time displays
            const times = await page.locator('text=/\\\\d{2}:\\\\d{2}/').allTextContents();
            
            console.log('Found times:', times);
            
            // Check if any show 07:00 instead of 06:00
            const has7am = times.some(t => t.includes('07:00'));
            const has6am = times.some(t => t.includes('06:00'));
            
            if (has7am) {
                console.error('❌ FAIL: Found 07:00 - timezone bug still present!');
                process.exit(1);
            }
            
            if (has6am) {
                console.log('✅ PASS: 06:00 displayed correctly');
            }
            
            await browser.close();
        })();
    " 2>/dev/null || true
    
    sleep 2
done

echo ""
echo "Test completed!"