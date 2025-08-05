import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Verify Facebook webhook signature
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  if (!process.env.FACEBOOK_APP_SECRET) {
    console.warn('FACEBOOK_APP_SECRET not configured, skipping verification');
    return true; // Skip verification in development
  }

  const headersList = await headers();
  const signature = headersList.get('x-hub-signature-256');
  
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(body)
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// GET request for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if this is a subscribe request
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('Facebook webhook verified');
      return new Response(challenge, { status: 200 });
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      return new Response('Forbidden', { status: 403 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

// POST request for lead form submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('Invalid Facebook webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('Facebook webhook received:', JSON.stringify(data, null, 2));

    // Handle different webhook events
    if (data.object === 'page') {
      const supabase = createAdminClient();

      // Process each entry
      for (const entry of data.entry) {
        // Check if this is a leadgen event
        const leadgenData = entry.changes?.find((change: any) => change.field === 'leadgen');
        
        if (leadgenData) {
          const leadFormId = leadgenData.value.form_id;
          const leadId = leadgenData.value.leadgen_id;
          const pageId = leadgenData.value.page_id;
          const createdTime = new Date(leadgenData.value.created_time * 1000);
          
          console.log(`New lead from form ${leadFormId}: ${leadId}`);
          
          // TODO: Use Facebook Graph API to fetch full lead details
          // For now, we'll create a placeholder lead
          
          // Find the form in our database
          const { data: form } = await supabase
            .from('forms')
            .select('*')
            .eq('external_id', leadFormId)
            .single();

          if (!form) {
            console.error(`Form not found for Facebook form ID: ${leadFormId}`);
            continue;
          }

          // Create lead with placeholder data
          // In production, you'd fetch the actual lead data from Facebook
          const leadData = {
            first_name: 'Facebook',
            last_name: 'Lead',
            name: 'Facebook Lead', // This will be updated when we fetch real data
            email: `lead-${leadId}@facebook.com`, // Placeholder
            phone: '+447000000000', // Placeholder
            source: 'facebook',
            form_id: leadFormId,
            form_name: form.name,
            organization_id: form.organization_id,
            external_id: leadId,
            metadata: {
              page_id: pageId,
              created_time: createdTime,
              facebook_lead_id: leadId,
              facebook_form_id: leadFormId
            }
          };

          // Insert lead
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert(leadData)
            .select()
            .single();

          if (leadError) {
            console.error('Error creating lead:', leadError);
            continue;
          }

          console.log('Lead created:', newLead);

          // Trigger workflows for new Facebook lead
          try {
            const workflowResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/lead-created`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lead: newLead,
                  organizationId: form.organization_id,
                  source: 'facebook'
                })
              }
            );

            if (!workflowResponse.ok) {
              console.error('Failed to trigger lead created webhook');
            }
          } catch (workflowError) {
            console.error('Error triggering workflow:', workflowError);
          }

          // Also trigger form submitted workflow
          try {
            const formWorkflowResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/form-submitted`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formId: leadFormId,
                  formData: leadData,
                  lead: newLead,
                  organizationId: form.organization_id,
                  formType: 'facebook'
                })
              }
            );

            if (!formWorkflowResponse.ok) {
              console.error('Failed to trigger form submitted webhook');
            }
          } catch (formWorkflowError) {
            console.error('Error triggering form workflow:', formWorkflowError);
          }
        }
      }

      // Always respond with 200 OK to acknowledge receipt
      return NextResponse.json({ received: true });
    }

    // Not a page object, still acknowledge
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Facebook webhook error:', error);
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({ received: true, error: 'Internal error' });
  }
}