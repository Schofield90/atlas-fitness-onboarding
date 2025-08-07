// Environment variable validation script

const requiredEnvVars = [
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // Messaging
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_SMS_FROM',
  'TWILIO_WHATSAPP_FROM',
  'RESEND_API_KEY',
  
  // AI Services
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  
  // Payments
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  
  // Google Calendar
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  
  // App Config
  'NEXT_PUBLIC_APP_URL',
  'USER_PHONE_NUMBER'
];

const warnings = [];
const errors = [];

// Check for missing required variables
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    errors.push(`Missing required: ${varName}`);
  }
});

// Check for common mistakes
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase')) {
  warnings.push('NEXT_PUBLIC_SUPABASE_URL might be incorrect - should contain "supabase"');
}

if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  warnings.push('STRIPE_SECRET_KEY should start with "sk_"');
}

if (process.env.TWILIO_WHATSAPP_FROM && !process.env.TWILIO_WHATSAPP_FROM.includes('whatsapp:')) {
  warnings.push('TWILIO_WHATSAPP_FROM should include "whatsapp:" prefix');
}

// Report results
if (errors.length > 0) {
  console.error('❌ Environment variable errors:');
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️  Environment variable warnings:');
  warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log('✅ All required environment variables are present');
console.log(`📊 Total environment variables: ${Object.keys(process.env).length}`);