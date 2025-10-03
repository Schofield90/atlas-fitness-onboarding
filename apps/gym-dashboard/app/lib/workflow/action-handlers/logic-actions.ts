import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';

export async function conditionalAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.conditions || !Array.isArray(parameters.conditions)) {
    throw new Error('Conditions array is required');
  }
  
  try {
    const logicOperator = parameters.logicOperator || 'AND';
    const results: boolean[] = [];
    
    // Evaluate each condition
    for (const condition of parameters.conditions) {
      const result = await evaluateCondition(condition, context);
      results.push(result);
      
      // Short circuit evaluation
      if (logicOperator === 'AND' && !result) {
        break;
      } else if (logicOperator === 'OR' && result) {
        break;
      }
    }
    
    // Determine final result
    const finalResult = logicOperator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);
    
    // Determine which branch to take
    const branch = finalResult ? 'true' : 'false';
    
    return {
      success: true,
      output: {
        result: finalResult,
        branch,
        conditionsEvaluated: results.length,
        evaluations: parameters.includeDetails ? results : undefined,
        logicOperator
      }
    };
    
  } catch (error) {
    console.error('Conditional action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function switchAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.switchOn || !parameters.cases) {
    throw new Error('Switch value and cases are required');
  }
  
  try {
    const switchValue = interpolateValue(parameters.switchOn, context);
    let matchedCase = null;
    let matchedValue = null;
    
    // Check each case
    for (const caseConfig of parameters.cases) {
      let matches = false;
      
      if (caseConfig.type === 'exact') {
        matches = switchValue === caseConfig.value;
      } else if (caseConfig.type === 'pattern') {
        const regex = new RegExp(caseConfig.value);
        matches = regex.test(String(switchValue));
      } else if (caseConfig.type === 'range') {
        const numValue = Number(switchValue);
        const min = Number(caseConfig.min);
        const max = Number(caseConfig.max);
        matches = !isNaN(numValue) && numValue >= min && numValue <= max;
      } else if (caseConfig.type === 'condition') {
        matches = await evaluateCondition(caseConfig.condition, context);
      }
      
      if (matches) {
        matchedCase = caseConfig.name || caseConfig.value;
        matchedValue = caseConfig.value;
        break;
      }
    }
    
    // Use default if no match
    if (!matchedCase && parameters.default) {
      matchedCase = 'default';
    }
    
    return {
      success: true,
      output: {
        switchValue,
        matchedCase,
        matchedValue,
        branch: matchedCase || 'none'
      }
    };
    
  } catch (error) {
    console.error('Switch action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

async function evaluateCondition(
  condition: any,
  context: ExecutionContext
): Promise<boolean> {
  const { field, operator, value, type = 'static' } = condition;
  
  // Get field value
  const fieldValue = interpolateValue(field, context);
  
  // Get comparison value
  let compareValue = value;
  if (type === 'dynamic') {
    compareValue = interpolateValue(value, context);
  } else if (type === 'context') {
    compareValue = getNestedValue(context, value);
  }
  
  // Perform comparison
  switch (operator) {
    case 'equals':
    case 'eq':
      return fieldValue == compareValue;
      
    case 'not_equals':
    case 'neq':
      return fieldValue != compareValue;
      
    case 'strict_equals':
      return fieldValue === compareValue;
      
    case 'strict_not_equals':
      return fieldValue !== compareValue;
      
    case 'greater_than':
    case 'gt':
      return Number(fieldValue) > Number(compareValue);
      
    case 'greater_than_or_equal':
    case 'gte':
      return Number(fieldValue) >= Number(compareValue);
      
    case 'less_than':
    case 'lt':
      return Number(fieldValue) < Number(compareValue);
      
    case 'less_than_or_equal':
    case 'lte':
      return Number(fieldValue) <= Number(compareValue);
      
    case 'contains':
      return String(fieldValue).includes(String(compareValue));
      
    case 'not_contains':
      return !String(fieldValue).includes(String(compareValue));
      
    case 'starts_with':
      return String(fieldValue).startsWith(String(compareValue));
      
    case 'ends_with':
      return String(fieldValue).endsWith(String(compareValue));
      
    case 'matches_regex':
      const regex = new RegExp(String(compareValue));
      return regex.test(String(fieldValue));
      
    case 'in':
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      
    case 'not_in':
      return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      
    case 'exists':
    case 'is_set':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      
    case 'not_exists':
    case 'is_not_set':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
      
    case 'is_true':
      return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
      
    case 'is_false':
      return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
      
    case 'is_null':
      return fieldValue === null;
      
    case 'is_not_null':
      return fieldValue !== null;
      
    case 'is_empty':
      return fieldValue === '' || 
             (Array.isArray(fieldValue) && fieldValue.length === 0) ||
             (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
      
    case 'is_not_empty':
      return fieldValue !== '' && 
             !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
             !(typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
      
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  // Handle direct context references
  if (template.startsWith('{{') && template.endsWith('}}')) {
    const path = template.slice(2, -2).trim();
    return getNestedValue(context, path);
  }
  
  // Handle embedded variables
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    // Handle array notation like items[0]
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      return current?.[arrayKey]?.[parseInt(index)];
    }
    return current?.[key];
  }, obj);
}