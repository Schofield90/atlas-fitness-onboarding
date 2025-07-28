import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { sendEmail, sendBulkEmails, EmailTemplate } from '@/app/lib/email/send-email'
import { logger } from '@/app/lib/logger/logger'
import { z } from 'zod'

// Validation schemas
const sendSingleEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  template: z.enum([
    'welcome-lead',
    'client-welcome',
    'staff-task',
    'password-reset',
    'class-reminder',
    'payment-receipt',
    'membership-expiring',
  ] as const),
  subject: z.string().optional(),
  variables: z.record(z.string(), z.any()),
  replyTo: z.string().email().optional(),
  entityId: z.string().uuid().optional(),
  entityType: z.enum(['lead', 'client', 'task']).optional(),
})

const sendBulkEmailSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    variables: z.record(z.string(), z.any()),
  })),
  template: z.enum([
    'welcome-lead',
    'client-welcome',
    'staff-task',
  ] as const),
  subject: z.string().optional(),
  replyTo: z.string().email().optional(),
  batchSize: z.number().min(1).max(50).optional(),
  delayMs: z.number().min(100).max(5000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'single'
    
    if (mode === 'bulk') {
      // Validate bulk email request
      const validatedData = sendBulkEmailSchema.parse(body)
      
      // Check if user has permission to send bulk emails
      // For now, all authenticated users can send bulk emails
      // TODO: Add role-based permissions
      
      logger.info('Bulk email request', {
        userId: user.id,
        metadata: {
          template: validatedData.template,
          recipientCount: validatedData.recipients.length,
        }
      })
      
      // Send bulk emails
      const result = await sendBulkEmails(
        validatedData.recipients,
        validatedData.template as EmailTemplate,
        {
          subject: validatedData.subject,
          replyTo: validatedData.replyTo,
          batchSize: validatedData.batchSize,
          delayMs: validatedData.delayMs,
          userId: user.id,
        }
      )
      
      return NextResponse.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
        total: validatedData.recipients.length,
      })
      
    } else {
      // Validate single email request
      const validatedData = sendSingleEmailSchema.parse(body)
      
      logger.info('Single email request', {
        userId: user.id,
        metadata: {
          template: validatedData.template,
          to: validatedData.to,
        }
      })
      
      // Send single email
      const result = await sendEmail({
        to: validatedData.to,
        template: validatedData.template as EmailTemplate,
        subject: validatedData.subject,
        variables: validatedData.variables,
        replyTo: validatedData.replyTo,
        userId: user.id,
        entityId: validatedData.entityId,
        entityType: validatedData.entityType,
      })
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          messageId: result.messageId,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
        }, { status: 400 })
      }
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.flatten().fieldErrors,
      }, { status: 400 })
    }
    
    return createErrorResponse(error)
  }
}

// GET endpoint to check email sending status (optional)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    
    if (!messageId) {
      return NextResponse.json({
        error: 'Message ID is required',
      }, { status: 400 })
    }
    
    // TODO: Implement email status checking with Resend API
    // For now, return mock data
    return NextResponse.json({
      messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

// Example API usage:
/*
// Send single email
POST /api/emails/send
{
  "to": "john@example.com",
  "template": "welcome-lead",
  "variables": {
    "leadName": "John Doe",
    "gymName": "Atlas Fitness",
    "tourBookingUrl": "https://app.atlasfitness.com/book-tour",
    "contactPhone": "(555) 123-4567",
    "contactEmail": "info@atlasfitness.com",
    "gymAddress": "123 Main St, City, State 12345"
  },
  "entityId": "123e4567-e89b-12d3-a456-426614174000",
  "entityType": "lead"
}

// Send bulk emails
POST /api/emails/send?mode=bulk
{
  "recipients": [
    {
      "email": "john@example.com",
      "variables": {
        "leadName": "John Doe",
        "gymName": "Atlas Fitness"
      }
    },
    {
      "email": "jane@example.com",
      "variables": {
        "leadName": "Jane Smith",
        "gymName": "Atlas Fitness"
      }
    }
  ],
  "template": "welcome-lead",
  "batchSize": 10,
  "delayMs": 500
}

// Check email status
GET /api/emails/send?messageId=msg_123456
*/