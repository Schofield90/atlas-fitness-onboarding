// Advanced Conditions System for Automation

import type { ConditionOperator, ComparisonOperator } from '@/app/lib/types/automation'

export interface Condition {
  field: string
  operator: ComparisonOperator
  value: any
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array'
}

export interface ConditionGroup {
  operator: ConditionOperator
  conditions: (Condition | ConditionGroup)[]
}

// Evaluate a single condition
export function evaluateSingleCondition(
  condition: Condition,
  variables: Record<string, any>
): boolean {
  const fieldValue = getFieldValue(condition.field, variables)
  const compareValue = resolveValue(condition.value, variables)
  
  // Handle null/undefined
  if (fieldValue === undefined || fieldValue === null) {
    return condition.operator === 'is_empty' || 
           condition.operator === 'equals' && (compareValue === null || compareValue === undefined)
  }
  
  // Type coercion based on dataType
  const [left, right] = coerceTypes(fieldValue, compareValue, condition.dataType)
  
  switch (condition.operator) {
    case 'equals':
      return left === right
    
    case 'not_equals':
      return left !== right
    
    case 'greater_than':
      return left > right
    
    case 'greater_than_or_equal':
      return left >= right
    
    case 'less_than':
      return left < right
    
    case 'less_than_or_equal':
      return left <= right
    
    case 'contains':
      if (Array.isArray(left)) {
        return left.includes(right)
      }
      return String(left).toLowerCase().includes(String(right).toLowerCase())
    
    case 'not_contains':
      if (Array.isArray(left)) {
        return !left.includes(right)
      }
      return !String(left).toLowerCase().includes(String(right).toLowerCase())
    
    case 'starts_with':
      return String(left).toLowerCase().startsWith(String(right).toLowerCase())
    
    case 'ends_with':
      return String(left).toLowerCase().endsWith(String(right).toLowerCase())
    
    case 'in':
      if (Array.isArray(right)) {
        return right.includes(left)
      }
      return false
    
    case 'not_in':
      if (Array.isArray(right)) {
        return !right.includes(left)
      }
      return true
    
    case 'is_empty':
      return !left || 
             (typeof left === 'string' && left.trim() === '') ||
             (Array.isArray(left) && left.length === 0) ||
             (typeof left === 'object' && Object.keys(left).length === 0)
    
    case 'is_not_empty':
      return !!left && 
             !(typeof left === 'string' && left.trim() === '') &&
             !(Array.isArray(left) && left.length === 0) &&
             !(typeof left === 'object' && Object.keys(left).length === 0)
    
    case 'regex':
      try {
        const regex = new RegExp(String(right))
        return regex.test(String(left))
      } catch {
        return false
      }
    
    case 'between':
      if (Array.isArray(right) && right.length === 2) {
        return left >= right[0] && left <= right[1]
      }
      return false
    
    case 'days_ago_less_than':
      if (left instanceof Date || typeof left === 'string') {
        const date = new Date(left)
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo < Number(right)
      }
      return false
    
    case 'days_ago_greater_than':
      if (left instanceof Date || typeof left === 'string') {
        const date = new Date(left)
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo > Number(right)
      }
      return false
    
    case 'before':
      if (left instanceof Date || typeof left === 'string') {
        const leftDate = new Date(left)
        const rightDate = new Date(right)
        return leftDate < rightDate
      }
      return false
    
    case 'after':
      if (left instanceof Date || typeof left === 'string') {
        const leftDate = new Date(left)
        const rightDate = new Date(right)
        return leftDate > rightDate
      }
      return false
    
    default:
      console.warn(`Unknown operator: ${condition.operator}`)
      return false
  }
}

