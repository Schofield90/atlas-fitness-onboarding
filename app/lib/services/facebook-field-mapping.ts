import { createClient } from "@/app/lib/supabase/server";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { format, parse } from "date-fns";

// Type definitions
interface FieldMapping {
  id: string;
  facebook_field_name: string;
  facebook_field_label: string;
  facebook_field_type:
    | "SHORT_ANSWER"
    | "PHONE_NUMBER"
    | "EMAIL"
    | "MULTIPLE_CHOICE"
    | "DATETIME";
  crm_field: string;
  crm_field_type: "standard" | "custom";
  transformation?: FieldTransformation;
  is_required: boolean;
  auto_detected: boolean;
}

interface FieldTransformation {
  type: "text" | "phone_format" | "date_format" | "boolean" | "number";
  options?: {
    phone_region?: string;
    date_format?: string;
    boolean_mapping?: { true: string; false: string };
  };
}

interface StoredFieldMappings {
  version: string;
  created_at: string;
  updated_at: string;
  mappings: FieldMapping[];
  custom_mappings: CustomFieldMapping[];
  auto_create_contact: boolean;
  default_lead_source: string;
}

interface CustomFieldMapping {
  field_name: string;
  field_value: any;
  is_static: boolean;
}

interface FacebookFormField {
  id: string;
  name: string;
  type: string;
  label?: string;
}

interface FacebookForm {
  id: string;
  name: string;
  fields?: {
    data: FacebookFormField[];
  };
}

// Field detection patterns
const FIELD_PATTERNS = {
  email: [/email/i, /e-mail/i, /mail/i, /contact.*email/i, /email.*address/i],
  first_name: [
    /^first.*name/i,
    /^fname/i,
    /^given.*name/i,
    /^forename/i,
    /^christian.*name/i,
  ],
  last_name: [/^last.*name/i, /^lname/i, /^surname/i, /^family.*name/i],
  full_name: [
    /^full.*name/i,
    /^name$/i,
    /^your.*name/i,
    /^contact.*name/i,
    /^customer.*name/i,
  ],
  phone: [
    /phone/i,
    /mobile/i,
    /cell/i,
    /telephone/i,
    /contact.*number/i,
    /whatsapp/i,
    /sms/i,
  ],
  address: [/address/i, /location/i, /street/i],
  city: [/city/i, /town/i],
  postal_code: [/postal.*code/i, /postcode/i, /zip.*code/i, /zip$/i],
  country: [/country/i, /nation/i],
  company: [
    /company/i,
    /organization/i,
    /organisation/i,
    /business/i,
    /employer/i,
  ],
  notes: [/notes/i, /message/i, /comments/i, /additional/i, /description/i],
};

/**
 * Auto-detect field mappings from Facebook form structure
 */
export async function autoDetectFieldMappings(
  facebookForm: FacebookForm,
): Promise<FieldMapping[]> {
  const mappings: FieldMapping[] = [];

  if (!facebookForm.fields?.data) {
    return mappings;
  }

  for (const field of facebookForm.fields.data) {
    const mapping = detectFieldMapping(field);
    if (mapping) {
      mappings.push(mapping);
    }
  }

  return mappings;
}

/**
 * Detect CRM field mapping for a single Facebook field
 */
