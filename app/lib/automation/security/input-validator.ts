// Input Validation and Sanitization for Automation System
// Prevents injection attacks and ensures data integrity

import validator from "validator";

export interface ValidationOptions {
  maxDepth?: number;
  maxStringLength?: number;
  allowedTypes?: string[];
  sanitizeHtml?: boolean;
  organizationId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedData: any;
  errors: string[];
  warnings: string[];
}

export class AutomationInputValidator {
  private static readonly DEFAULT_MAX_DEPTH = 10;
  private static readonly DEFAULT_MAX_STRING_LENGTH = 10000;
  private static readonly ALLOWED_TYPES = [
    "string",
    "number",
    "boolean",
    "object",
    "array",
  ];

  /**
   * Validate and sanitize trigger data for workflow execution
   */
  static validateTriggerData(
    data: any,
    organizationId: string,
    options: ValidationOptions = {},
  ): ValidationResult {
    const opts = {
      maxDepth: options.maxDepth ?? this.DEFAULT_MAX_DEPTH,
      maxStringLength:
        options.maxStringLength ?? this.DEFAULT_MAX_STRING_LENGTH,
      allowedTypes: options.allowedTypes ?? this.ALLOWED_TYPES,
      sanitizeHtml: options.sanitizeHtml ?? true,
      organizationId: organizationId,
    };

    const result: ValidationResult = {
      isValid: true,
      sanitizedData: null,
      errors: [],
      warnings: [],
    };

    try {
      // Validate organization ID
      if (!organizationId || !validator.isUUID(organizationId)) {
        result.errors.push("Invalid or missing organization ID");
        result.isValid = false;
        return result;
      }

      // Validate and sanitize data
      result.sanitizedData = this.sanitizeValue(data, opts, 0, result);

      // Check for critical errors
      if (result.errors.length > 0) {
        result.isValid = false;
      }
    } catch (error: any) {
      result.errors.push(`Validation error: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate workflow configuration data
   */
  static validateWorkflowData(
    workflow: any,
    organizationId: string,
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedData: null,
      errors: [],
      warnings: [],
    };

    try {
      // Validate organization ID matches
      if (workflow.organizationId !== organizationId) {
        result.errors.push("Organization ID mismatch");
        result.isValid = false;
        return result;
      }

      // Validate required fields
      if (!workflow.name || typeof workflow.name !== "string") {
        result.errors.push("Workflow name is required and must be a string");
      }

      if (!workflow.workflowData || typeof workflow.workflowData !== "object") {
        result.errors.push("Workflow data is required and must be an object");
      }

      // Validate nodes array
      if (!Array.isArray(workflow.workflowData?.nodes)) {
        result.errors.push("Workflow nodes must be an array");
      } else {
        workflow.workflowData.nodes.forEach((node: any, index: number) => {
          if (!node.id || !validator.isUUID(node.id)) {
            result.errors.push(`Node ${index}: Invalid ID`);
          }
          if (!node.type || !this.isValidNodeType(node.type)) {
            result.errors.push(`Node ${index}: Invalid type`);
          }
        });
      }

      // Validate edges array
      if (!Array.isArray(workflow.workflowData?.edges)) {
        result.errors.push("Workflow edges must be an array");
      } else {
        workflow.workflowData.edges.forEach((edge: any, index: number) => {
          if (!edge.source || !edge.target) {
            result.errors.push(`Edge ${index}: Missing source or target`);
          }
        });
      }

      // Sanitize the workflow data
      result.sanitizedData = this.sanitizeWorkflow(workflow);

      if (result.errors.length > 0) {
        result.isValid = false;
      }
    } catch (error: any) {
      result.errors.push(`Workflow validation error: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Recursively sanitize a value
   */
  private static sanitizeValue(
    value: any,
    options: ValidationOptions,
    depth: number,
    result: ValidationResult,
  ): any {
    // Check depth limit
    if (depth > options.maxDepth!) {
      result.warnings.push(`Maximum depth exceeded (${options.maxDepth})`);
      return null;
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle different types
    switch (typeof value) {
      case "string":
        return this.sanitizeString(value, options, result);
      case "number":
        return this.sanitizeNumber(value, result);
      case "boolean":
        return value;
      case "object":
        if (Array.isArray(value)) {
          return this.sanitizeArray(value, options, depth, result);
        } else {
          return this.sanitizeObject(value, options, depth, result);
        }
      default:
        result.warnings.push(`Unsupported type: ${typeof value}`);
        return null;
    }
  }

  /**
   * Sanitize string values
   */
  private static sanitizeString(
    value: string,
    options: ValidationOptions,
    result: ValidationResult,
  ): string {
    // Check length
    if (value.length > options.maxStringLength!) {
      result.warnings.push(
        `String truncated (max: ${options.maxStringLength})`,
      );
      value = value.substring(0, options.maxStringLength!);
    }

    // Sanitize HTML if enabled
    if (options.sanitizeHtml) {
      // Use validator.escape for SSR compatibility instead of DOMPurify
      const sanitized = validator.escape(value);
      if (sanitized !== value) {
        result.warnings.push("HTML content sanitized");
      }
      return sanitized;
    }

    // Basic XSS prevention
    return value
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ""); // Remove event handlers
  }

  /**
   * Sanitize number values
   */
  private static sanitizeNumber(
    value: number,
    result: ValidationResult,
  ): number {
    if (!Number.isFinite(value)) {
      result.warnings.push("Invalid number replaced with 0");
      return 0;
    }

    // Check for extremely large numbers
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      result.warnings.push("Number clamped to safe range");
      return Math.sign(value) * Number.MAX_SAFE_INTEGER;
    }

    return value;
  }

  /**
   * Sanitize array values
   */
  private static sanitizeArray(
    value: any[],
    options: ValidationOptions,
    depth: number,
    result: ValidationResult,
  ): any[] {
    const maxItems = 1000; // Prevent memory exhaustion

    if (value.length > maxItems) {
      result.warnings.push(`Array truncated (max: ${maxItems} items)`);
      value = value.slice(0, maxItems);
    }

    return value.map((item) =>
      this.sanitizeValue(item, options, depth + 1, result),
    );
  }

  /**
   * Sanitize object values
   */
  private static sanitizeObject(
    value: Record<string, any>,
    options: ValidationOptions,
    depth: number,
    result: ValidationResult,
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const maxKeys = 100; // Prevent memory exhaustion

    const keys = Object.keys(value);
    if (keys.length > maxKeys) {
      result.warnings.push(`Object truncated (max: ${maxKeys} keys)`);
    }

    keys.slice(0, maxKeys).forEach((key) => {
      // Sanitize key name
      const sanitizedKey = this.sanitizeString(key, options, result);

      // Sanitize value
      sanitized[sanitizedKey] = this.sanitizeValue(
        value[key],
        options,
        depth + 1,
        result,
      );
    });

    return sanitized;
  }

  /**
   * Sanitize workflow configuration
   */
  private static sanitizeWorkflow(workflow: any): any {
    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      name: validator.escape(workflow.name || ""),
      description: validator.escape(workflow.description || ""),
      status: ["draft", "active", "paused", "archived"].includes(
        workflow.status,
      )
        ? workflow.status
        : "draft",
      workflowData: {
        nodes: Array.isArray(workflow.workflowData?.nodes)
          ? workflow.workflowData.nodes.map(this.sanitizeNode)
          : [],
        edges: Array.isArray(workflow.workflowData?.edges)
          ? workflow.workflowData.edges.map(this.sanitizeEdge)
          : [],
        variables: Array.isArray(workflow.workflowData?.variables)
          ? workflow.workflowData.variables.map(this.sanitizeVariable)
          : [],
      },
      triggerType: workflow.triggerType,
      triggerConfig: this.sanitizeObject(workflow.triggerConfig || {}, {}, 0, {
        isValid: true,
        sanitizedData: null,
        errors: [],
        warnings: [],
      }),
      settings: this.sanitizeWorkflowSettings(workflow.settings || {}),
    };
  }

  /**
   * Sanitize workflow node
   */
  private static sanitizeNode(node: any): any {
    return {
      id: node.id,
      type: node.type,
      position: {
        x: Math.max(0, Math.min(10000, Number(node.position?.x) || 0)),
        y: Math.max(0, Math.min(10000, Number(node.position?.y) || 0)),
      },
      data: this.sanitizeObject(node.data || {}, {}, 0, {
        isValid: true,
        sanitizedData: null,
        errors: [],
        warnings: [],
      }),
    };
  }

  /**
   * Sanitize workflow edge
   */
  private static sanitizeEdge(edge: any): any {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    };
  }