// Evaluate a condition group (supports nested groups)
export async function evaluateCondition(
  conditionGroup: ConditionGroup,
  variables: Record<string, any>
): Promise<boolean> {
  if (!conditionGroup.conditions || conditionGroup.conditions.length === 0) {
    return true
  }
  
  const results = await Promise.all(
    conditionGroup.conditions.map(async (item) => {
      if ('field' in item) {
        // It's a single condition
        return evaluateSingleCondition(item as Condition, variables)
      } else {
        // It's a nested condition group
        return evaluateCondition(item as ConditionGroup, variables)
      }
    })
  )
  
  if (conditionGroup.operator === 'AND') {
    return results.every(result => result)
  } else if (conditionGroup.operator === 'OR') {
    return results.some(result => result)
  } else if (conditionGroup.operator === 'NOT') {
    // NOT operator should have exactly one condition
    return results.length > 0 && !results[0]
  }
  
  return false
}

// Get field value from variables using dot notation
function getFieldValue(field: string, variables: Record<string, any>): any {
  const parts = field.split('.')
  let value: any = variables
  
  for (const part of parts) {
    if (value && typeof value === 'object') {
      // Handle array index notation like items[0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch
        value = value[arrayName]?.[parseInt(index)]
      } else {
        value = value[part]
      }
    } else {
      return undefined
    }
  }
  
  return value
}

// Resolve value (handle variables)
function resolveValue(value: any, variables: Record<string, any>): any {
  if (typeof value === 'string') {
    // Check if it's a variable reference
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const varPath = value.slice(2, -2).trim()
      return getFieldValue(varPath, variables)
    }
    
    // Check if it's a formula
    if (value.startsWith('=')) {
      return evaluateFormula(value.slice(1), variables)
    }
  }
  
  return value
}

// Type coercion for comparison
function coerceTypes(
  left: any,
  right: any,
  dataType?: string
): [any, any] {
  // If dataType is specified, use it
  if (dataType) {
    switch (dataType) {
      case 'number':
        return [Number(left), Number(right)]
      case 'string':
        return [String(left), String(right)]
      case 'boolean':
        return [Boolean(left), Boolean(right)]
      case 'date':
        return [new Date(left), new Date(right)]
      case 'array':
        return [
          Array.isArray(left) ? left : [left],
          Array.isArray(right) ? right : [right]
        ]
    }
  }
  
  // Auto-detect type
  if (typeof left === 'number' || typeof right === 'number') {
    return [Number(left), Number(right)]
  }
  
  if (left instanceof Date || right instanceof Date ||
      (typeof left === 'string' && isDateString(left)) ||
      (typeof right === 'string' && isDateString(right))) {
    return [new Date(left), new Date(right)]
  }
  
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return [Boolean(left), Boolean(right)]
  }
  
  // Default to string comparison
  return [String(left), String(right)]
}

// Check if string is a date
function isDateString(str: string): boolean {
  const date = new Date(str)
  return !isNaN(date.getTime()) && str.includes('-') || str.includes('/')
}

// Simple formula evaluator
function evaluateFormula(formula: string, variables: Record<string, any>): any {
  try {
    // Replace variable references in formula
    let processedFormula = formula
    const varRegex = /\{\{([^}]+)\}\}/g
    let match
    
    while ((match = varRegex.exec(formula)) !== null) {
      const varPath = match[1].trim()
      const value = getFieldValue(varPath, variables)
      processedFormula = processedFormula.replace(match[0], JSON.stringify(value))
    }
    
    // Support basic math operations and functions
    const mathFunctions = {
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      min: Math.min,
      max: Math.max,
      sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
      avg: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
      now: () => Date.now(),
      date: (str: string) => new Date(str).getTime(),
    }
    
    // Create safe evaluation context
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    const evaluator = new AsyncFunction(
      ...Object.keys(mathFunctions),
      `return ${processedFormula}`
    )
    
    return evaluator(...Object.values(mathFunctions))
  } catch (error) {
    console.error('Formula evaluation error:', error)
    return null
  }
}

// Condition builder helpers
export class ConditionBuilder {
  private condition: ConditionGroup
  
