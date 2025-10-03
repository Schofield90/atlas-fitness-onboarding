// Test login utilities for local development only
// Never use in production or commit real credentials

export function isTestEnvironment(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === 'true' && 
         (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost');
}

export function getTestCredentials() {
  if (!isTestEnvironment()) {
    return null;
  }
  
  // These should be set in .env.local for local development only
  return {
    client: {
      email: process.env.NEXT_PUBLIC_TEST_CLIENT_EMAIL || '',
      password: process.env.NEXT_PUBLIC_TEST_CLIENT_PASSWORD || ''
    },
    owner: {
      email: process.env.NEXT_PUBLIC_TEST_OWNER_EMAIL || '',
      password: process.env.NEXT_PUBLIC_TEST_OWNER_PASSWORD || ''
    }
  };
}