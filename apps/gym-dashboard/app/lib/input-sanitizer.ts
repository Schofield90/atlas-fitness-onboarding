// Input validation and sanitization utilities

export interface ValidationRule {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  // Remove any HTML tags and scripts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Validate email format
export function validateEmail(email: string): {
  valid: boolean;
  sanitized: string;
} {
  const sanitized = sanitizeInput(email).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return {
    valid: emailRegex.test(sanitized) && sanitized.length <= 254, // Max email length per RFC
    sanitized,
  };
}

// Validate OTP code
export function validateOTP(otp: string): {
  valid: boolean;
  sanitized: string;
} {
  const sanitized = sanitizeInput(otp).replace(/\s/g, ""); // Remove spaces
  const otpRegex = /^\d{6}$/; // 6-digit code

  return {
    valid: otpRegex.test(sanitized),
    sanitized,
  };
}

// Validate password
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password too long" };
  }

  return { valid: true };
}

// Generic input validator
export function validateInput(
  input: any,
  rules: ValidationRule,
): { valid: boolean; error?: string; sanitized?: string } {
  // Convert to string if needed
  const str = String(input || "");
  const sanitized = sanitizeInput(str);

  // Check required
  if (rules.required && !sanitized) {
    return { valid: false, error: "This field is required" };
  }

  // Check min length
  if (rules.minLength && sanitized.length < rules.minLength) {
    return {
      valid: false,
      error: `Must be at least ${rules.minLength} characters`,
    };
  }

  // Check max length
  if (rules.maxLength && sanitized.length > rules.maxLength) {
    return {
      valid: false,
      error: `Must be no more than ${rules.maxLength} characters`,
    };
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(sanitized)) {
    return { valid: false, error: "Invalid format" };
  }

  return { valid: true, sanitized };
}

// Authentication input validation rules
export const authValidationRules = {
  email: {
    required: true,
    maxLength: 254,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  otp: {
    required: true,
    minLength: 6,
    maxLength: 6,
    pattern: /^\d{6}$/,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
  },
};

// Validate all inputs in an object
export function validateAuthInputs(
  inputs: Record<string, any>,
  requiredFields: string[],
): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, string> = {};

  for (const field of requiredFields) {
    const value = inputs[field];

    if (field === "email") {
      const result = validateEmail(value || "");
      if (!result.valid) {
        errors[field] = "Invalid email address";
      } else {
        sanitized[field] = result.sanitized;
      }
    } else if (field === "otp") {
      const result = validateOTP(value || "");
      if (!result.valid) {
        errors[field] = "Invalid verification code";
      } else {
        sanitized[field] = result.sanitized;
      }
    } else if (field === "password" || field === "newPassword") {
      const result = validatePassword(value || "");
      if (!result.valid) {
        errors[field] = result.error || "Invalid password";
      } else {
        sanitized[field] = value; // Don't sanitize passwords
      }
    } else {
      // Generic validation
      if (!value) {
        errors[field] = `${field} is required`;
      } else {
        sanitized[field] = sanitizeInput(String(value));
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
