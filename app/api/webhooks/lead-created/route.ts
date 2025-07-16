import { NextRequest, NextResponse } from 'next/server';
import { SimpleAutomationEngine } from '@/lib/automation/simple-automation-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, event_type } = body;

    // Verify this is a lead creation event
    if (event_type !== 'INSERT' || !lead_id) {
      return NextResponse.json({ error: 'Invalid webhook event' }, { status: 400 });
    }

    console.log(`Processing new lead webhook: ${lead_id}`);

    // Trigger lead follow-up automation immediately
    const result = await SimpleAutomationEngine.processNewLead(lead_id);

    if (result.success) {
      console.log(`Lead automation completed successfully for ${lead_id}:`, {
        actions_completed: result.actions_completed,
        sms_sent: result.sms_sent,
        execution_time_ms: result.execution_time_ms
      });

      // Update lead response tracking with initial contact time
      if (result.sms_sent > 0) {
        await SimpleAutomationEngine.updateLeadResponseTime(lead_id, 'sms');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Lead automation triggered successfully',
        result 
      });
    } else {
      console.error(`Lead automation failed for ${lead_id}:`, result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing lead webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Also handle manual triggering for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');

  if (!leadId) {
    return NextResponse.json({ error: 'lead_id parameter required' }, { status: 400 });
  }

  try {
    console.log(`Manual trigger for lead: ${leadId}`);
    const result = await SimpleAutomationEngine.processNewLead(leadId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Lead automation triggered manually',
      result 
    });
  } catch (error) {
    console.error('Error in manual lead trigger:', error);
    return NextResponse.json({ 
      error: 'Failed to trigger lead automation' 
    }, { status: 500 });
  }
}