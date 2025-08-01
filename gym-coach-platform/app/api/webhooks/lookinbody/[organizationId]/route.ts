import { NextRequest, NextResponse } from 'next/server';
import { LookInBodyService } from '@/lib/services/lookinbody/LookInBodyService';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  const organizationId = params.organizationId;
  console.log(`Received LookInBody webhook for organization: ${organizationId}`);

  try {
    // Create admin Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verify organization exists and has LookInBody configured
    const { data: orgConfig, error: configError } = await supabase
      .from('lookinbody_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (configError || !orgConfig) {
      console.error('Organization not found or LookInBody not configured:', configError);
      return NextResponse.json(
        { error: 'Organization not found or LookInBody not configured' },
        { status: 404 }
      );
    }

    // Get webhook signature from headers
    const signature = request.headers.get('x-lookinbody-signature') || 
                     request.headers.get('x-webhook-signature') || '';

    // Parse request body
    const body = await request.json();

    // Initialize LookInBody service for this organization
    const lookInBodyService = new LookInBodyService(organizationId);
    await lookInBodyService.initialize();

    // Process the webhook data
    try {
      const scan = await lookInBodyService.processWebhookData(body, signature);
      
      console.log(`Successfully processed scan ${scan.id} for organization ${organizationId}`);

      // Check if we need to trigger any automation workflows
      const { data: alerts } = await supabase
        .from('body_composition_alerts')
        .select('*')
        .eq('scan_id', scan.id)
        .eq('status', 'active');

      if (alerts && alerts.length > 0) {
        // Trigger automation workflows based on alerts
        await triggerAutomationWorkflows(scan, alerts, organizationId, supabase);
      }

      return NextResponse.json({
        status: 'success',
        scan_id: scan.id,
        alerts_generated: alerts?.length || 0,
        organization_id: organizationId
      });

    } catch (error: any) {
      console.error('Error processing webhook data:', error);
      
      // Check if it's a client not found error
      if (error.message === 'No matching client found') {
        // Log unmatched scan for manual review
        await logUnmatchedScan(body, organizationId, supabase);
        
        return NextResponse.json({
          status: 'no_match',
          message: 'No client found with this phone number',
          phone: body.user_token,
          organization_id: organizationId
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Log unmatched scans for manual review
async function logUnmatchedScan(
  webhookData: any,
  organizationId: string,
  supabase: any
) {
  try {
    await supabase
      .from('unmatched_scans_log')
      .insert({
        organization_id: organizationId,
        phone_number: webhookData.user_token,
        scan_data: webhookData,
        webhook_received_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log unmatched scan:', error);
  }
}

// Trigger automation workflows based on alerts
async function triggerAutomationWorkflows(
  scan: any,
  alerts: any[],
  organizationId: string,
  supabase: any
) {
  for (const alert of alerts) {
    // Check for automation rules based on alert type
    const { data: automations } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('trigger_type', 'body_composition_alert')
      .eq('is_active', true)
      .contains('trigger_conditions', { alert_type: alert.alert_type });

    for (const automation of automations || []) {
      // Create automation job
      await supabase
        .from('automation_jobs')
        .insert({
          organization_id: organizationId,
          automation_rule_id: automation.id,
          trigger_data: {
            scan_id: scan.id,
            alert_id: alert.id,
            client_id: scan.client_id
          },
          status: 'pending'
        });
    }

    // Send immediate notifications for high severity alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      await sendImmediateNotification(alert, scan, organizationId, supabase);
    }
  }
}

// Send immediate notifications for critical alerts
async function sendImmediateNotification(
  alert: any,
  scan: any,
  organizationId: string,
  supabase: any
) {
  try {
    // Get client and assigned trainer details
    const { data: client } = await supabase
      .from('clients')
      .select('*, assigned_trainer:assigned_to(id, name, email)')
      .eq('id', scan.client_id)
      .single();

    if (client?.assigned_trainer) {
      // Create notification for trainer
      await supabase
        .from('notifications')
        .insert({
          organization_id: organizationId,
          user_id: client.assigned_trainer.id,
          type: 'body_composition_alert',
          title: alert.title,
          message: `${client.name}: ${alert.message}`,
          data: {
            alert_id: alert.id,
            scan_id: scan.id,
            client_id: client.id
          },
          priority: alert.severity
        });

      // Mark alert as trainer notified
      await supabase
        .from('body_composition_alerts')
        .update({ trainer_notified: true })
        .eq('id', alert.id);
    }
  } catch (error) {
    console.error('Failed to send immediate notification:', error);
  }
}

// Webhook endpoint for testing
export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  return NextResponse.json({
    status: 'ok',
    message: 'LookInBody webhook endpoint',
    organization_id: params.organizationId,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/webhooks/lookinbody/${params.organizationId}`
  });
}