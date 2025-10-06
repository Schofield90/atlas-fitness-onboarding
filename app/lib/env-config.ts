// Environment configuration with validation
export const envConfig = {
  // Required environment variables
  required: {
    supabase: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ],
    twilio: [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_SMS_FROM'
    ],
    app: [
      'NEXT_PUBLIC_APP_URL'
    ]
  },
  
  // Optional but recommended
  optional: {
    ai: [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY'
    ],
    google: [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ],
    email: [
      'RESEND_API_KEY'
    ],
    vercel: [
      'VERCEL_TOKEN',
      'VERCEL_ORG_ID',
      'VERCEL_PROJECT_ID'
    ]
  }
};

// Validate environment variables
export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  Object.entries(envConfig.required).forEach(([category, vars]) => {
    vars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(`${varName} (${category})`);
      }
    });
  });
  
  // Check optional variables
  Object.entries(envConfig.optional).forEach(([category, vars]) => {
    vars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`${varName} (${category})`);
      }
    });
  });
  
  return { missing, warnings };
}

// Get environment variable with fallback
export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || fallback || '';
}

// Check if running in production
export const isProd = process.env.NODE_ENV === 'production';

// Check if running in development
export const isDev = process.env.NODE_ENV === 'development';

// Check if running in Vercel
export const isVercel = process.env.VERCEL === '1';

// Get the app URL
export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (isVercel && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}