#!/usr/bin/env tsx

/**
 * Payment Environment Validation Script
 * Validates all payment-related environment variables and tests connections
 */

import Stripe from 'stripe'
import { config } from 'dotenv'
import chalk from 'chalk'

// Load environment variables
config({ path: '.env.local' })

interface ValidationResult {
  valid: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

class PaymentEnvValidator {
  private results: ValidationResult[] = []
  
  async validate(): Promise<void> {
    console.log(chalk.blue.bold('\n🔍 Payment Environment Validation\n'))
    
    // Stripe validation
    await this.validateStripe()
    
    // GoCardless validation
    await this.validateGoCardless()
    
    // Platform configuration
    this.validatePlatformConfig()
    
    // Print results
    this.printResults()
  }
  
  private async validateStripe(): Promise<void> {
    console.log(chalk.yellow('Validating Stripe configuration...'))
    
    // Check required keys
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    
    if (!stripeSecretKey) {
      this.results.push({
        valid: false,
        message: 'STRIPE_SECRET_KEY is missing',
        severity: 'error'
      })
    } else {
      // Test Stripe connection
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2024-11-20.acacia',
          typescript: true
        })
        
        const account = await stripe.accounts.retrieve()
        
        this.results.push({
          valid: true,
          message: `Stripe connected: ${account.email} (${account.id})`,
          severity: 'info'
        })
        