  constructor(operator: ConditionOperator = 'AND') {
    this.condition = {
      operator,
      conditions: []
    }
  }
  
  add(condition: Condition | ConditionGroup): this {
    this.condition.conditions.push(condition)
    return this
  }
  
  addCondition(
    field: string,
    operator: ComparisonOperator,
    value: any,
    dataType?: string
  ): this {
    this.condition.conditions.push({
      field,
      operator,
      value,
      dataType: dataType as any
    })
    return this
  }
  
  addGroup(operator: ConditionOperator, builder: (group: ConditionBuilder) => void): this {
    const group = new ConditionBuilder(operator)
    builder(group)
    this.condition.conditions.push(group.build())
    return this
  }
  
  build(): ConditionGroup {
    return this.condition
  }
}

// Predefined condition templates
export const conditionTemplates = {
  // Lead qualification conditions
  isQualifiedLead: new ConditionBuilder('AND')
    .addCondition('lead.score', 'greater_than_or_equal', 70)
    .addCondition('lead.email', 'is_not_empty', null)
    .addCondition('lead.phone', 'is_not_empty', null)
    .build(),
  
  // Engagement conditions
  isHighlyEngaged: new ConditionBuilder('AND')
    .addCondition('engagement.emailOpens', 'greater_than', 5)
    .addCondition('engagement.lastActivity', 'days_ago_less_than', 7)
    .build(),
  
  // Churn risk conditions
  isAtRiskOfChurn: new ConditionBuilder('OR')
    .addCondition('lastActivity', 'days_ago_greater_than', 30)
    .addCondition('supportTickets', 'greater_than', 3)
    .addCondition('npsScore', 'less_than', 6)
    .build(),
  
  // Purchase behavior
  isReadyToPurchase: new ConditionBuilder('AND')
    .addCondition('lead.stage', 'equals', 'consideration')
    .addGroup('OR', (group) => {
      group
        .addCondition('engagement.pageViews', 'greater_than', 10)
        .addCondition('engagement.demoRequested', 'equals', true)
    })
    .build(),
}

// Export condition validators
export function validateCondition(condition: Condition): string[] {
  const errors: string[] = []
  
  if (!condition.field) {
    errors.push('Field is required')
  }
  
  if (!condition.operator) {
    errors.push('Operator is required')
  }
  
  // Some operators don't need a value
  const noValueOperators = ['is_empty', 'is_not_empty']
  if (!noValueOperators.includes(condition.operator) && 
      condition.value === undefined && 
      condition.value !== null) {
    errors.push('Value is required for this operator')
  }
  
  // Validate operator-specific requirements
  if (condition.operator === 'between' && 
      (!Array.isArray(condition.value) || condition.value.length !== 2)) {
    errors.push('Between operator requires an array with two values')
  }
  
  if ((condition.operator === 'in' || condition.operator === 'not_in') &&
      !Array.isArray(condition.value)) {
    errors.push(`${condition.operator} operator requires an array value`)
  }
  
  return errors
}

export function validateConditionGroup(group: ConditionGroup): string[] {
  const errors: string[] = []
  
  if (!group.operator) {
    errors.push('Group operator is required')
  }
  
  if (!group.conditions || group.conditions.length === 0) {
    errors.push('At least one condition is required')
  }
  
  // Validate NOT operator
  if (group.operator === 'NOT' && group.conditions.length > 1) {
    errors.push('NOT operator can only have one condition')
  }
  
  // Validate nested conditions
  group.conditions?.forEach((item, index) => {
    if ('field' in item) {
      const conditionErrors = validateCondition(item as Condition)
      errors.push(...conditionErrors.map(e => `Condition ${index + 1}: ${e}`))
    } else {
      const groupErrors = validateConditionGroup(item as ConditionGroup)
      errors.push(...groupErrors.map(e => `Group ${index + 1}: ${e}`))
    }
  })
  
  return errors
}