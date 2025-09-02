import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

interface HealthCheckResult {
  integration: string
  status: 'healthy' | 'degraded' | 'error' | 'disconnected'
  checks: {
    connectivity: boolean
    authentication: boolean
    rateLimit: boolean
    quota: boolean
  }
  metrics: {
    responseTime: number
    errorRate: number
    lastSuccessful: Date | null
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Authorization check
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { integrationId } = await request.json()

    // Perform health checks based on integration type
    const healthCheckResult = await performHealthCheck(integrationId)

    // Log health check result
    await supabase
      .from('integration_health_logs')
      .insert({
        integration_id: integrationId,
        status: healthCheckResult.status,
        checks: healthCheckResult.checks,
        metrics: healthCheckResult.metrics,
        message: healthCheckResult.message,
        checked_by: user.id,
        checked_at: new Date().toISOString()
      })

    return NextResponse.json(healthCheckResult)

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}

async function performHealthCheck(integrationId: string): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    switch (integrationId) {
      case 'google-calendar':
        return await checkGoogleCalendar()
      case 'whatsapp':
        return await checkWhatsApp()
      case 'facebook':
        return await checkFacebook()
      case 'email-smtp':
        return await checkEmailSMTP()
      case 'webhooks':
        return await checkWebhooks()
      case 'stripe':
        return await checkStripe()
      default:
        throw new Error(`Unknown integration: ${integrationId}`)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      integration: integrationId,
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

async function checkGoogleCalendar(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check Google Calendar API connectivity
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, // In production, get from DB
      }
    })

    const responseTime = Date.now() - startTime
    const isAuthenticated = response.status !== 401
    const hasQuotaLeft = response.status !== 429
    const isConnected = response.ok

    return {
      integration: 'google-calendar',
      status: isConnected && isAuthenticated ? 'healthy' : 'error',
      checks: {
        connectivity: isConnected,
        authentication: isAuthenticated,
        rateLimit: hasQuotaLeft,
        quota: hasQuotaLeft
      },
      metrics: {
        responseTime,
        errorRate: isConnected ? 0 : 100,
        lastSuccessful: isConnected ? new Date() : null
      },
      message: isConnected ? 'All checks passed' : `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error) {
    return {
      integration: 'google-calendar',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function checkWhatsApp(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check Twilio WhatsApp API
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio credentials')
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?Limit=1`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      }
    })

    const responseTime = Date.now() - startTime
    const isAuthenticated = response.status !== 401
    const hasQuotaLeft = response.status !== 429
    const isConnected = response.ok

    return {
      integration: 'whatsapp',
      status: isConnected && isAuthenticated ? 'healthy' : 'error',
      checks: {
        connectivity: isConnected,
        authentication: isAuthenticated,
        rateLimit: hasQuotaLeft,
        quota: hasQuotaLeft
      },
      metrics: {
        responseTime,
        errorRate: isConnected ? 0 : 100,
        lastSuccessful: isConnected ? new Date() : null
      },
      message: isConnected ? 'WhatsApp API healthy' : `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error) {
    return {
      integration: 'whatsapp',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'WhatsApp check failed'
    }
  }
}

async function checkFacebook(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check Facebook Graph API
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN // In production, get from DB
    
    if (!accessToken) {
      throw new Error('Missing Facebook access token')
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`)
    const data = await response.json()

    const responseTime = Date.now() - startTime
    const isAuthenticated = !data.error
    const hasQuotaLeft = response.status !== 429
    const isConnected = response.ok && !data.error

    return {
      integration: 'facebook',
      status: isConnected && isAuthenticated ? 'healthy' : 'error',
      checks: {
        connectivity: response.ok,
        authentication: isAuthenticated,
        rateLimit: hasQuotaLeft,
        quota: hasQuotaLeft
      },
      metrics: {
        responseTime,
        errorRate: isConnected ? 0 : 100,
        lastSuccessful: isConnected ? new Date() : null
      },
      message: isConnected ? 'Facebook API healthy' : (data.error?.message || 'Facebook API error')
    }
  } catch (error) {
    return {
      integration: 'facebook',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'Facebook check failed'
    }
  }
}

async function checkEmailSMTP(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // In production, test SMTP connection
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }

    // Simulate SMTP connection test
    const isConfigured = !!(smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass)
    const responseTime = Date.now() - startTime

    return {
      integration: 'email-smtp',
      status: isConfigured ? 'healthy' : 'error',
      checks: {
        connectivity: isConfigured,
        authentication: isConfigured,
        rateLimit: true,
        quota: true
      },
      metrics: {
        responseTime,
        errorRate: isConfigured ? 0 : 100,
        lastSuccessful: isConfigured ? new Date() : null
      },
      message: isConfigured ? 'SMTP configuration valid' : 'Missing SMTP configuration'
    }
  } catch (error) {
    return {
      integration: 'email-smtp',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'SMTP check failed'
    }
  }
}

async function checkWebhooks(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check webhook endpoints are reachable
    const webhookEndpoints = [
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/facebook-leads`,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-voice`,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`
    ]

    const checks = await Promise.all(
      webhookEndpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint, { method: 'HEAD' })
          return response.ok || response.status === 405 // 405 Method Not Allowed is OK for HEAD
        } catch {
          return false
        }
      })
    )

    const responseTime = Date.now() - startTime
    const allHealthy = checks.every(check => check)
    const successRate = (checks.filter(check => check).length / checks.length) * 100

    return {
      integration: 'webhooks',
      status: allHealthy ? 'healthy' : successRate > 50 ? 'degraded' : 'error',
      checks: {
        connectivity: allHealthy,
        authentication: true,
        rateLimit: true,
        quota: true
      },
      metrics: {
        responseTime,
        errorRate: 100 - successRate,
        lastSuccessful: allHealthy ? new Date() : null
      },
      message: allHealthy 
        ? 'All webhook endpoints reachable' 
        : `${checks.filter(c => c).length}/${checks.length} endpoints reachable`
    }
  } catch (error) {
    return {
      integration: 'webhooks',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'Webhook check failed'
    }
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check Stripe API
    const stripeKey = process.env.STRIPE_SECRET_KEY
    
    if (!stripeKey) {
      throw new Error('Missing Stripe secret key')
    }

    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const responseTime = Date.now() - startTime
    const isAuthenticated = response.status !== 401
    const hasQuotaLeft = response.status !== 429
    const isConnected = response.ok

    return {
      integration: 'stripe',
      status: isConnected && isAuthenticated ? 'healthy' : 'error',
      checks: {
        connectivity: isConnected,
        authentication: isAuthenticated,
        rateLimit: hasQuotaLeft,
        quota: hasQuotaLeft
      },
      metrics: {
        responseTime,
        errorRate: isConnected ? 0 : 100,
        lastSuccessful: isConnected ? new Date() : null
      },
      message: isConnected ? 'Stripe API healthy' : `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error) {
    return {
      integration: 'stripe',
      status: 'error',
      checks: {
        connectivity: false,
        authentication: false,
        rateLimit: false,
        quota: false
      },
      metrics: {
        responseTime: Date.now() - startTime,
        errorRate: 100,
        lastSuccessful: null
      },
      message: error instanceof Error ? error.message : 'Stripe check failed'
    }
  }
}

// Get all integrations health status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get recent health check results
    const { data: healthLogs, error } = await supabase
      .from('integration_health_logs')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    return NextResponse.json({ healthLogs })

  } catch (error) {
    console.error('Get health status error:', error)
    return NextResponse.json(
      { error: 'Failed to get health status' },
      { status: 500 }
    )
  }
}