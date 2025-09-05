import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // If Resend is not configured, just log and return success
    if (!resend) {
      console.log('Contact sales form submission (Resend not configured):', data);
      return NextResponse.json({
        success: true,
        message: 'Thank you for your interest. We will contact you soon.'
      });
    }
    
    // Send email to sales team
    await resend.emails.send({
      from: 'GymLeadHub Sales <sales@gymleadhub.co.uk>',
      to: 'sam@gymleadhub.co.uk',
      subject: `Enterprise Inquiry: ${data.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Enterprise Sales Inquiry</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Company:</strong> ${data.company}</p>
            <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Business Details</h3>
            <p><strong>Number of Gyms:</strong> ${data.gymCount || 'Not specified'}</p>
            <p><strong>Total Members:</strong> ${data.memberCount || 'Not specified'}</p>
          </div>
          
          ${data.message ? `
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Message</h3>
            <p>${data.message}</p>
          </div>
          ` : ''}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            This inquiry was submitted through the GymLeadHub Enterprise contact form.
          </p>
        </div>
      `,
    });
    
    // Send confirmation email to prospect
    await resend.emails.send({
      from: 'GymLeadHub <noreply@gymleadhub.co.uk>',
      to: data.email,
      subject: 'We received your inquiry - GymLeadHub Enterprise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your interest in GymLeadHub Enterprise!</h2>
          
          <p>Hi ${data.name},</p>
          
          <p>We've received your inquiry and are excited to discuss how GymLeadHub can help transform your gym business.</p>
          
          <p>One of our enterprise specialists will reach out to you within the next 24 hours to:</p>
          
          <ul>
            <li>Understand your specific needs and challenges</li>
            <li>Demonstrate how GymLeadHub can address them</li>
            <li>Provide custom pricing based on your requirements</li>
            <li>Answer any questions you may have</li>
          </ul>
          
          <p>In the meantime, here's what makes GymLeadHub Enterprise special:</p>
          
          <ul>
            <li><strong>Unlimited Scale:</strong> No limits on members, staff, or usage</li>
            <li><strong>Multi-Location:</strong> Manage all your gyms from one dashboard</li>
            <li><strong>Custom Integrations:</strong> Connect with your existing systems</li>
            <li><strong>Dedicated Support:</strong> Your own account manager</li>
            <li><strong>White-Label Options:</strong> Make it truly yours</li>
          </ul>
          
          <p>If you need immediate assistance, feel free to call us at +44 7490 253471.</p>
          
          <p>Looking forward to speaking with you soon!</p>
          
          <p>Best regards,<br>
          The GymLeadHub Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 12px;">
            GymLeadHub - The Complete Gym Management Platform<br>
            © 2025 GymLeadHub. All rights reserved.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending contact sales email:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}