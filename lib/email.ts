import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOnboardingEmail(
  to: string,
  employeeName: string,
  onboardingUrl: string
) {
  try {
    console.log('Attempting to send onboarding email to:', to);
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('RESEND_API_KEY value:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    
    const { data, error } = await resend.emails.send({
      from: 'Atlas Fitness <onboarding@resend.dev>',
      to: [to],
      subject: 'Welcome to Atlas Fitness - Complete Your Onboarding',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f3f4f6; padding: 30px; }
              .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Atlas Fitness!</h1>
              </div>
              <div class="content">
                <p>Dear ${employeeName},</p>
                
                <p>We're excited to have you join the Atlas Fitness team!</p>
                
                <p>To complete your onboarding process, please click the link below to review and sign your employment documents:</p>
                
                <p style="text-align: center;">
                  <a href="${onboardingUrl}" class="button">Complete Onboarding</a>
                </p>
                
                <p><strong>Important:</strong> This link will expire in 48 hours. Please complete your onboarding as soon as possible.</p>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>The Atlas Fitness Team</p>
              </div>
              <div class="footer">
                <p>Schofield Fitness Ltd trading as Atlas Fitness</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

export async function sendCompletedDocumentsEmail(
  employeeName: string,
  employeeEmail: string,
  pdfAttachments: Array<{
    filename: string;
    content: Buffer;
  }>
) {
  try {
    console.log('Attempting to send completed documents email for:', employeeName);
    console.log('PDF attachments count:', pdfAttachments.length);
    
    const { data, error } = await resend.emails.send({
      from: 'Atlas Fitness <onboarding@resend.dev>',
      to: ['sam@atlas-gyms.co.uk'], // Updated to your actual email
      subject: `Completed Onboarding Documents - ${employeeName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f3f4f6; padding: 30px; }
              .info-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Onboarding Completed</h1>
              </div>
              <div class="content">
                <h2>New Employee Onboarding Completed</h2>
                
                <div class="info-box">
                  <h3>Employee Details:</h3>
                  <p><strong>Name:</strong> ${employeeName}</p>
                  <p><strong>Email:</strong> ${employeeEmail}</p>
                  <p><strong>Completed:</strong> ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
                </div>
                
                <p>The employee has successfully completed their onboarding and signed all employment documents.</p>
                
                <p><strong>Attached Documents:</strong></p>
                <ul>
                  <li>Statement of Main Terms of Employment</li>
                  <li>Restrictive Covenant Agreement</li>
                  <li>Deductions from Pay Agreement</li>
                </ul>
                
                <p>Please save these documents to the employee's HR file.</p>
              </div>
              <div class="footer">
                <p>Atlas Fitness Onboarding System</p>
                <p>This is an automated notification.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      attachments: pdfAttachments.map(pdf => ({
        filename: pdf.filename,
        content: pdf.content,
      })),
    });

    if (error) {
      console.error('Resend API error for completed documents:', error);
      throw error;
    }

    console.log('Completed documents email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send completed documents email:', error);
    return { success: false, error };
  }
}