function detectFieldMapping(field: FacebookFormField): FieldMapping | null {
  const fieldLabel = field.label || field.name;
  const fieldType = mapFacebookFieldType(field.type);

  // Try to match against known patterns
  let crmField = "custom_field";
  let crmFieldType: "standard" | "custom" = "custom";
  let transformation: FieldTransformation | undefined;
  let autoDetected = false;

  // Check email field type first
  if (field.type === "EMAIL" || fieldType === "EMAIL") {
    crmField = "email";
    crmFieldType = "standard";
    autoDetected = true;
  }
  // Check phone field type
  else if (field.type === "PHONE_NUMBER" || fieldType === "PHONE_NUMBER") {
    crmField = "phone";
    crmFieldType = "standard";
    autoDetected = true;
    transformation = {
      type: "phone_format",
      options: {
        phone_region: "GB", // Default to UK format
      },
    };
  }
  // Check datetime field type
  else if (field.type === "DATETIME" || fieldType === "DATETIME") {
    transformation = {
      type: "date_format",
      options: {
        date_format: "DD/MM/YYYY", // UK format
      },
    };
  }
  // Pattern matching for text fields
  else {
    for (const [crmFieldName, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(fieldLabel))) {
        crmField = crmFieldName;
        crmFieldType = [
          "email",
          "first_name",
          "last_name",
          "full_name",
          "phone",
        ].includes(crmFieldName)
          ? "standard"
          : "custom";
        autoDetected = true;

        // Add phone transformation if detected via pattern
        if (crmFieldName === "phone") {
          transformation = {
            type: "phone_format",
            options: {
              phone_region: "GB",
            },
          };
        }
        break;
      }
    }
  }

  // If no match found, create custom field mapping
  if (crmField === "custom_field") {
    crmField = `custom_${field.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
  }

  return {
    id: field.id,
    facebook_field_name: field.name,
    facebook_field_label: fieldLabel,
    facebook_field_type: fieldType,
    crm_field: crmField,
    crm_field_type: crmFieldType,
    transformation,
    is_required: false, // Can be updated based on form settings
    auto_detected: autoDetected,
  };
}

/**
 * Map Facebook field types to our supported types
 */
function mapFacebookFieldType(
  type: string,
): FieldMapping["facebook_field_type"] {
  const typeMap: Record<string, FieldMapping["facebook_field_type"]> = {
    EMAIL: "EMAIL",
    PHONE_NUMBER: "PHONE_NUMBER",
    PHONE: "PHONE_NUMBER",
    DATETIME: "DATETIME",
    DATE_TIME: "DATETIME",
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    CHECKBOX: "MULTIPLE_CHOICE",
    RADIO: "MULTIPLE_CHOICE",
    SHORT_ANSWER: "SHORT_ANSWER",
    TEXT: "SHORT_ANSWER",
    PARAGRAPH: "SHORT_ANSWER",
  };

  return typeMap[type.toUpperCase()] || "SHORT_ANSWER";
}

/**
 * Apply field mappings to transform Facebook lead data to CRM format
 */
export async function applyFieldMappings(
  leadData:
    | Record<string, any>
    | Array<{ name: string; values?: any[]; value?: any }>,
  mappings: FieldMapping[],
): Promise<Record<string, any>> {
  const transformed: Record<string, any> = {};

  for (const mapping of mappings) {
    let rawValue: any;
    if (Array.isArray(leadData)) {
      // Support Meta lead payload array format: [{ name, values }]
      const match = leadData.find(
        (f) => (f as any).name === mapping.facebook_field_name,
      ) as any;
      rawValue = match
        ? Array.isArray(match.values)
          ? match.values[0]
          : match.value
        : undefined;
    } else {
      rawValue = (leadData as Record<string, any>)[mapping.facebook_field_name];
    }

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    let transformedValue = rawValue;

    // Apply transformation if specified
    if (mapping.transformation) {
      transformedValue = await applyTransformation(
        rawValue,
        mapping.transformation,
      );
    }

    // Handle name splitting if full_name is mapped to first_name/last_name
    if (
      mapping.crm_field === "full_name" &&
      typeof transformedValue === "string"
    ) {
      const nameParts = transformedValue.trim().split(/\s+/);
      if (nameParts.length > 0) {
        transformed["first_name"] = nameParts[0];
        if (nameParts.length > 1) {
          transformed["last_name"] = nameParts.slice(1).join(" ");
        }
      }
      transformed["full_name"] = transformedValue;
    } else {
      transformed[mapping.crm_field] = transformedValue;
    }
  }

  return transformed;
}

/**
 * Apply a specific transformation to a value
 */
async function applyTransformation(
  value: any,
  transformation: FieldTransformation,
): Promise<any> {
  try {
    switch (transformation.type) {
      case "phone_format":
        return formatPhoneNumber(
          value,
          transformation.options?.phone_region || "GB",
        );

      case "date_format":
        return formatDate(
          value,
          transformation.options?.date_format || "DD/MM/YYYY",
        );

      case "boolean":
        return parseBooleanValue(
          value,
          transformation.options?.boolean_mapping,
        );

      case "number":
        return parseFloat(value) || 0;

      case "text":
      default:
        return String(value).trim();
    }
  } catch (error) {
    console.error("Transformation error:", error);
    return value; // Return original value if transformation fails
  }
}

/**
 * Format phone number to standard format
 */
function formatPhoneNumber(phone: string, region: string = "GB"): string {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, region as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format("E164"); // Return in E.164 format
    }
  } catch (error) {
    console.error("Phone formatting error:", error);
  }

  // Fallback: basic cleanup
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Format date string
 */
function formatDate(dateString: string, format: string): string {
  try {
    // Try parsing ISO date
    let date = new Date(dateString);

    // If invalid, try other common formats
    if (isNaN(date.getTime())) {
      // Try UK format
      date = parse(dateString, "dd/MM/yyyy", new Date());
    }

    if (isNaN(date.getTime())) {
      // Try US format
      date = parse(dateString, "MM/dd/yyyy", new Date());
    }

    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    console.error("Date formatting error:", error);
  }

  return dateString;
}

/**
 * Parse boolean value from various inputs
 */
function parseBooleanValue(
  value: any,
  mapping?: { true: string; false: string },
): boolean {
  const stringValue = String(value).toLowerCase().trim();

  if (mapping) {
    return stringValue === mapping.true.toLowerCase();
  }

  return ["true", "yes", "1", "on", "checked"].includes(stringValue);
}

/**
 * Save field mappings to the database
 */
export async function saveFieldMappings(
  organizationId: string,
  formId: string,
  mappings: StoredFieldMappings,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Persist mappings on the facebook_lead_forms row for this organization + form
    // Use upsert in case the form row doesn't exist yet
    const now = new Date().toISOString();
    const { error } = await supabase.from("facebook_lead_forms").upsert(
      {
        organization_id: organizationId,
        facebook_form_id: formId,
        // Store mapping payload into dedicated columns
        field_mappings: mappings.mappings,
        custom_field_mappings: mappings.custom_mappings,
        field_mappings_configured: true,
        field_mappings_version: mappings.version,
        updated_at: now,
      },
      { onConflict: "organization_id,facebook_form_id" },
    );

    if (error) {
      console.error(
        "Error saving field mappings to facebook_lead_forms:",
        error,
      );
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving field mappings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Retrieve field mappings from the database
 */
export async function getFieldMappings(
  formId: string,
  organizationId: string,
): Promise<StoredFieldMappings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facebook_lead_forms")
      .select(
        "created_at, updated_at, field_mappings, custom_field_mappings, field_mappings_version",
      )
      .eq("organization_id", organizationId)
      .eq("facebook_form_id", formId)
      .maybeSingle();

    if (error) {
      console.error("Error retrieving field mappings:", error);
      return null;
    }

    if (!data) {
      console.log(
        `No field mappings found for form ${formId} in org ${organizationId}`,
      );
      return null;
    }

    console.log(`[getFieldMappings] Retrieved data for form ${formId}:`, {
      hasFieldMappings: !!(data as any).field_mappings,
      fieldMappingsType: typeof (data as any).field_mappings,
      fieldMappingsLength: Array.isArray((data as any).field_mappings)
        ? (data as any).field_mappings.length
        : "not-array",
      hasCustomMappings: !!(data as any).custom_field_mappings,
      customMappingsType: typeof (data as any).custom_field_mappings,
      version: (data as any).field_mappings_version,
    });

    return {
      version: (data as any).field_mappings_version || "1.0",
      created_at: (data as any).created_at,
      updated_at: (data as any).updated_at,
      mappings: (data as any).field_mappings || [],
      custom_mappings: (data as any).custom_field_mappings || [],
      auto_create_contact: true,
      default_lead_source: "Facebook Lead Form",
    };
  } catch (error) {
    console.error("Error retrieving field mappings:", error);
    return null;
  }
}

/**
 * Validate field mappings
 */
export function validateMappings(mappings: FieldMapping[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const crmFields = new Set<string>();

  for (const mapping of mappings) {
    // Check for required fields
    if (!mapping.facebook_field_name) {
      errors.push(`Missing Facebook field name for mapping ${mapping.id}`);
    }

    if (!mapping.crm_field) {
      errors.push(
        `Missing CRM field for Facebook field ${mapping.facebook_field_name}`,
      );
    }

    // Check for duplicate CRM field mappings (except custom fields)
    if (
      mapping.crm_field_type === "standard" &&
      crmFields.has(mapping.crm_field)
    ) {
      errors.push(`Duplicate mapping to CRM field: ${mapping.crm_field}`);
    }
    crmFields.add(mapping.crm_field);

    // Validate transformation options
    if (mapping.transformation) {
      const validationResult = validateTransformation(mapping.transformation);
      if (!validationResult.valid) {
        errors.push(...validationResult.errors);
      }
    }
  }

  // Check for essential fields
  const hasContactInfo = mappings.some((m) =>
    ["email", "phone", "full_name", "first_name"].includes(m.crm_field),
  );

  if (!hasContactInfo) {
    errors.push(
      "Warning: No contact information fields (email, phone, or name) mapped",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate transformation configuration
 */
function validateTransformation(transformation: FieldTransformation): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (transformation.type) {
    case "phone_format":
      if (transformation.options?.phone_region) {
        // Validate region code (basic check)
        const validRegions = ["GB", "US", "CA", "AU", "FR", "DE", "ES", "IT"];
        if (!validRegions.includes(transformation.options.phone_region)) {
          errors.push(
            `Invalid phone region: ${transformation.options.phone_region}`,
          );
        }
      }
      break;

    case "date_format":
      if (transformation.options?.date_format) {
        // Basic date format validation
        const validFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
        if (!validFormats.includes(transformation.options.date_format)) {
          errors.push(
            `Invalid date format: ${transformation.options.date_format}`,
          );
        }
      }
      break;

    case "boolean":
      if (transformation.options?.boolean_mapping) {
        if (
          !transformation.options.boolean_mapping.true ||
          !transformation.options.boolean_mapping.false
        ) {
          errors.push(
            "Boolean mapping must specify both true and false values",
          );
        }
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get suggested mappings for unmapped fields
 */
export function getSuggestedMappings(
  facebookFields: FacebookFormField[],
  existingMappings: FieldMapping[],
): FieldMapping[] {
  const mappedFieldIds = new Set(existingMappings.map((m) => m.id));
  const suggestions: FieldMapping[] = [];

  for (const field of facebookFields) {
    if (!mappedFieldIds.has(field.id)) {
      const mapping = detectFieldMapping(field);
      if (mapping && mapping.auto_detected) {
        suggestions.push(mapping);
      }
    }
  }

  return suggestions;
}

/**
 * Merge auto-detected mappings with existing saved mappings
 */
export function mergeMappings(
  autoDetected: FieldMapping[],
  saved: FieldMapping[],
): FieldMapping[] {
  const merged = new Map<string, FieldMapping>();

  // Add saved mappings first (they take precedence)
  for (const mapping of saved) {
    merged.set(mapping.id, mapping);
  }

  // Add auto-detected mappings for new fields
  for (const mapping of autoDetected) {
    if (!merged.has(mapping.id)) {
      merged.set(mapping.id, mapping);
    }
  }

  return Array.from(merged.values());
}

/**
 * Create default field mappings for a new form
 */
export function createDefaultMappings(): StoredFieldMappings {
  return {
    version: "1.0",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    mappings: [],
    custom_mappings: [
      {
        field_name: "lead_source",
        field_value: "Facebook",
        is_static: true,
      },
      {
        field_name: "status",
        field_value: "new",
        is_static: true,
      },
    ],
    auto_create_contact: true,
    default_lead_source: "Facebook",
  };
}

/**
 * FacebookFieldMappingService class wrapper for API compatibility
 */
export class FacebookFieldMappingService {
  async autoDetectFieldMappings(
    questions: FacebookQuestion[],
  ): Promise<FieldMapping[]> {
    return autoDetectFieldMappings(questions);
  }

  async applyFieldMappings(
    leadData: any,
    fieldMappings: StoredFieldMappings,
  ): Promise<any> {
    return applyFieldMappings(leadData, fieldMappings);
  }

  async saveFieldMappings(
    organizationId: string,
    formId: string,
    mappings: StoredFieldMappings,
  ): Promise<{ success: boolean; error?: string }> {
    return saveFieldMappings(organizationId, formId, mappings);
  }

  async getFieldMappings(
    formId: string,
    organizationId: string,
  ): Promise<StoredFieldMappings | null> {
    return getFieldMappings(formId, organizationId);
  }

  validateMappings(mappings: any): {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    // Handle both array and StoredFieldMappings format
    const mappingsArray = Array.isArray(mappings)
      ? mappings
      : mappings.mappings || [];
    return validateMappings(mappingsArray);
  }

  getSuggestedMappings(questions: FacebookQuestion[]): FieldMapping[] {
    return getSuggestedMappings(questions);
  }

  mergeMappings(
    saved: FieldMapping[],
    autoDetected: FieldMapping[],
  ): FieldMapping[] {
    return mergeMappings(saved, autoDetected);
  }

  createDefaultMappings(): StoredFieldMappings {
    return createDefaultMappings();
  }
}
