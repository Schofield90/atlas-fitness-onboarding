import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import { sendEmailAction } from './email-actions';
import { sendSMSAction, sendWhatsAppAction } from './communication-actions';
import { updateLeadAction, createTaskAction, updateOpportunityAction } from './crm-actions';
import { addToCampaignAction, removeFromCampaignAction } from './campaign-actions';
import { createBookingAction, cancelBookingAction } from './booking-actions';
import { sendWebhookAction } from './webhook-actions';
import { waitAction, scheduleAction } from './timing-actions';
import { aiGenerateAction, aiAnalyzeAction } from './ai-actions';
import { conditionalAction, switchAction } from './logic-actions';

export type ActionHandler = (
  config: ActionConfig,
  context: ExecutionContext
) => Promise<NodeExecutionResult>;

const actionHandlers: Record<string, ActionHandler> = {
  // Communication Actions
  'send_email': sendEmailAction,
  'send_sms': sendSMSAction,
  'send_whatsapp': sendWhatsAppAction,
  
  // CRM Actions
  'update_lead': updateLeadAction,
  'create_task': createTaskAction,
  'update_opportunity': updateOpportunityAction,
  
  // Campaign Actions
  'add_to_campaign': addToCampaignAction,
  'remove_from_campaign': removeFromCampaignAction,
  
  // Booking Actions
  'create_booking': createBookingAction,
  'cancel_booking': cancelBookingAction,
  
  // Integration Actions
  'send_webhook': sendWebhookAction,
  
  // Timing Actions
  'wait': waitAction,
  'schedule': scheduleAction,
  
  // AI Actions
  'ai_generate': aiGenerateAction,
  'ai_analyze': aiAnalyzeAction,
  
  // Logic Actions
  'conditional': conditionalAction,
  'switch': switchAction,
};

export async function executeAction(
  actionType: string,
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const handler = actionHandlers[actionType];
  
  if (!handler) {
    throw new Error(`Unknown action type: ${actionType}`);
  }
  
  try {
    const result = await handler(config, context);
    
    // Log action execution
    console.log(`Action ${actionType} executed successfully`, {
      workflowId: context.workflowId,
      executionId: context.executionId,
      result: result.output
    });
    
    return result;
  } catch (error) {
    console.error(`Action ${actionType} failed:`, error);
    throw error;
  }
}

export function getAvailableActions(): string[] {
  return Object.keys(actionHandlers);
}

export function registerActionHandler(
  actionType: string,
  handler: ActionHandler
): void {
  actionHandlers[actionType] = handler;
}