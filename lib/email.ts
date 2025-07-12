import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOnboardingEmail(
  to: string,
  employeeName: string,
  onboardingUrl: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Atlas Fitness <onboarding@atlasfitness.co.uk>',
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
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}