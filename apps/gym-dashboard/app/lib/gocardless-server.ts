/**
 * GoCardless Server-Side Utilities
 * Handles direct debit payments and mandates
 */

import { createClient } from '@/app/lib/supabase/server'
import crypto from 'crypto'

interface GoCardlessConfig {
  environment: 'sandbox' | 'live'
  clientId: string
  clientSecret: string
  accessToken?: string
  webhookSecret?: string
}

interface GoCardlessClient {
  apiUrl: string
  headers: HeadersInit
}

interface RedirectFlowResponse {
  redirect_flows: {
    id: string
    description: string
    session_token: string
    scheme: string
    created_at: string
    redirect_url: string
  }
}

interface MandateResponse {
  mandates: {
    id: string
    created_at: string
    reference: string
    status: string
    scheme: string
    next_possible_charge_date: string
    metadata: Record<string, string>
    links: {
      customer: string
      customer_bank_account: string
      creditor: string
    }
  }
}

interface PaymentResponse {
  payments: {
    id: string
    created_at: string
    charge_date: string
    amount: number
    currency: string
    status: string
    reference: string
    metadata: Record<string, string>
    links: {
      mandate: string
      creditor: string
    }
  }
}

export class GoCardlessService {
  private config: GoCardlessConfig
  private client: GoCardlessClient

  constructor(config?: Partial<GoCardlessConfig>) {
    this.config = {
      environment: (process.env.GOCARDLESS_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
      clientId: process.env.GOCARDLESS_CLIENT_ID!,
      clientSecret: process.env.GOCARDLESS_CLIENT_SECRET!,
      accessToken: process.env.GOCARDLESS_ACCESS_TOKEN,
      webhookSecret: process.env.GOCARDLESS_WEBHOOK_SECRET,
      ...config
    }

    const baseUrl = this.config.environment === 'sandbox' 
      ? 'https://api-sandbox.gocardless.com'
      : 'https://api.gocardless.com'

    this.client = {
      apiUrl: baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json'
      }
    }
  }

  /**
   * OAuth flow for connecting merchant accounts
   */
  async getOAuthUrl(organizationId: string, redirectUri: string): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in database for verification
    const supabase = await createClient()
    await supabase
      .from('oauth_states')
      .insert({
        state,
        organization_id: organizationId,
        provider: 'gocardless',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'read write',
      state,
      initial_view: 'login'
    })

    const authUrl = this.config.environment === 'sandbox'
      ? 'https://connect-sandbox.gocardless.com/oauth/authorize'
      : 'https://connect.gocardless.com/oauth/authorize'

