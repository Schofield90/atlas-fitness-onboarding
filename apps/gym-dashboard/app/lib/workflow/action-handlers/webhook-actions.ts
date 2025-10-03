import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';

export async function sendWebhookAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.url) {
    throw new Error('Webhook URL is required');
  }
  
  try {
    const url = interpolateValue(parameters.url, context);
    const method = parameters.method || 'POST';
    const headers = parameters.headers ? 
      interpolateObject(parameters.headers, context) : {};
    const body = parameters.body ? 
      interpolateObject(parameters.body, context) : {};
    const timeout = parameters.timeout || 30000;
    
    // Add default headers
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['User-Agent'] = headers['User-Agent'] || 'AtlasFitness-Workflow/1.0';
    
    // Add webhook signature if secret provided
    if (parameters.secret) {
      const signature = await generateWebhookSignature(
        JSON.stringify(body),
        parameters.secret
      );
      headers['X-Webhook-Signature'] = signature;
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
      
      // Check success condition if provided
      if (parameters.successCondition) {
        const isSuccess = evaluateCondition(
          parameters.successCondition,
          { response: responseData, status: response.status }
        );
        
        if (!isSuccess) {
          throw new Error(`Webhook success condition not met: ${response.status}`);
        }
      } else if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
      
      return {
        success: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          url,
          method,
          duration: Date.now() - startTime
        }
      };
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Webhook timeout after ${timeout}ms`);
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Webhook action failed:', error);
    
    // Retry logic
    if (parameters.retry && parameters.retry.enabled) {
      const currentAttempt = context._retryCount || 0;
      if (currentAttempt < parameters.retry.maxAttempts) {
        return {
          success: false,
          error: error.message,
          shouldRetry: true,
          output: { 
            error: error.message,
            attempt: currentAttempt + 1,
            maxAttempts: parameters.retry.maxAttempts
          }
        };
      }
    }
    
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

async function generateWebhookSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = encoder.encode(secret);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256=${hashHex}`;
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

function interpolateObject(obj: any, context: ExecutionContext): any {
  if (typeof obj === 'string') {
    return interpolateValue(obj, context);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, context));
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context);
    }
    return result;
  }
  
  return obj;
}

function evaluateCondition(condition: any, context: any): boolean {
  const { field, operator, value } = condition;
  const fieldValue = getNestedValue(context, field);
  
  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'contains':
      return String(fieldValue).includes(String(value));
    default:
      return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

const startTime = Date.now();