import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getMetaAdsClient } from '@/lib/integrations/meta-ads';
import { z } from 'zod';
import crypto from 'crypto';

const webhookEventSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    time: z.number(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.object({
        leadgen_id: z.string(),
        page_id: z.string(),
        form_id: z.string(),
        adgroup_id: z.string(),
        ad_id: z.string(),
        created_time: z.number(),
      }),
    })),
  })),
});

// GET /api/webhooks/meta - Webhook verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the webhook
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      console.log('Meta webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error('Meta webhook verification failed');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error in Meta webhook verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/webhooks/meta - Handle webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event = webhookEventSchema.parse(JSON.parse(body));

    // Process each entry
    for (const entry of event.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          await processLeadgenEvent(change.value);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Meta webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processLeadgenEvent(leadData: Record<string, any>) {
  try {
    // Find the integration based on the ad_id
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('meta_campaign_id', leadData.adgroup_id)
      .single();

    if (!campaign) {
      console.error('Campaign not found for lead:', leadData.leadgen_id);
      return;
    }

    // Get the integration for this organization
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('organization_id', campaign.organization_id)
      .eq('platform', 'meta')
      .single();

    if (!integration || !integration.access_token) {
      console.error('Meta integration not found for organization:', campaign.organization_id);
      return;
    }

    // Get lead details from Meta API
    const metaClient = getMetaAdsClient(integration.account_id);
    const leads = await metaClient.getLeads(leadData.form_id);
    const lead = leads.find(l => l.id === leadData.leadgen_id);

    if (!lead) {
      console.error('Lead not found in Meta API:', leadData.leadgen_id);
      return;
    }

    // Parse lead field data
    const leadFields = parseLeadFields(lead.field_data);

    // Map Meta lead to our lead format
    const leadRecord = {
      organization_id: campaign.organization_id,
      first_name: leadFields.first_name || '',
      last_name: leadFields.last_name || '',
      email: leadFields.email || null,
      phone: leadFields.phone || null,
      source: 'facebook',
      status: 'new',
      campaign_id: campaign.id,
      meta_lead_id: lead.id,
      meta_campaign_id: leadData.adgroup_id,
      meta_ad_id: leadData.ad_id,
      meta_form_id: leadData.form_id,
      goals: leadFields.goals || null,
      budget: leadFields.budget || null,
      preferred_contact_method: leadFields.preferred_contact_method || null,
      availability: leadFields.availability || null,
      experience_level: leadFields.experience_level || null,
      medical_conditions: leadFields.medical_conditions || null,
      custom_fields: leadFields.custom || {},
      utm_source: 'facebook',
      utm_medium: 'cpc',
      utm_campaign: campaign.name,
      utm_content: leadData.ad_id,
      tags: ['facebook-lead', 'unqualified'],
      notes: `Lead imported from Facebook campaign "${campaign.name}"`,
      created_at: new Date(lead.created_time).toISOString(),
    };

    // Check if lead already exists
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('meta_lead_id', lead.id)
      .single();

    if (existingLead) {
      console.log('Lead already exists:', lead.id);
      return;
    }

    // Create the lead
    const { data: createdLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert([leadRecord])
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return;
    }

    console.log('Lead created successfully:', createdLead.id);

    // Create activity record
    await supabaseAdmin
      .from('lead_activities')
      .insert([{
        lead_id: createdLead.id,
        user_id: null, // System-generated
        type: 'created',
        subject: 'Lead Created from Facebook',
        content: `Lead imported from Facebook campaign "${campaign.name}"`,
        metadata: {
          source: 'facebook_webhook',
          campaign_id: campaign.id,
          ad_id: leadData.ad_id,
          form_id: leadData.form_id,
          original_fields: lead.field_data,
        },
      }]);

    // Update campaign metrics
    await supabaseAdmin
      .from('campaigns')
      .update({
        metrics: {
          ...campaign.metrics,
          leads: (campaign.metrics?.leads || 0) + 1,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    // Create campaign metric record
    const today = new Date().toISOString().split('T')[0];
    await supabaseAdmin
      .from('campaign_metrics')
      .upsert({
        campaign_id: campaign.id,
        date: today,
        impressions: 0,
        clicks: 0,
        spend: 0,
        leads: 1,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cost_per_lead: 0,
        cost_per_conversion: 0,
        roas: 0,
      }, { 
        onConflict: 'campaign_id,date',
        ignoreDuplicates: false 
      });

    // Auto-assign lead if campaign has assignment rules
    if (campaign.assignment_rules) {
      await autoAssignLead(createdLead.id, campaign.assignment_rules);
    }

    // Trigger AI qualification if enabled
    if (campaign.auto_qualify) {
      await triggerAIQualification(createdLead.id);
    }

  } catch (error) {
    console.error('Error processing leadgen event:', error);
  }
}

function parseLeadFields(fieldData: Array<{ name: string; values: string[] }>): Record<string, any> {
  const fields: Record<string, any> = {};
  const customFields: Record<string, any> = {};

  // Standard field mappings
  const fieldMappings: Record<string, string> = {
    'first_name': 'first_name',
    'last_name': 'last_name',
    'full_name': 'full_name',
    'email': 'email',
    'phone_number': 'phone',
    'phone': 'phone',
    'budget': 'budget',
    'goals': 'goals',
    'fitness_goals': 'goals',
    'preferred_contact_method': 'preferred_contact_method',
    'availability': 'availability',
    'experience_level': 'experience_level',
    'fitness_level': 'experience_level',
    'medical_conditions': 'medical_conditions',
    'health_conditions': 'medical_conditions',
  };

  for (const field of fieldData) {
    const value = field.values && field.values.length > 0 ? field.values[0] : null;
    if (!value) continue;

    const mappedField = fieldMappings[field.name.toLowerCase()];
    if (mappedField) {
      fields[mappedField] = value;
    } else {
      customFields[field.name] = value;
    }
  }

  // Handle full_name split
  if (fields.full_name && !fields.first_name && !fields.last_name) {
    const nameParts = fields.full_name.split(' ');
    fields.first_name = nameParts[0] || '';
    fields.last_name = nameParts.slice(1).join(' ') || '';
  }

  // Add custom fields
  if (Object.keys(customFields).length > 0) {
    fields.custom = customFields;
  }

  return fields;
}

async function autoAssignLead(leadId: string, assignmentRules: Record<string, any>) {
  try {
    // Simple round-robin assignment for now
    if (assignmentRules.type === 'round_robin' && assignmentRules.users) {
      const users = assignmentRules.users;
      const userIndex = Math.floor(Math.random() * users.length);
      const assignedUserId = users[userIndex];

      await supabaseAdmin
        .from('leads')
        .update({
          assigned_to: assignedUserId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      // Create activity record
      await supabaseAdmin
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          user_id: null,
          type: 'assignment',
          subject: 'Lead Auto-Assigned',
          content: `Lead automatically assigned via round-robin`,
          metadata: {
            assignment_type: 'round_robin',
            assigned_to: assignedUserId,
          },
        }]);
    }
  } catch (error) {
    console.error('Error auto-assigning lead:', error);
  }
}

async function triggerAIQualification(leadId: string) {
  try {
    // Trigger AI qualification endpoint
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leads/${leadId}/qualify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auto_qualify: true,
      }),
    });
  } catch (error) {
    console.error('Error triggering AI qualification:', error);
  }
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;

  const webhookSecret = process.env.META_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('META_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}