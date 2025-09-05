// Simple test script to verify Resend email configuration
const { Resend } = require('resend');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('Testing email configuration for GymLeadHub...\n');
  
  // Check if API key is configured
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
    console.error('❌ RESEND_API_KEY not configured in .env.local');
    console.log('Please add your Resend API key to .env.local');
    console.log('Get it from: https://resend.com/api-keys');
    return;
  }

  console.log('✅ API Key found');
  console.log(`📧 From Email: ${process.env.RESEND_FROM_EMAIL || 'sam@gymleadhub.co.uk'}`);
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('\nSending test email...');
    
    const { data, error } = await resend.emails.send({
      from: 'GymLeadHub <sam@gymleadhub.co.uk>',
      to: 'sam@gymleadhub.co.uk', // Sending to yourself
      subject: 'GymLeadHub Email Test - Configuration Verified ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">GymLeadHub Email Configuration Test</h2>
          <p>Great news! Your email configuration is working correctly.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <ul>
              <li><strong>From Domain:</strong> gymleadhub.co.uk</li>
              <li><strong>Email Provider:</strong> Resend</li>
              <li><strong>Test Time:</strong> ${new Date().toLocaleString('en-GB')}</li>
            </ul>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>✅ Platform emails are now configured</li>
            <li>📧 All auth emails will come from sam@gymleadhub.co.uk</li>
            <li>🚀 Ready to configure Supabase Auth SMTP</li>
          </ol>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is a test email from your GymLeadHub platform.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Email failed:', error);
      
      if (error.message?.includes('domain')) {
        console.log('\n⚠️  Domain verification needed:');
        console.log('1. Go to https://resend.com/domains');
        console.log('2. Add gymleadhub.co.uk');
        console.log('3. Add the DNS records to your domain');
      }
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', data?.id);
      console.log('\n🎉 Your email configuration is working perfectly!');
      console.log('Check your inbox at sam@gymleadhub.co.uk');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your API key is correct');
    console.log('2. Verify your domain at https://resend.com/domains');
    console.log('3. Make sure DNS records are configured');
  }
}

testEmail();