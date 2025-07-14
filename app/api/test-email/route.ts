import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  try {
    console.log('🧪 Testing email sending...');
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    console.log('API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 8) + '...');
    
    // Simple test email
    const { data, error } = await resend.emails.send({
      from: 'sam@atlas-gyms.co.uk',
      to: ['sam@atlas-gyms.co.uk'],
      subject: '🧪 Test Email from Atlas Fitness Onboarding',
      html: `
        <h2>Test Email Success! ✅</h2>
        <p>This is a test email to verify the Resend integration is working.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>From: Atlas Fitness Onboarding System</p>
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error,
        message: 'Email failed to send'
      }, { status: 400 });
    }

    console.log('✅ Email sent successfully:', data);
    return NextResponse.json({ 
      success: true, 
      data: data,
      message: 'Test email sent successfully!'
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Unexpected error occurred'
    }, { status: 500 });
  }
}