  /**
   * Sanitize workflow variable
   */
  private static sanitizeVariable(variable: any): any {
    return {
      id: variable.id,
      name: validator.escape(variable.name || ""),
      type: ["string", "number", "boolean", "object"].includes(variable.type)
        ? variable.type
        : "string",
      value: variable.value,
      scope: ["workflow", "organization", "global"].includes(variable.scope)
        ? variable.scope
        : "workflow",
    };
  }

  /**
   * Sanitize workflow settings
   */
  private static sanitizeWorkflowSettings(settings: any): any {
    return {
      errorHandling: ["continue", "stop", "retry"].includes(
        settings.errorHandling,
      )
        ? settings.errorHandling
        : "continue",
      maxExecutionTime: Math.max(
        1,
        Math.min(3600, Number(settings.maxExecutionTime) || 300),
      ),
      timezone: validator.escape(settings.timezone || "UTC"),
      notifications: {
        onError: Boolean(settings.notifications?.onError),
        onComplete: Boolean(settings.notifications?.onComplete),
      },
    };
  }

  /**
   * Check if node type is valid
   */
  private static isValidNodeType(type: string): boolean {
    const validTypes = [
      "trigger",
      "action",
      "condition",
      "wait",
      "loop",
      "transform",
      "filter",
      "webhook",
      "email",
      "sms",
    ];
    return validTypes.includes(type);
  }

  /**
   * Validate webhook signature (for future HMAC implementation)
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    // TODO: Implement HMAC-SHA256 signature validation
    // This will be implemented in the next task
    return true;
  }
}
