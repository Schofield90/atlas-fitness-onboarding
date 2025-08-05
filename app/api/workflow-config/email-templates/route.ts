import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the organization ID (using hardcoded for now due to auth issues)
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Check if message_templates table exists
    let templates = [];
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('type', 'email')
        .order('created_at', { ascending: false });

      if (!error && data) {
        templates = data;
      }
    } catch (e) {
      console.log('message_templates table might not exist, using defaults');
    }

    // If no templates, provide some defaults
    if (templates.length === 0) {
      templates = [
        {
          id: 'welcome-email',
          name: 'Welcome Email',
          subject: 'Welcome to Atlas Fitness!',
          content: `Hi {{firstName}},

Welcome to Atlas Fitness! We're excited to have you join our community.

Here's what happens next:
- One of our team members will contact you within 24 hours
- We'll schedule your free consultation
- You'll get a tour of our facilities

Looking forward to helping you achieve your fitness goals!

Best regards,
The Atlas Fitness Team`,
          type: 'email'
        },
        {
          id: 'trial-reminder',
          name: 'Trial Reminder',
          subject: 'Don\'t forget your free trial at Atlas Fitness',
          content: `Hi {{firstName}},

Just a friendly reminder about your upcoming free trial session!

Date: Tomorrow
Time: [Time to be confirmed]
Location: Atlas Fitness

Please bring:
- Comfortable workout clothes
- Water bottle
- Your enthusiasm!

Reply to this email if you need to reschedule.

See you soon!
The Atlas Fitness Team`,
          type: 'email'
        },
        {
          id: 'class-confirmation',
          name: 'Class Booking Confirmation',
          subject: 'Class Booked: {{className}}',
          content: `Hi {{firstName}},

Your class has been booked successfully!

Class: {{className}}
Date: {{classDate}}
Time: {{classTime}}
Instructor: {{instructorName}}
Location: {{location}}

Please arrive 10 minutes early for check-in.

To cancel or reschedule, please give us at least 24 hours notice.

See you there!
The Atlas Fitness Team`,
          type: 'email'
        },
        {
          id: 'membership-welcome',
          name: 'Membership Welcome',
          subject: 'Welcome to the Atlas Fitness Family!',
          content: `Hi {{firstName}},

Congratulations on becoming an Atlas Fitness member!

Your membership details:
- Plan: {{membershipPlan}}
- Start Date: {{startDate}}
- Monthly Payment: {{monthlyPayment}}

What's included:
- Unlimited gym access
- All group classes
- Member rewards program
- Exclusive member events

Download our app to:
- Book classes
- Track your progress
- Connect with trainers

Need help getting started? Book a free orientation session with one of our trainers.

Welcome to the family!
The Atlas Fitness Team`,
          type: 'email'
        }
      ];
    }

    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        subject: template.subject || template.name,
        preview: template.content ? template.content.substring(0, 100) + '...' : '',
        variables: extractVariables(template.content || ''),
        type: template.type || 'email'
      })),
      summary: {
        total: templates.length,
        hasCustom: templates.some(t => !t.id.includes('-'))
      }
    });

  } catch (error) {
    console.error('Error in workflow config email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates', details: error.message },
      { status: 500 }
    );
  }
}

function extractVariables(content: string): string[] {
  const regex = /{{(\w+)}}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}