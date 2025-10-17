import { z } from 'zod'

// Base node configuration schema
export const baseNodeSchema = z.object({
  label: z.string().min(1, 'Node name is required'),
  description: z.string().optional(),
})

// Trigger schemas by subtype
export const triggerSchemas = {
  lead_trigger: baseNodeSchema.extend({
    subtype: z.literal('lead_trigger'),
    sourceId: z.string().min(1, 'Lead source is required'),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string(),
    })).optional(),
  }),
  
  contact_tagged: baseNodeSchema.extend({
    subtype: z.literal('contact_tagged'),
    tagId: z.string().min(1, 'Tag selection is required'),
    tagAction: z.enum(['added', 'removed']).default('added'),
  }),
  
  webhook_received: baseNodeSchema.extend({
    subtype: z.literal('webhook_received'),
    webhookUrl: z.string().url('Valid webhook URL required'),
    method: z.enum(['POST', 'GET', 'PUT', 'DELETE']).default('POST'),
    headers: z.record(z.string()).optional(),
  }),
  
  email_event: baseNodeSchema.extend({
    subtype: z.literal('email_event'),
    eventType: z.enum(['opened', 'clicked', 'bounced', 'unsubscribed']),
    emailId: z.string().optional(),
  }),
}

// Action schemas by action type
export const actionSchemas = {
  send_email: baseNodeSchema.extend({
    actionType: z.literal('send_email'),
    mode: z.enum(['template', 'custom']).default('template'),
    templateId: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    sendFrom: z.string().email().optional(),
  }).superRefine((data, ctx) => {
    if (data.mode === 'template' && !data.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateId'],
        message: 'Template selection is required',
      })
    }
    if (data.mode === 'custom') {
      if (!data.subject?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subject'],
          message: 'Email subject is required for custom emails',
        })
      }
      if (!data.body?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['body'],
          message: 'Email body is required for custom emails',
        })
      }
    }
  }),
  
  send_sms: baseNodeSchema.extend({
    actionType: z.literal('send_sms'),
    message: z.string().min(1, 'SMS message is required').max(160, 'SMS message should be under 160 characters'),
    sendFrom: z.string().optional(),
  }),
  
  send_whatsapp: baseNodeSchema.extend({
    actionType: z.literal('send_whatsapp'),
    mode: z.enum(['template', 'freeform']).default('freeform'),
    templateId: z.string().optional(),
    message: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.mode === 'template' && !data.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateId'],
        message: 'WhatsApp template selection is required',
      })
    }
    if (data.mode === 'freeform' && !data.message?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['message'],
        message: 'WhatsApp message is required',
      })
    }
  }),
  
  create_task: baseNodeSchema.extend({
    actionType: z.literal('create_task'),
    taskTitle: z.string().min(1, 'Task title is required'),
    taskDescription: z.string().optional(),
    assignedTo: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    dueDate: z.string().optional(),
  }),
  
  add_tag: baseNodeSchema.extend({
    actionType: z.literal('add_tag'),
    tagId: z.string().min(1, 'Tag selection is required'),
  }),
  
  remove_tag: baseNodeSchema.extend({
    actionType: z.literal('remove_tag'),
    tagId: z.string().min(1, 'Tag selection is required'),
  }),
}

// Condition schema
export const conditionSchema = baseNodeSchema.extend({
  type: z.literal('condition'),
  conditions: z.array(z.object({
    field: z.string().min(1, 'Field is required'),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
    value: z.string().optional(),
  })).min(1, 'At least one condition is required'),
  logic: z.enum(['AND', 'OR']).default('AND'),
})

// Wait schema
export const waitSchema = baseNodeSchema.extend({
  type: z.literal('wait'),
  waitType: z.enum(['duration', 'until_datetime', 'until_condition']).default('duration'),
  duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
  unit: z.enum(['minutes', 'hours', 'days', 'weeks']).default('minutes'),
  datetime: z.string().optional(),
  condition: z.string().optional(),
})

// Loop schema  
export const loopSchema = baseNodeSchema.extend({
  type: z.literal('loop'),
  loopType: z.enum(['for_each', 'while', 'fixed_count']).default('for_each'),
  dataSource: z.string().optional(),
  condition: z.string().optional(),
  maxIterations: z.number().min(1).max(1000, 'Maximum 1000 iterations allowed').default(100),
})

// Transform schema
export const transformSchema = baseNodeSchema.extend({
  type: z.literal('transform'),
  transformationType: z.enum(['map_fields', 'filter_data', 'aggregate', 'custom_script']).default('map_fields'),
  mappings: z.array(z.object({
    source: z.string(),
    target: z.string(),
  })).optional(),
  script: z.string().optional(),
})

/**
 * Get the appropriate schema for a node configuration
 */
export function getNodeSchema(nodeType: string, subtype?: string) {
  switch (nodeType) {
    case 'trigger':
      return subtype && subtype in triggerSchemas 
        ? triggerSchemas[subtype as keyof typeof triggerSchemas]
        : baseNodeSchema
        
    case 'action':
      return subtype && subtype in actionSchemas
        ? actionSchemas[subtype as keyof typeof actionSchemas]
        : baseNodeSchema
        
    case 'condition':
      return conditionSchema
      
    case 'wait':
      return waitSchema
      
    case 'loop':
      return loopSchema
      
    case 'transform':
      return transformSchema
      
    default:
      return baseNodeSchema
  }
}

/**
 * Validate node configuration using Zod
 */
export function validateNodeConfig(nodeType: string, config: any, subtype?: string) {
  // Ensure config is an object
  if (!config || typeof config !== 'object') {
    return {
      success: false,
      error: {
        issues: [{
          path: [],
          message: 'Configuration is required',
          code: 'custom'
        }]
      }
    }
  }
  
  try {
    const schema = getNodeSchema(nodeType, subtype)
    const result = schema.safeParse(config)
    
    // Add more user-friendly error messages
    if (!result.success && result.error) {
      result.error.issues = result.error.issues.map(issue => ({
        ...issue,
        message: formatValidationMessage(issue)
      }))
    }
    
    return result
  } catch (error) {
    return {
      success: false,
      error: {
        issues: [{
          path: [],
          message: 'Validation error: ' + (error as Error).message,
          code: 'custom'
        }]
      }
    }
  }
}

// Helper to format validation messages
function formatValidationMessage(issue: any): string {
  const field = issue.path.join('.')
  
  switch (issue.code) {
    case 'too_small':
      return field ? `${field} is required` : 'This field is required'
    case 'invalid_type':
      return field ? `${field} has invalid type` : 'Invalid value type'
    case 'invalid_string':
      if (issue.validation === 'email') {
        return field ? `${field} must be a valid email` : 'Must be a valid email'
      }
      if (issue.validation === 'url') {
        return field ? `${field} must be a valid URL` : 'Must be a valid URL'
      }
      return field ? `${field} is invalid` : 'Invalid value'
    default:
      return issue.message
  }
}