        // Check if using test keys in production
        if (process.env.NODE_ENV === 'production' && stripeSecretKey.startsWith('sk_test_')) {
          this.results.push({
            valid: false,
            message: 'Using test Stripe keys in production!',
            severity: 'warning'
          })
        }
      } catch (error) {
        this.results.push({
          valid: false,
          message: `Stripe connection failed: ${error.message}`,
          severity: 'error'
        })
      }
    }
    
    if (!stripePublishableKey) {
      this.results.push({
        valid: false,
        message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing',
        severity: 'error'
      })
    } else if (
      stripeSecretKey?.startsWith('sk_test_') !== 
      stripePublishableKey?.startsWith('pk_test_')
    ) {
      this.results.push({
        valid: false,
        message: 'Stripe keys mismatch (test vs live)',
        severity: 'error'
      })
    }
    
    if (!stripeWebhookSecret) {
      this.results.push({
        valid: false,
        message: 'STRIPE_WEBHOOK_SECRET is missing',
        severity: 'warning'
      })
    }
    
    // Check Connect configuration
    const connectClientId = process.env.STRIPE_CONNECT_CLIENT_ID
    if (!connectClientId) {
      this.results.push({
        valid: false,
        message: 'STRIPE_CONNECT_CLIENT_ID is missing (required for merchant processing)',
        severity: 'warning'
      })
    }
  }
  
  private async validateGoCardless(): Promise<void> {
    console.log(chalk.yellow('Validating GoCardless configuration...'))
    
    const gcEnvironment = process.env.GOCARDLESS_ENVIRONMENT
    const gcClientId = process.env.GOCARDLESS_CLIENT_ID
    const gcClientSecret = process.env.GOCARDLESS_CLIENT_SECRET
    const gcRedirectUri = process.env.GOCARDLESS_REDIRECT_URI
    const gcWebhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET
    
    if (!gcEnvironment) {
      this.results.push({
        valid: false,
        message: 'GOCARDLESS_ENVIRONMENT is missing',
        severity: 'warning'
      })
    } else if (!['sandbox', 'live'].includes(gcEnvironment)) {
      this.results.push({
        valid: false,
        message: 'GOCARDLESS_ENVIRONMENT must be "sandbox" or "live"',
        severity: 'error'
      })
    }
    
    if (!gcClientId || !gcClientSecret) {
      this.results.push({
        valid: false,
        message: 'GoCardless OAuth credentials missing',
        severity: 'warning'
      })
    }
    
    if (!gcRedirectUri) {
      this.results.push({
        valid: false,
        message: 'GOCARDLESS_REDIRECT_URI is missing',
        severity: 'warning'
      })
    } else if (!gcRedirectUri.startsWith('https://') && process.env.NODE_ENV === 'production') {
      this.results.push({
        valid: false,
        message: 'GOCARDLESS_REDIRECT_URI must use HTTPS in production',
        severity: 'error'
      })
    }
    
    if (!gcWebhookSecret) {
      this.results.push({
        valid: false,
        message: 'GOCARDLESS_WEBHOOK_SECRET is missing',
        severity: 'warning'
      })
    }
    
    // Test GoCardless connection if access token exists
    const gcAccessToken = process.env.GOCARDLESS_ACCESS_TOKEN
    if (gcAccessToken) {
      try {
        const response = await fetch(
          `https://api${gcEnvironment === 'sandbox' ? '-sandbox' : ''}.gocardless.com/creditors`,
          {
            headers: {
              'Authorization': `Bearer ${gcAccessToken}`,
              'GoCardless-Version': '2015-07-06'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          this.results.push({
            valid: true,
            message: `GoCardless connected: ${data.creditors?.[0]?.name || 'Unknown'}`,
            severity: 'info'
          })
        } else {
          this.results.push({
            valid: false,
            message: `GoCardless connection failed: ${response.statusText}`,
            severity: 'warning'
          })
        }
      } catch (error) {
        this.results.push({
          valid: false,
          message: `GoCardless connection error: ${error.message}`,
          severity: 'warning'
        })
      }
    }
  }
  
  private validatePlatformConfig(): void {
    console.log(chalk.yellow('Validating platform configuration...'))
    
    const platformFeeBps = process.env.PLATFORM_FEE_BPS
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const encryptionKey = process.env.DATABASE_ENCRYPTION_KEY
    
    if (platformFeeBps) {
      const fee = parseInt(platformFeeBps)
      if (isNaN(fee) || fee < 0 || fee > 10000) {
        this.results.push({
          valid: false,
          message: 'PLATFORM_FEE_BPS must be between 0 and 10000',
          severity: 'error'
        })
      } else {
        this.results.push({
          valid: true,
          message: `Platform fee: ${fee / 100}%`,
          severity: 'info'
        })
      }
    }
    
    if (!appUrl) {
      this.results.push({
        valid: false,
        message: 'NEXT_PUBLIC_APP_URL is missing',
        severity: 'warning'
      })
    }
    
    if (!encryptionKey) {
      this.results.push({
        valid: false,
        message: 'DATABASE_ENCRYPTION_KEY is missing (required for storing tokens)',
        severity: 'error'
      })
    } else if (encryptionKey.length < 32) {
      this.results.push({
        valid: false,
        message: 'DATABASE_ENCRYPTION_KEY must be at least 32 characters',
        severity: 'error'
      })
    }
    
    // Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      this.results.push({
        valid: false,
        message: 'Supabase configuration incomplete',
        severity: 'error'
      })
    }
  }
  
  private printResults(): void {
    console.log(chalk.blue.bold('\n📊 Validation Results\n'))
    
    let hasErrors = false
    let hasWarnings = false
    
    this.results.forEach(result => {
      const icon = result.valid ? '✅' : result.severity === 'error' ? '❌' : '⚠️'
      const color = result.valid ? chalk.green : result.severity === 'error' ? chalk.red : chalk.yellow
      
      console.log(`${icon} ${color(result.message)}`)
      
      if (!result.valid && result.severity === 'error') hasErrors = true
      if (!result.valid && result.severity === 'warning') hasWarnings = true
    })
    
    console.log('\n' + chalk.gray('─'.repeat(50)) + '\n')
    
    if (hasErrors) {
      console.log(chalk.red.bold('❌ Validation failed with errors'))
      console.log(chalk.red('Please fix the errors above before proceeding'))
      process.exit(1)
    } else if (hasWarnings) {
      console.log(chalk.yellow.bold('⚠️  Validation passed with warnings'))
      console.log(chalk.yellow('Some features may not work without fixing warnings'))
    } else {
      console.log(chalk.green.bold('✅ All validations passed!'))
      console.log(chalk.green('Your payment environment is properly configured'))
    }
  }
}

// Run validation
const validator = new PaymentEnvValidator()
validator.validate().catch(console.error)