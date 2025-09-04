#!/usr/bin/env node

/**
 * Script to fetch and update Facebook form questions for existing forms
 * This ensures the field mapping interface has the form structure to work with
 */

const https = require('https');

async function updateFormQuestions(authCookie, domain = 'atlas-fitness-onboarding.vercel.app') {
  console.log('🔄 Updating Facebook form questions...\n');
  
  // First, get the list of saved forms
  const formsResponse = await new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: '/api/integrations/facebook/saved-forms',
      method: 'GET',
      headers: {
        'Cookie': authCookie
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });

  if (!formsResponse.success || !formsResponse.forms) {
    console.error('❌ Failed to get saved forms:', formsResponse.error || 'Unknown error');
    return;
  }

  console.log(`Found ${formsResponse.forms.length} saved forms\n`);

  // For each form, fetch its details from Facebook and update the questions
  for (const form of formsResponse.forms) {
    console.log(`📋 Processing form: ${form.form_name} (${form.facebook_form_id})`);
    
    // Get the form details from Facebook
    const formDetailsResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: domain,
        path: `/api/integrations/facebook/form-details?formId=${form.facebook_form_id}`,
        method: 'GET',
        headers: {
          'Cookie': authCookie
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    if (formDetailsResponse.success && formDetailsResponse.questions) {
      console.log(`  ✅ Found ${formDetailsResponse.questions.length} questions`);
      
      // Update the form with questions
      const updateResponse = await new Promise((resolve, reject) => {
        const updateData = JSON.stringify({
          formId: form.facebook_form_id,
          questions: formDetailsResponse.questions
        });

        const options = {
          hostname: domain,
          path: '/api/integrations/facebook/update-form-questions',
          method: 'POST',
          headers: {
            'Cookie': authCookie,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateData)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });

        req.on('error', reject);
        req.write(updateData);
        req.end();
      });

      if (updateResponse.success) {
        console.log('  ✅ Updated questions in database\n');
      } else {
        console.log('  ⚠️ Failed to update:', updateResponse.error || 'Unknown error\n');
      }
    } else {
      console.log('  ⚠️ Could not fetch questions from Facebook\n');
    }
  }

  console.log('✅ Form questions update complete!');
}

// Check command line arguments
const authCookie = process.argv[2];
const domain = process.argv[3] || 'atlas-fitness-onboarding.vercel.app';

if (!authCookie) {
  console.log('Usage: node update-facebook-form-questions.js <auth-cookie> [domain]');
  console.log('Example: node update-facebook-form-questions.js "sb-auth-token=..." atlas-fitness-onboarding.vercel.app');
  console.log('\nTo get your auth cookie:');
  console.log('1. Open your browser and log into the app');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to Application/Storage -> Cookies');
  console.log('4. Copy the entire cookie string');
  process.exit(1);
}

updateFormQuestions(authCookie, domain).catch(console.error);