import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import OpenAI from 'openai'

export const runtime = 'nodejs' // Force Node.js runtime for OpenAI SDK

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check authorization - only super admins
    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    const isAuthorized = authorizedEmails.includes(user.email?.toLowerCase() || '')

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Get request body
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request - messages array required' }, { status: 400 })
    }

    // 4. Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('[AI Chat] OpenAI API key not configured')
      return NextResponse.json(
        { error: 'AI chat is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // 5. Initialize OpenAI client (lazy-load for build compatibility)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Safe: This is a server-side API route
    })

    // 6. Create system prompt tailored for platform admin
    const systemPrompt = `You are an intelligent AI assistant for the Atlas Fitness SaaS platform administration team.

Your role is to help platform administrators manage and understand their fitness software business.

You have access to information about:
- Platform metrics and analytics (subscriptions, revenue, user growth)
- Organization management (gym clients, their subscriptions, usage)
- Billing and payment processing (Stripe, GoCardless integrations)
- Technical support and troubleshooting
- Best practices for gym management software
- Feature usage and adoption

Key capabilities:
- Analyze platform metrics and provide insights
- Help troubleshoot issues with client accounts
- Suggest improvements to platform operations
- Explain technical features and configurations
- Guide on customer success strategies

Communication style:
- Professional but approachable
- Clear and concise
- Data-driven with actionable insights
- Helpful without being condescending

Current user: ${user.email}
Platform: Atlas Fitness CRM (Multi-tenant SaaS for gym management)

Provide helpful, accurate responses to support platform administration and growth.`

    // 7. Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective model
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiMessage = completion.choices[0]?.message?.content

    if (!aiMessage) {
      throw new Error('No response from AI')
    }

    // 8. Return response
    return NextResponse.json({
      success: true,
      message: aiMessage,
      usage: completion.usage
    })

  } catch (error: any) {
    console.error('[AI Chat API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process AI chat',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