    return `${authUrl}?${params.toString()}`
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string
    organizationId: string
    creditorId: string
  }> {
    const tokenUrl = this.config.environment === 'sandbox'
      ? 'https://connect-sandbox.gocardless.com/oauth/access_token'
      : 'https://connect.gocardless.com/oauth/access_token'

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GoCardless OAuth error: ${error}`)
    }

    const data = await response.json()
    
    // Get organization details
    const orgResponse = await fetch(`${this.client.apiUrl}/creditors`, {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'GoCardless-Version': '2015-07-06'
      }
    })

    const orgData = await orgResponse.json()
    const creditor = orgData.creditors[0]

    return {
      accessToken: data.access_token,
      organizationId: data.organisation_id,
      creditorId: creditor.id
    }
  }

  /**
   * Create a redirect flow for customer authorization
   */
  async createRedirectFlow(params: {
    sessionToken: string
    successRedirectUrl: string
    description?: string
    organizationId: string
    clientEmail?: string
    clientName?: string
  }): Promise<RedirectFlowResponse> {
    const response = await fetch(`${this.client.apiUrl}/redirect_flows`, {
      method: 'POST',
      headers: this.client.headers,
      body: JSON.stringify({
        redirect_flows: {
          description: params.description || 'Gym membership payment authorization',
          session_token: params.sessionToken,
          success_redirect_url: params.successRedirectUrl,
          prefilled_customer: params.clientEmail ? {
            email: params.clientEmail,
            given_name: params.clientName?.split(' ')[0],
            family_name: params.clientName?.split(' ').slice(1).join(' ')
          } : undefined,
          metadata: {
            organization_id: params.organizationId
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create redirect flow: ${error}`)
    }

    return await response.json()
  }

  /**
   * Complete redirect flow and create mandate
   */
  async completeRedirectFlow(redirectFlowId: string, sessionToken: string): Promise<MandateResponse> {
    const response = await fetch(`${this.client.apiUrl}/redirect_flows/${redirectFlowId}/actions/complete`, {
      method: 'POST',
      headers: this.client.headers,
      body: JSON.stringify({
        data: {
          session_token: sessionToken
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to complete redirect flow: ${error}`)
    }

    const result = await response.json()
    return {
      mandates: result.redirect_flows.links.mandate
    }
  }

  /**
   * Create a payment against a mandate
   */
  async createPayment(params: {
    mandateId: string
    amountPence: number
    currency?: string
    reference?: string
    description?: string
    metadata?: Record<string, string>
    chargeDate?: string // ISO date string
  }): Promise<PaymentResponse> {
    const response = await fetch(`${this.client.apiUrl}/payments`, {
      method: 'POST',
      headers: this.client.headers,
      body: JSON.stringify({
        payments: {
          amount: params.amountPence,
          currency: params.currency || 'GBP',
          charge_date: params.chargeDate || this.getNextChargeDate(),
          reference: params.reference,
          description: params.description,
          metadata: params.metadata || {},
          links: {
            mandate: params.mandateId
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create payment: ${error}`)
    }

    return await response.json()
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: {
    mandateId: string
    amountPence: number
    currency?: string
    name: string
    interval: number // days between charges
    intervalUnit: 'weekly' | 'monthly' | 'yearly'
    dayOfMonth?: number
    metadata?: Record<string, string>
  }) {
    const response = await fetch(`${this.client.apiUrl}/subscriptions`, {
      method: 'POST',
      headers: this.client.headers,
      body: JSON.stringify({
        subscriptions: {
          amount: params.amountPence,
          currency: params.currency || 'GBP',
          name: params.name,
          interval: params.interval,
          interval_unit: params.intervalUnit,
          day_of_month: params.dayOfMonth,
          metadata: params.metadata || {},
          links: {
            mandate: params.mandateId
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create subscription: ${error}`)
    }

    return await response.json()
  }

  /**
   * Cancel a mandate
   */
  async cancelMandate(mandateId: string): Promise<void> {
    const response = await fetch(`${this.client.apiUrl}/mandates/${mandateId}/actions/cancel`, {
      method: 'POST',
      headers: this.client.headers
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to cancel mandate: ${error}`)
    }
  }

  /**
   * Get mandate details
   */
  async getMandate(mandateId: string): Promise<MandateResponse> {
    const response = await fetch(`${this.client.apiUrl}/mandates/${mandateId}`, {
      headers: this.client.headers
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get mandate: ${error}`)
    }

    return await response.json()
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    const computedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    )
  }

  /**
   * Get the next valid charge date (3+ business days from now)
   */
  private getNextChargeDate(): string {
    const date = new Date()
    let businessDays = 0
    
    while (businessDays < 3) {
      date.setDate(date.getDate() + 1)
      const dayOfWeek = date.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        businessDays++
      }
    }
    
    return date.toISOString().split('T')[0]
  }

  /**
   * Store connected account details
   */
  async storeConnectedAccount(params: {
    organizationId: string
    accessToken: string
    organizationGcId: string
    creditorId: string
  }) {
    const supabase = await createClient()
    
    // Encrypt the access token
    const encryptedToken = this.encryptToken(params.accessToken)
    
    const { error } = await supabase
      .from('connected_accounts')
      .upsert({
        organization_id: params.organizationId,
        gc_organization_id: params.organizationGcId,
        gc_access_token: encryptedToken,
        gc_creditor_id: params.creditorId,
        gc_enabled: true,
        gc_verified: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id'
      })

    if (error) {
      throw new Error(`Failed to store GoCardless account: ${error.message}`)
    }

    return true
  }

  /**
   * Get connected account for organization
   */
  async getConnectedAccount(organizationId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      return null
    }

    // Decrypt the access token if it exists
    if (data?.gc_access_token) {
      data.gc_access_token = this.decryptToken(data.gc_access_token)
    }

    return data
  }

  /**
   * Simple encryption for tokens (use proper KMS in production)
   */
  private encryptToken(token: string): string {
    const key = process.env.DATABASE_ENCRYPTION_KEY || 'default-key-change-in-production'
    const cipher = crypto.createCipher('aes-256-cbc', key)
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  /**
   * Simple decryption for tokens
   */
  private decryptToken(encryptedToken: string): string {
    const key = process.env.DATABASE_ENCRYPTION_KEY || 'default-key-change-in-production'
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}

// Export singleton instance
export const goCardlessService = new GoCardlessService()