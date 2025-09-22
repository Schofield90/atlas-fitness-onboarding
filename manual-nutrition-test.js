// Manual Test Script for Nutrition Coach
// Run this in browser console when on the nutrition page

async function testNutritionCoach() {
  console.log('🧪 Starting Nutrition Coach Manual Tests...');

  try {
    // Test 1: Check if AdvancedCoach component is present
    console.log('\n1. Testing component presence...');
    const coachElement = document.querySelector('[data-testid="advanced-coach"]') ||
                         document.querySelector('div[class*="bg-gradient-to-b from-gray-900"]');

    if (coachElement) {
      console.log('✅ Advanced Coach component found');
    } else {
      console.log('❌ Advanced Coach component not found');

      // Check for AINutritionCoach component
      const nutritionCoach = document.querySelector('div[class*="space-y-6"]');
      if (nutritionCoach) {
        console.log('ℹ️  Basic AINutritionCoach component detected instead');
      }
    }

    // Test 2: Check for reset button
    console.log('\n2. Testing reset button presence...');
    const resetButton = document.querySelector('button[title="Reset Progress"]') ||
                       document.querySelector('button svg[class*="RotateCcw"]') ||
                       document.querySelector('button:has(svg)');

    if (resetButton) {
      console.log('✅ Reset button found');
      console.log('Button details:', resetButton.outerHTML);
    } else {
      console.log('❌ Reset button not found');
    }

    // Test 3: Check localStorage for persistence
    console.log('\n3. Testing localStorage persistence...');
    const nutritionKeys = Object.keys(localStorage).filter(key =>
      key.includes('nutrition') || key.includes('coach')
    );

    if (nutritionKeys.length > 0) {
      console.log('✅ Nutrition-related localStorage keys found:', nutritionKeys);
      nutritionKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          console.log(`  ${key}:`, data);
        } catch (e) {
          console.log(`  ${key}: ${localStorage.getItem(key)}`);
        }
      });
    } else {
      console.log('❌ No nutrition-related localStorage found');
    }

    // Test 4: Check for message container
    console.log('\n4. Testing message interface...');
    const messageContainer = document.querySelector('div[class*="overflow-y-auto"]') ||
                           document.querySelector('div[class*="messages"]') ||
                           document.querySelector('div[class*="space-y-4"]');

    if (messageContainer) {
      console.log('✅ Message container found');
      const messages = messageContainer.querySelectorAll('div[class*="bg-gray-800"], div[class*="bg-orange-600"]');
      console.log(`Found ${messages.length} message elements`);
    } else {
      console.log('❌ Message container not found');
    }

    // Test 5: Check for input field
    console.log('\n5. Testing input interface...');
    const inputField = document.querySelector('input[placeholder*="response"], input[placeholder*="message"], input[placeholder*="answer"]');

    if (inputField) {
      console.log('✅ Input field found');
      console.log('Placeholder:', inputField.placeholder);
    } else {
      console.log('❌ Input field not found');
    }

    // Test 6: Check for send button
    console.log('\n6. Testing send button...');
    const sendButton = document.querySelector('button[class*="Send"], button:has(svg[class*="Send"])');

    if (sendButton) {
      console.log('✅ Send button found');
    } else {
      console.log('❌ Send button not found');
    }

    // Test 7: Check for coaching phases indicators
    console.log('\n7. Testing coaching phases...');
    const phaseIndicators = document.querySelectorAll('div[title*="Assessment"], div[title*="Mindset"], div[title*="Optimization"]');

    if (phaseIndicators.length > 0) {
      console.log(`✅ Found ${phaseIndicators.length} phase indicators`);
    } else {
      console.log('❌ No phase indicators found');
    }

    // Test 8: Test console errors
    console.log('\n8. Checking for console errors...');
    const originalError = console.error;
    const errors = [];
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError.apply(console, args);
    };

    setTimeout(() => {
      console.error = originalError;
      if (errors.length === 0) {
        console.log('✅ No console errors detected during test');
      } else {
        console.log('❌ Console errors detected:', errors);
      }
    }, 2000);

    // Test 9: Simulate localStorage persistence test
    console.log('\n9. Testing localStorage write/read...');
    const testKey = 'test-nutrition-persistence';
    const testData = { timestamp: Date.now(), test: true };

    try {
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = JSON.parse(localStorage.getItem(testKey));

      if (retrieved && retrieved.test === true) {
        console.log('✅ localStorage read/write working');
        localStorage.removeItem(testKey);
      } else {
        console.log('❌ localStorage read/write failed');
      }
    } catch (e) {
      console.log('❌ localStorage error:', e.message);
    }

    console.log('\n🏁 Manual test complete! Check results above.');

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

// Test if we can detect the current page
function detectCurrentPage() {
  const url = window.location.href;
  const title = document.title;

  console.log('📍 Current page info:');
  console.log('URL:', url);
  console.log('Title:', title);

  if (url.includes('/portal')) {
    console.log('✅ On portal page');

    // Check if nutrition tab is active
    const nutritionTab = document.querySelector('[aria-selected="true"]') ||
                         document.querySelector('.text-orange-500');

    if (nutritionTab && nutritionTab.textContent.includes('Nutrition')) {
      console.log('✅ Nutrition tab is active');
    } else {
      console.log('ℹ️  Nutrition tab might not be active - click on Nutrition tab first');
    }
  } else {
    console.log('ℹ️  Not on portal page - navigate to /portal first');
  }
}

// Auto-run detection
detectCurrentPage();

// Provide instructions
console.log('\n📋 To run the full test suite:');
console.log('1. Navigate to http://localhost:3000/portal');
console.log('2. Click on the "Nutrition" tab');
console.log('3. Run: testNutritionCoach()');
console.log('\nOr run it now if you\'re already on the nutrition page!');