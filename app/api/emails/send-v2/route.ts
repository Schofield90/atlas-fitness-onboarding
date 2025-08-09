import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/app/lib/services/unified-email.service';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Validation schemas
const sendSingleEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string(),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  templateId: z.string().optional(),
  variables: z.record(z.string(), z.any()).optional(),
});

const sendBulkEmailSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    variables: z.record(z.string(), z.any()).optional(),
  })),
  subject: z.string(),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'single';

    // Get organization ID from auth
    let organizationId = '63589490-8f55-4157-bd3a-e141594b748e'; // Default
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: org } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        
        if (org) {
          organizationId = org.organization_id;
        }
      }
    }

    if (mode === 'bulk') {
      // Validate bulk email request
      const validated = sendBulkEmailSchema.parse(body);
      
      // Create email options for each recipient
      const emails = validated.recipients.map(recipient => ({
        to: recipient.email,
        subject: validated.subject,
        html: validated.html,
        text: validated.text,
        replyTo: validated.replyTo,
        organizationId,
        variables: recipient.variables,
      }));

      // Send bulk emails
      const results = await emailService.sendBulk(emails);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Bulk email sent. ${successful} successful, ${failed} failed.`,
        results,
        stats: {
          total: results.length,
          successful,
          failed,
        }
      });
    } else {
      // Validate single email request
      const validated = sendSingleEmailSchema.parse(body);
      
      // Send single email
      const result = await emailService.send({
        to: validated.to,
        subject: validated.subject,
        html: validated.html,
        text: validated.text,
        replyTo: validated.replyTo,
        cc: validated.cc,
        bcc: validated.bcc,
        organizationId,
        templateId: validated.templateId,
        variables: validated.variables,
      });

      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? (emailService.isTestMode() ? 'Email logged in test mode' : 'Email sent successfully')
          : 'Failed to send email',
        messageId: result.messageId,
        error: result.error,
        provider: result.provider,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.flatten().fieldErrors,
      }, { status: 400 });
    }
    
    console.error('Email send error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET endpoint to check email configuration
export async function GET(request: NextRequest) {
  try {
    const status = await emailService.testConnection();
    const isTestMode = emailService.isTestMode();
    
    return NextResponse.json({
      ...status,
      testMode: isTestMode,
      provider: isTestMode ? 'test' : 'resend',
      configuration: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || 'not configured',
      }
    });
  } catch (error) {
    console.error('Email status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}