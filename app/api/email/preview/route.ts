import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subject, content, template } = await request.json();

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process template variables with test data
    const testVariables: Record<string, string> = {
      name: 'John Smith',
      class_name: 'HIIT Training',
      location: 'Main Studio',
      date_time: new Date().toLocaleString('en-GB'),
      time: '10:00 AM',
      instructor: 'Sarah Johnson',
      phone: '+44 20 1234 5678',
      booking_link: 'https://atlas-fitness.com/book',
      membership_link: 'https://atlas-fitness.com/membership',
      signup_link: 'https://atlas-fitness.com/signup',
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
    };

    // Replace template variables
    let processedSubject = subject;
    let processedContent = content;
    
    Object.entries(testVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedSubject = processedSubject.replace(regex, value);
      processedContent = processedContent.replace(regex, value);
    });

    // Generate HTML version
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${processedSubject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Atlas Fitness</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Fitness Journey Starts Here</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              ${processedContent.split('\n').map(line => {
                if (line.trim().startsWith('-')) {
                  return `<li style="margin: 8px 0; color: #333;">${line.substring(1).trim()}</li>`;
                } else if (line.trim()) {
                  if (line.includes('�')) {
                    return `<p style="margin: 15px 0; color: #333; font-size: 16px;">${line}</p>`;
                  }
                  return `<p style="margin: 15px 0; color: #555; line-height: 1.6;">${line}</p>`;
                } else {
                  return '<br/>';
                }
              }).join('')}
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                <strong>Atlas Fitness</strong><br/>
                123 Fitness Street, London, UK<br/>
                📞 +44 20 1234 5678 | ✉️ info@atlas-fitness.com
              </p>
              <div style="margin: 15px 0;">
                <a href="#" style="text-decoration: none; color: #667eea; margin: 0 10px;">Website</a>
                <a href="#" style="text-decoration: none; color: #667eea; margin: 0 10px;">Instagram</a>
                <a href="#" style="text-decoration: none; color: #667eea; margin: 0 10px;">Facebook</a>
              </div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                © 2025 Atlas Fitness. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate plain text version
    const text = `${processedSubject}\n${'='.repeat(processedSubject.length)}\n\n${processedContent}\n\n---\nAtlas Fitness\n123 Fitness Street, London, UK\n+44 20 1234 5678\ninfo@atlas-fitness.com\n\n© 2025 Atlas Fitness. All rights reserved.`;

    return NextResponse.json({
      success: true,
      html,
      text,
      subject: processedSubject,
    });
  } catch (error: any) {
    console.error('Email preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate preview' },
      { status: 500 }
    );
  }
}