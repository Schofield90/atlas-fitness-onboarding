import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...')
  
  // Clean up any test artifacts if needed
  console.log('📊 Test execution complete')
  
  // Log summary
  console.log('🏁 Dashboard QA Tests - Global teardown complete')
}

export default globalTeardown