import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get all SMS logs
    const { data: smsLogs, error: smsError, count: smsCount } = await adminSupabase
      .from('sms_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Get all WhatsApp logs
    const { data: whatsappLogs, error: whatsappError, count: whatsappCount } = await adminSupabase
      .from('whatsapp_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Get all email logs
    const { data: emailLogs, error: emailError, count: emailCount } = await adminSupabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      summary: {
        sms: {
          totalCount: smsCount || 0,
          hasError: !!smsError,
          error: smsError ? {
            message: smsError.message,
            code: smsError.code,
            details: smsError.details
          } : null
        },
        whatsapp: {
          totalCount: whatsappCount || 0,
          hasError: !!whatsappError,
          error: whatsappError ? {
            message: whatsappError.message,
            code: whatsappError.code,
            details: whatsappError.details
          } : null
        },
        email: {
          totalCount: emailCount || 0,
          hasError: !!emailError,
          error: emailError ? {
            message: emailError.message,
            code: emailError.code,
            details: emailError.details,
            hint: 'If error code is 42P01, the table does not exist. Run the migration.'
          } : null
        }
      },
      
      recentLogs: {
        sms: smsLogs || [],
        whatsapp: whatsappLogs || [],
        email: emailLogs || []
      },
      
      recommendations: getRecommendations({
        smsError,
        whatsappError,
        emailError,
        smsCount: smsCount || 0,
        whatsappCount: whatsappCount || 0,
        emailCount: emailCount || 0
      })
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch message logs',
      details: error.message
    }, { status: 500 })
  }
}

function getRecommendations(data: any): string[] {
  const recommendations = []
  
  if (data.emailError?.code === '42P01') {
    recommendations.push('Email logs table does not exist. Run the migration in Supabase SQL Editor.')
  }
  if (data.smsError?.code === '42P01') {
    recommendations.push('SMS logs table does not exist. Check your database setup.')
  }
  if (data.whatsappError?.code === '42P01') {
    recommendations.push('WhatsApp logs table does not exist. Check your database setup.')
  }
  
  if (data.emailCount === 0 && !data.emailError) {
    recommendations.push('Email logs table exists but is empty. Send a test email to create records.')
  }
  if (data.smsCount === 0 && !data.smsError) {
    recommendations.push('SMS logs table exists but is empty. Send a test SMS to create records.')
  }
  if (data.whatsappCount === 0 && !data.whatsappError) {
    recommendations.push('WhatsApp logs table exists but is empty. Send a test WhatsApp message to create records.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All message log tables appear to be working correctly.')
  }
  
  return recommendations
}