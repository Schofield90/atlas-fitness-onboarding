import { NextRequest, NextResponse } from 'next/server';
import { employeeFormSchema } from '@/lib/validations';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOnboardingEmail } from '@/lib/email';
import { sendTelegramNotification } from '@/lib/telegram';
import { nanoid } from 'nanoid';
import { addDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const body = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      jobTitle: formData.get('jobTitle') as string,
      annualSalary: Number(formData.get('annualSalary')),
      hoursPerWeek: Number(formData.get('hoursPerWeek')),
      location: formData.get('location') as string,
      startDate: formData.get('startDate') as string,
      employerName: formData.get('employerName') as string || 'Sam Schofield',
    };
    
    const signatureFile = formData.get('employerSignature') as File;
    
    // Validate input
    const validatedData = employeeFormSchema.parse(body);
    
    let signatureUrl = null;
    
    // Upload signature if provided
    if (signatureFile && signatureFile.size > 0) {
      const fileExt = signatureFile.name.split('.').pop();
      const fileName = `employer-signature-${nanoid(10)}.${fileExt}`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('signatures')
        .upload(fileName, signatureFile, {
          cacheControl: '3600',
          upsert: false,
        });
        
      if (uploadError) {
        console.error('Failed to upload signature:', uploadError);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('signatures')
          .getPublicUrl(fileName);
        signatureUrl = publicUrl;
      }
    }
    
    // Create employee record (personal details and bank info will be filled during onboarding)
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        name: validatedData.name,
        email: validatedData.email,
        job_title: validatedData.jobTitle,
        annual_salary: validatedData.annualSalary,
        hours_per_week: validatedData.hoursPerWeek,
        location: validatedData.location,
        start_date: validatedData.startDate,
        employer_name: validatedData.employerName,
        employer_signature_url: signatureUrl,
      })
      .select()
      .single();

    if (employeeError) {
      throw new Error(`Failed to create employee: ${employeeError.message}`);
    }

    // Generate unique token for onboarding
    const token = nanoid(32);
    const expiresAt = addDays(new Date(), 2); // 48 hours

    // Create onboarding session
    const { error: sessionError } = await supabaseAdmin
      .from('onboarding_sessions')
      .insert({
        employee_id: employee.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      throw new Error(`Failed to create onboarding session: ${sessionError.message}`);
    }

    // Generate onboarding URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const onboardingUrl = `${baseUrl}/onboarding/${token}`;

    // Send email notification
    const emailResult = await sendOnboardingEmail(
      validatedData.email,
      validatedData.name,
      onboardingUrl
    );

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
    }

    // Send Telegram notification
    const telegramResult = await sendTelegramNotification(
      validatedData.name,
      validatedData.email,
      onboardingUrl
    );

    if (!telegramResult.success) {
      console.error('Failed to send Telegram notification:', telegramResult.error);
    }

    return NextResponse.json({
      success: true,
      employee,
      onboardingUrl,
      emailSent: emailResult.success,
      telegramSent: telegramResult.success,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}