import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function addToCampaignAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.campaignId || (!parameters.leadId && !parameters.leadEmail)) {
    throw new Error('Campaign ID and either lead ID or email are required');
  }
  
  try {
    const campaignId = interpolateValue(parameters.campaignId, context);
    
    // Find lead
    let leadId;
    if (parameters.leadId) {
      leadId = interpolateValue(parameters.leadId, context);
    } else {
      const email = interpolateValue(parameters.leadEmail, context);
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .eq('organization_id', context.organizationId)
        .single();
      
      if (!lead) throw new Error('Lead not found');
      leadId = lead.id;
    }
    
    // Check if campaign exists
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaignId)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'active') {
      throw new Error('Campaign is not active');
    }
    
    // Check if already in campaign
    const { data: existing } = await supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('lead_id', leadId)
      .single();
    
    if (existing) {
      return {
        success: true,
        output: {
          action: 'already_in_campaign',
          campaignId,
          leadId,
          membershipId: existing.id
        }
      };
    }
    
    // Add to campaign
    const { data: membership, error } = await supabase
      .from('campaign_members')
      .insert({
        campaign_id: campaignId,
        lead_id: leadId,
        organization_id: context.organizationId,
        status: 'active',
        added_by: 'workflow',
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update campaign statistics
    await supabase.rpc('update_campaign_stats', { 
      campaign_id: campaignId 
    });
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'campaign',
        entity_id: campaignId,
        action: 'member_added',
        details: {
          leadId,
          addedBy: 'workflow',
          workflowId: context.workflowId
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        action: 'added_to_campaign',
        campaignId,
        campaignName: campaign.name,
        leadId,
        membershipId: membership.id,
        addedAt: membership.created_at
      }
    };
    
  } catch (error) {
    console.error('Add to campaign action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function removeFromCampaignAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.campaignId || (!parameters.leadId && !parameters.leadEmail)) {
    throw new Error('Campaign ID and either lead ID or email are required');
  }
  
  try {
    const campaignId = interpolateValue(parameters.campaignId, context);
    
    // Find lead
    let leadId;
    if (parameters.leadId) {
      leadId = interpolateValue(parameters.leadId, context);
    } else {
      const email = interpolateValue(parameters.leadEmail, context);
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .eq('organization_id', context.organizationId)
        .single();
      
      if (!lead) throw new Error('Lead not found');
      leadId = lead.id;
    }
    
    // Find membership
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('lead_id', leadId)
      .single();
    
    if (!membership) {
      return {
        success: true,
        output: {
          action: 'not_in_campaign',
          campaignId,
          leadId
        }
      };
    }
    
    // Remove from campaign
    const { error } = await supabase
      .from('campaign_members')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
        removed_reason: parameters.reason || 'workflow_action',
        metadata: {
          ...membership.metadata,
          removedBy: 'workflow',
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      })
      .eq('id', membership.id);
    
    if (error) throw error;
    
    // Update campaign statistics
    await supabase.rpc('update_campaign_stats', { 
      campaign_id: campaignId 
    });
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'campaign',
        entity_id: campaignId,
        action: 'member_removed',
        details: {
          leadId,
          removedBy: 'workflow',
          reason: parameters.reason || 'workflow_action',
          workflowId: context.workflowId
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        action: 'removed_from_campaign',
        campaignId,
        leadId,
        membershipId: membership.id,
        removedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Remove from campaign action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function removeFromAllCampaignsAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  const supabase = createAdminClient();
  
  if (!parameters.leadId && !parameters.leadEmail) {
    throw new Error('Either lead ID or email is required');
  }
  
  try {
    // Find lead
    let leadId;
    if (parameters.leadId) {
      leadId = interpolateValue(parameters.leadId, context);
    } else {
      const email = interpolateValue(parameters.leadEmail, context);
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .eq('organization_id', context.organizationId)
        .single();
      
      if (!lead) throw new Error('Lead not found');
      leadId = lead.id;
    }
    
    // Get all active campaign memberships
    const { data: memberships } = await supabase
      .from('campaign_members')
      .select('id, campaign_id')
      .eq('lead_id', leadId)
      .eq('status', 'active');
    
    if (!memberships || memberships.length === 0) {
      return {
        success: true,
        output: {
          action: 'no_active_campaigns',
          leadId,
          removedCount: 0
        }
      };
    }
    
    // Remove from all campaigns
    const { error } = await supabase
      .from('campaign_members')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
        removed_reason: parameters.reason || 'workflow_remove_all',
        metadata: {
          removedBy: 'workflow',
          workflowId: context.workflowId,
          executionId: context.executionId
        }
      })
      .eq('lead_id', leadId)
      .eq('status', 'active');
    
    if (error) throw error;
    
    // Update statistics for all affected campaigns
    for (const membership of memberships) {
      await supabase.rpc('update_campaign_stats', { 
        campaign_id: membership.campaign_id 
      });
    }
    
    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        organization_id: context.organizationId,
        entity_type: 'lead',
        entity_id: leadId,
        action: 'removed_from_all_campaigns',
        details: {
          campaignIds: memberships.map(m => m.campaign_id),
          removedCount: memberships.length,
          reason: parameters.reason || 'workflow_remove_all',
          workflowId: context.workflowId
        },
        user_id: 'system'
      });
    
    return {
      success: true,
      output: {
        action: 'removed_from_all_campaigns',
        leadId,
        removedCount: memberships.length,
        campaignIds: memberships.map(m => m.campaign_id),
        removedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Remove from all campaigns action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}