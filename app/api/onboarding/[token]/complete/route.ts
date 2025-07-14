import { NextRequest, NextResponse } from 'next/server';
import { onboardingSubmissionSchema } from '@/lib/validations';
import { supabaseAdmin } from '@/lib/supabase';
import { generatePDFBlob } from '@/lib/documents/pdf-generator';
// Google Drive functionality temporarily disabled
import { sendCompletedDocumentsEmail } from '@/lib/email';
import {
  getStatementOfTermsContent,
  getRestrictiveCovenantContent,
  getDeductionsAgreementContent,
  EmployeeDetails,
} from '@/lib/documents/templates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const formData = await request.formData();
    
    // Extract form fields
    const body = {
      acceptTerms: formData.get('acceptTerms') === 'true',
      acceptRestrictive: formData.get('acceptRestrictive') === 'true',
      acceptDeductions: formData.get('acceptDeductions') === 'true',
      signatureName: formData.get('signatureName') as string,
      signatureDate: formData.get('signatureDate') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      postcode: formData.get('postcode') as string,
      nationalInsuranceNumber: formData.get('nationalInsuranceNumber') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      bankName: formData.get('bankName') as string,
      accountHolderName: formData.get('accountHolderName') as string,
      accountNumber: formData.get('accountNumber') as string,
      sortCode: formData.get('sortCode') as string,
    };
    
    const signatureFile = formData.get('employeeSignature') as File;

    // Validate submission data
    const validatedData = onboardingSubmissionSchema.parse(body);

    // Fetch session and employee data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('onboarding_sessions')
      .select(`
        *,
        employees (*)
      `)
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid onboarding session' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (session.completed) {
      return NextResponse.json(
        { error: 'Onboarding already completed' },
        { status: 400 }
      );
    }

    // Check expiration
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Onboarding link has expired' },
        { status: 410 }
      );
    }

    // Handle employee signature upload
    let employeeSignatureUrl = null;
    if (signatureFile && signatureFile.size > 0) {
      const { nanoid } = await import('nanoid');
      const fileExt = signatureFile.name.split('.').pop();
      const fileName = `employee-signature-${nanoid(10)}.${fileExt}`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('signatures')
        .upload(fileName, signatureFile, {
          cacheControl: '3600',
          upsert: false,
        });
        
      if (uploadError) {
        console.error('Failed to upload employee signature:', uploadError);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('signatures')
          .getPublicUrl(fileName);
        employeeSignatureUrl = publicUrl;
      }
    }

    const employee: EmployeeDetails = {
      name: session.employees.name,
      email: session.employees.email,
      jobTitle: session.employees.job_title,
      annualSalary: session.employees.annual_salary,
      hoursPerWeek: session.employees.hours_per_week,
      location: session.employees.location,
      startDate: session.employees.start_date,
      onboardingCreatedDate: session.created_at, // Use the session creation date
      employerName: session.employees.employer_name,
      employerSignatureUrl: session.employees.employer_signature_url,
    };

    // Update employee record with personal details and bank information
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        phone: validatedData.phone,
        address: validatedData.address,
        postcode: validatedData.postcode,
        national_insurance_number: validatedData.nationalInsuranceNumber,
        date_of_birth: validatedData.dateOfBirth,
        bank_name: validatedData.bankName,
        account_holder_name: validatedData.accountHolderName,
        account_number: validatedData.accountNumber,
        sort_code: validatedData.sortCode,
      })
      .eq('id', session.employees.id);

    if (updateError) {
      console.error('Failed to update employee details:', updateError);
      return NextResponse.json(
        { error: 'Failed to save employee details' },
        { status: 500 }
      );
    }

    // Generate PDFs
    const documents = [
      {
        title: 'Statement of Main Terms of Employment',
        content: getStatementOfTermsContent(employee),
        fileName: `${employee.name} - Statement of Terms - ${new Date().toISOString().split('T')[0]}.pdf`,
      },
      {
        title: 'Restrictive Covenant Agreement',
        content: getRestrictiveCovenantContent(employee),
        fileName: `${employee.name} - Restrictive Covenant - ${new Date().toISOString().split('T')[0]}.pdf`,
      },
      {
        title: 'Deductions from Pay Agreement',
        content: getDeductionsAgreementContent(employee),
        fileName: `${employee.name} - Deductions Agreement - ${new Date().toISOString().split('T')[0]}.pdf`,
      },
    ];

    // Generate PDFs and prepare for email
    const pdfAttachments = [];
    
    for (const doc of documents) {
      try {
        // Generate PDF blob
        const pdfBlob = await generatePDFBlob({
          content: doc.content,
          title: doc.title,
          signatureName: validatedData.signatureName,
          signatureDate: validatedData.signatureDate,
          employerName: employee.employerName,
          employerSignatureUrl: employee.employerSignatureUrl,
          employerSignatureDate: employee.onboardingCreatedDate,
          employeeSignatureUrl: employeeSignatureUrl,
        });

        // Convert blob to buffer
        const buffer = Buffer.from(await pdfBlob.arrayBuffer());

        pdfAttachments.push({
          filename: doc.fileName,
          content: buffer,
        });
      } catch (error) {
        console.error(`Failed to generate PDF for ${doc.title}:`, error);
      }
    }

    // Send PDFs via email to admin
    const emailResult = await sendCompletedDocumentsEmail(
      employee.name,
      employee.email,
      pdfAttachments
    );

    // Update onboarding session
    const { error: sessionUpdateError } = await supabaseAdmin
      .from('onboarding_sessions')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        signature_name: validatedData.signatureName,
        signature_date: validatedData.signatureDate,
        documents_saved: emailResult.success,
      })
      .eq('id', session.id);

    if (sessionUpdateError) {
      console.error('Failed to update session:', sessionUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      emailSent: emailResult.success,
      documentsGenerated: pdfAttachments.length,
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    
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