import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';

export async function waitAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.duration || !parameters.unit) {
    throw new Error('Duration and unit are required for wait action');
  }
  
  try {
    const duration = Number(interpolateValue(parameters.duration, context));
    const unit = parameters.unit;
    
    if (isNaN(duration) || duration <= 0) {
      throw new Error('Duration must be a positive number');
    }
    
    // Convert to milliseconds
    const delayMs = convertToMilliseconds(duration, unit);
    
    // Check for business hours constraint
    if (parameters.businessHoursOnly) {
      const adjustedDelay = await calculateBusinessHoursDelay(
        delayMs,
        context.organizationId
      );
      
      return {
        success: true,
        output: {
          action: 'wait_scheduled',
          originalDelay: delayMs,
          adjustedDelay,
          resumeAt: new Date(Date.now() + adjustedDelay).toISOString(),
          businessHoursOnly: true
        },
        nextNodes: [],
        shouldContinue: false
      };
    }
    
    return {
      success: true,
      output: {
        action: 'wait_scheduled',
        delayMs,
        resumeAt: new Date(Date.now() + delayMs).toISOString(),
        businessHoursOnly: false
      },
      nextNodes: [],
      shouldContinue: false
    };
    
  } catch (error) {
    console.error('Wait action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function scheduleAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.scheduleType) {
    throw new Error('Schedule type is required');
  }
  
  try {
    let scheduledTime: Date;
    
    switch (parameters.scheduleType) {
      case 'specific':
        if (!parameters.dateTime) {
          throw new Error('DateTime is required for specific schedule');
        }
        const dateTimeStr = interpolateValue(parameters.dateTime, context);
        scheduledTime = new Date(dateTimeStr);
        if (isNaN(scheduledTime.getTime())) {
          throw new Error('Invalid date/time format');
        }
        break;
        
      case 'relative':
        if (!parameters.offset || !parameters.offsetUnit) {
          throw new Error('Offset and unit are required for relative schedule');
        }
        const offset = Number(interpolateValue(parameters.offset, context));
        const offsetMs = convertToMilliseconds(offset, parameters.offsetUnit);
        scheduledTime = new Date(Date.now() + offsetMs);
        break;
        
      case 'nextBusinessDay':
        scheduledTime = await getNextBusinessDay(
          parameters.time || '09:00',
          context.organizationId
        );
        break;
        
      case 'cron':
        if (!parameters.cronExpression) {
          throw new Error('Cron expression is required');
        }
        scheduledTime = getNextCronOccurrence(parameters.cronExpression);
        break;
        
      default:
        throw new Error(`Unknown schedule type: ${parameters.scheduleType}`);
    }
    
    const delayMs = scheduledTime.getTime() - Date.now();
    
    if (delayMs <= 0) {
      throw new Error('Scheduled time must be in the future');
    }
    
    return {
      success: true,
      output: {
        action: 'scheduled',
        scheduleType: parameters.scheduleType,
        scheduledFor: scheduledTime.toISOString(),
        delayMs,
        timezone: parameters.timezone || 'UTC'
      },
      nextNodes: [],
      shouldContinue: false
    };
    
  } catch (error) {
    console.error('Schedule action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function convertToMilliseconds(value: number, unit: string): number {
  const multipliers: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000
  };
  
  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(`Unknown time unit: ${unit}`);
  }
  
  return value * multiplier;
}

async function calculateBusinessHoursDelay(
  delayMs: number,
  organizationId: string
): Promise<number> {
  // This would fetch organization's business hours from database
  // For now, using default business hours (9 AM - 5 PM, Mon-Fri)
  const now = new Date();
  const targetTime = new Date(now.getTime() + delayMs);
  
  // Simple implementation - would be more complex in production
  const businessStart = 9; // 9 AM
  const businessEnd = 17; // 5 PM
  
  // Check if target time falls outside business hours
  const targetHour = targetTime.getHours();
  const targetDay = targetTime.getDay();
  
  // If weekend, move to Monday
  if (targetDay === 0 || targetDay === 6) {
    const daysToMonday = targetDay === 0 ? 1 : 2;
    targetTime.setDate(targetTime.getDate() + daysToMonday);
    targetTime.setHours(businessStart, 0, 0, 0);
  }
  // If after business hours, move to next business day
  else if (targetHour >= businessEnd) {
    targetTime.setDate(targetTime.getDate() + 1);
    targetTime.setHours(businessStart, 0, 0, 0);
  }
  // If before business hours, move to start of business
  else if (targetHour < businessStart) {
    targetTime.setHours(businessStart, 0, 0, 0);
  }
  
  return targetTime.getTime() - now.getTime();
}

async function getNextBusinessDay(
  time: string,
  organizationId: string
): Promise<Date> {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const nextDay = new Date(now);
  
  // Move to next day
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(hours, minutes, 0, 0);
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

function getNextCronOccurrence(cronExpression: string): Date {
  // This would use a cron parser library in production
  // Simplified implementation for demo
  const now = new Date();
  
  // Parse basic cron patterns
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression');
  }
  
  // For demo, just add 1 day
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  
  return next;
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