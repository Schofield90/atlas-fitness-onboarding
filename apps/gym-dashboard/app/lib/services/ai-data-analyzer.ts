/**
 * AI Data Analyzer for GoTeamUp Migration
 * Uses OpenAI to intelligently analyze and map GoTeamUp data to Atlas Fitness schema
 */

import OpenAI from "openai";
import { supabaseAdmin } from "../supabase/admin";

// Lazy load OpenAI client to avoid browser environment errors during build
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export interface DataAnalysisResult {
  dataTypes: Record<string, string>;
  columns: ColumnAnalysis[];
  qualityScore: number;
  validRows: number;
  fieldMappings: FieldMapping[];
  recommendations: string[];
  potentialIssues: Issue[];
}

export interface ColumnAnalysis {
  name: string;
  dataType: string;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
  pattern: string | null;
  confidence: number;
}

export interface FieldMapping {
  sourceField: string;
  targetTable: string;
  targetField: string;
  sourceDataType: string;
  targetDataType: string;
  transformationType:
    | "direct"
    | "format"
    | "lookup"
    | "split"
    | "merge"
    | "calculate";
  transformationConfig: any;
  confidence: number;
  isRequired: boolean;
  priority: number;
  sampleValues: string[];
}

export interface Issue {
  type: "warning" | "error";
  field: string;
  message: string;
  suggestedFix: string;
  affectedRows: number;
}

// GoTeamUp to Atlas Fitness field mappings knowledge base
const GOTEAMUP_FIELD_MAPPINGS = {
  // Client/Member mappings
  first_name: { table: "clients", field: "first_name", type: "direct" },
  last_name: { table: "clients", field: "last_name", type: "direct" },
  email: { table: "clients", field: "email", type: "direct" },
  phone: { table: "clients", field: "phone", type: "format" },
  mobile: { table: "clients", field: "phone", type: "format" },
  address: { table: "clients", field: "address", type: "direct" },
  date_of_birth: { table: "clients", field: "date_of_birth", type: "format" },
  dob: { table: "clients", field: "date_of_birth", type: "format" },
  gender: { table: "clients", field: "gender", type: "direct" },
  emergency_contact: {
    table: "clients",
    field: "emergency_contact_name",
    type: "direct",
  },
  emergency_phone: {
    table: "clients",
    field: "emergency_contact_phone",
    type: "format",
  },
  medical_conditions: { table: "clients", field: "notes", type: "merge" },
  notes: { table: "clients", field: "notes", type: "merge" },

  // Membership mappings
  membership_type: {
    table: "customer_memberships",
    field: "membership_plan_id",
    type: "lookup",
  },
  membership_status: {
    table: "customer_memberships",
    field: "status",
    type: "direct",
  },
  start_date: {
    table: "customer_memberships",
    field: "start_date",
    type: "format",
  },
  end_date: {
    table: "customer_memberships",
    field: "end_date",
    type: "format",
  },
  monthly_fee: {
    table: "customer_memberships",
    field: "monthly_price",
    type: "format",
  },
  payment_method: {
    table: "customer_memberships",
    field: "payment_method",
    type: "direct",
  },

  // Class/Booking mappings
  class_name: { table: "classes", field: "name", type: "direct" },
  instructor: { table: "classes", field: "instructor_name", type: "direct" },
  class_date: { table: "class_bookings", field: "class_date", type: "format" },
  class_time: { table: "class_bookings", field: "class_time", type: "format" },
  booking_status: { table: "class_bookings", field: "status", type: "direct" },
  attended: { table: "class_bookings", field: "attended", type: "format" },

  // Payment mappings
  payment_amount: {
    table: "payment_transactions",
    field: "amount_cents",
    type: "calculate",
  },
  payment_date: {
    table: "payment_transactions",
    field: "transaction_date",
    type: "format",
  },
  payment_reference: {
    table: "payment_transactions",
    field: "reference",
    type: "direct",
  },
};

// Atlas Fitness schema knowledge for validation
const ATLAS_SCHEMA = {
  clients: {
    required: ["first_name", "last_name", "email", "organization_id"],
    optional: [
      "phone",
      "address",
      "date_of_birth",
      "gender",
      "notes",
      "emergency_contact_name",
      "emergency_contact_phone",
    ],
    types: {
      first_name: "string",
      last_name: "string",
      email: "email",
      phone: "phone",
      date_of_birth: "date",
      organization_id: "uuid",
    },
  },
  customer_memberships: {
    required: ["client_id", "membership_plan_id", "organization_id"],
    optional: [
      "start_date",
      "end_date",
      "status",
      "monthly_price",
      "payment_method",
    ],
    types: {
      client_id: "uuid",
      membership_plan_id: "uuid",
      start_date: "date",
      end_date: "date",
      monthly_price: "integer",
      organization_id: "uuid",
    },
  },
  class_bookings: {
    required: ["client_id", "class_id", "organization_id"],
    optional: ["status", "attended", "booking_date", "notes"],
    types: {
      client_id: "uuid",
      class_id: "uuid",
      booking_date: "datetime",
      organization_id: "uuid",
    },
  },
};

/**
 * Analyze GoTeamUp data with AI to create intelligent field mappings
 */
export async function analyzeDataWithAI(
  data: any[],
  sourcePlatform: string = "goteamup",
): Promise<DataAnalysisResult> {
  if (!data || data.length === 0) {
    throw new Error("No data provided for analysis");
  }

  console.log(
    `Starting AI analysis for ${data.length} records from ${sourcePlatform}`,
  );

  // Sample data for AI analysis (first 10 rows)
  const sampleData = data.slice(0, 10);
  const headers = Object.keys(data[0]);

  // Analyze columns
  const columns = await analyzeColumns(data, headers);

  // Generate field mappings with AI
  const fieldMappings = await generateFieldMappings(
    sampleData,
    headers,
    columns,
  );

  // Detect data quality issues
  const { qualityScore, validRows, issues } = await analyzeDataQuality(
    data,
    columns,
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    columns,
    fieldMappings,
    issues,
  );

  return {
    dataTypes: columns.reduce(
      (acc, col) => {
        acc[col.name] = col.dataType;
        return acc;
      },
      {} as Record<string, string>,
    ),
    columns,
    qualityScore,
    validRows,
    fieldMappings,
    recommendations,
    potentialIssues: issues,
  };
}

/**
 * Analyze individual columns to detect data types and patterns
 */
async function analyzeColumns(
  data: any[],
  headers: string[],
): Promise<ColumnAnalysis[]> {
  const columns: ColumnAnalysis[] = [];

  for (const header of headers) {
    const values = data
      .map((row) => row[header])
      .filter((v) => v != null && v !== "");
    const uniqueValues = [...new Set(values)];
    const sampleValues = uniqueValues.slice(0, 5);

    // Detect data type
    const dataType = detectDataType(values);

    // Detect pattern
    const pattern = detectPattern(values, dataType);

    // Calculate confidence based on consistency
    const confidence = calculateConfidence(values, dataType);

    columns.push({
      name: header,
      dataType,
      sampleValues: sampleValues.map((v) => String(v)),
      nullCount: data.length - values.length,
      uniqueCount: uniqueValues.length,
      pattern,
      confidence,
    });
  }

  return columns;
}

/**
 * Generate intelligent field mappings using AI
 */
async function generateFieldMappings(
  sampleData: any[],
  headers: string[],
  columns: ColumnAnalysis[],
): Promise<FieldMapping[]> {
  const mappings: FieldMapping[] = [];

  try {
    // Create AI prompt for field mapping
    const prompt = createFieldMappingPrompt(sampleData, headers, columns);

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert data migration assistant specializing in fitness management systems. 
          Analyze GoTeamUp data and map it to Atlas Fitness CRM schema. 
          Return valid JSON only with field mappings.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const aiMappings = JSON.parse(response.choices[0].message.content || "[]");

    // Process AI mappings and add confidence scores
    for (const mapping of aiMappings) {
      const sourceColumn = columns.find(
        (col) => col.name === mapping.sourceField,
      );

      mappings.push({
        sourceField: mapping.sourceField,
        targetTable: mapping.targetTable,
        targetField: mapping.targetField,
        sourceDataType: sourceColumn?.dataType || "string",
        targetDataType: mapping.targetDataType,
        transformationType: mapping.transformationType || "direct",
        transformationConfig: mapping.transformationConfig || {},
        confidence: calculateMappingConfidence(mapping, sourceColumn),
        isRequired: isRequiredField(mapping.targetTable, mapping.targetField),
        priority: calculateMappingPriority(mapping),
        sampleValues: sourceColumn?.sampleValues || [],
      });
    }
  } catch (error) {
    console.error(
      "AI mapping failed, falling back to rule-based mapping:",
      error,
    );
    // Fallback to rule-based mapping
    return generateRuleBasedMappings(headers, columns);
  }

  return mappings;
}

/**
 * Fallback rule-based mapping when AI fails
 */
function generateRuleBasedMappings(
  headers: string[],
  columns: ColumnAnalysis[],
): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const column = columns.find((col) => col.name === header);

    // Try to find mapping in knowledge base
    const knownMapping = GOTEAMUP_FIELD_MAPPINGS[normalizedHeader];

    if (knownMapping) {
      mappings.push({
        sourceField: header,
        targetTable: knownMapping.table,
        targetField: knownMapping.field,
        sourceDataType: column?.dataType || "string",
        targetDataType: getTargetDataType(
          knownMapping.table,
          knownMapping.field,
        ),
        transformationType: knownMapping.type as any,
        transformationConfig: {},
        confidence: 0.8,
        isRequired: isRequiredField(knownMapping.table, knownMapping.field),
        priority: isRequiredField(knownMapping.table, knownMapping.field)
          ? 1
          : 2,
        sampleValues: column?.sampleValues || [],
      });
    } else {
      // Try fuzzy matching
      const fuzzyMatch = findFuzzyMatch(normalizedHeader);
      if (fuzzyMatch) {
        mappings.push({
          sourceField: header,
          targetTable: fuzzyMatch.table,
          targetField: fuzzyMatch.field,
          sourceDataType: column?.dataType || "string",
          targetDataType: getTargetDataType(fuzzyMatch.table, fuzzyMatch.field),
          transformationType: "direct",
          transformationConfig: {},
          confidence: 0.6,
          isRequired: false,
          priority: 3,
          sampleValues: column?.sampleValues || [],
        });
      }
    }
  }

  return mappings;
}

/**
 * Analyze data quality and detect issues
 */
async function analyzeDataQuality(
  data: any[],
  columns: ColumnAnalysis[],
): Promise<{ qualityScore: number; validRows: number; issues: Issue[] }> {
  const issues: Issue[] = [];
  let validRowCount = 0;

  // Check each row for data quality issues
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let rowIsValid = true;

    // Validate each field in the row
    for (const column of columns) {
      const value = row[column.name];

      // Check for required field violations
      if (value == null || value === "") {
        const mapping = findMappingForField(column.name);
        if (mapping && mapping.isRequired) {
          issues.push({
            type: "error",
            field: column.name,
            message: `Required field is empty in row ${i + 1}`,
            suggestedFix: "Provide a default value or mark as optional",
            affectedRows: 1,
          });
          rowIsValid = false;
        }
      }

      // Check data format issues
      if (value && !validateDataFormat(value, column.dataType)) {
        issues.push({
          type: "warning",
          field: column.name,
          message: `Invalid ${column.dataType} format in row ${i + 1}: "${value}"`,
          suggestedFix: `Convert to valid ${column.dataType} format`,
          affectedRows: 1,
        });
      }
    }

    if (rowIsValid) {
      validRowCount++;
    }
  }

  // Calculate overall quality score
  const qualityScore = Math.round((validRowCount / data.length) * 100) / 100;

  return {
    qualityScore,
    validRows: validRowCount,
    issues: consolidateIssues(issues),
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  columns: ColumnAnalysis[],
  mappings: FieldMapping[],
  issues: Issue[],
): string[] {
  const recommendations: string[] = [];

  // Check mapping coverage
  const unmappedColumns = columns.filter(
    (col) => !mappings.some((mapping) => mapping.sourceField === col.name),
  );

  if (unmappedColumns.length > 0) {
    recommendations.push(
      `${unmappedColumns.length} columns could not be automatically mapped: ${unmappedColumns.map((c) => c.name).join(", ")}. Consider manual mapping or creating custom fields.`,
    );
  }

  // Check low confidence mappings
  const lowConfidenceMappings = mappings.filter((m) => m.confidence < 0.7);
  if (lowConfidenceMappings.length > 0) {
    recommendations.push(
      `${lowConfidenceMappings.length} field mappings have low confidence scores. Please review these mappings before proceeding.`,
    );
  }

  // Check for critical issues
  const criticalIssues = issues.filter((i) => i.type === "error");
  if (criticalIssues.length > 0) {
    recommendations.push(
      `${criticalIssues.length} critical data issues found. These must be resolved before importing.`,
    );
  }

  // Data format recommendations
  const emailColumns = columns.filter((col) =>
    col.name.toLowerCase().includes("email"),
  );
  if (emailColumns.length > 0) {
    recommendations.push(
      "Email validation will be applied during import. Invalid emails will be flagged for review.",
    );
  }

  // Performance recommendations
  if (columns.length > 50) {
    recommendations.push(
      "Large number of columns detected. Consider batch processing to improve performance.",
    );
  }

  return recommendations;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectDataType(values: any[]): string {
  if (values.length === 0) return "string";

  const sampleSize = Math.min(values.length, 20);
  const sample = values.slice(0, sampleSize);

  // Check for dates
  const datePattern =
    /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  if (sample.every((v) => datePattern.test(String(v)))) {
    return "date";
  }

  // Check for emails
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (sample.every((v) => emailPattern.test(String(v)))) {
    return "email";
  }

  // Check for phone numbers
  const phonePattern = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
  if (sample.every((v) => phonePattern.test(String(v).replace(/\s/g, "")))) {
    return "phone";
  }

  // Check for numbers
  if (sample.every((v) => !isNaN(Number(v)))) {
    return "number";
  }

  // Check for booleans
  if (
    sample.every((v) =>
      ["true", "false", "1", "0", "yes", "no"].includes(
        String(v).toLowerCase(),
      ),
    )
  ) {
    return "boolean";
  }

  return "string";
}

function detectPattern(values: any[], dataType: string): string | null {
  if (dataType === "phone") {
    // Detect common phone patterns
    const patterns = values.slice(0, 5).map((v) =>
      String(v)
        .replace(/\d/g, "X")
        .replace(/[a-zA-Z]/g, "A"),
    );
    const commonPattern = patterns.find(
      (p) => patterns.filter((pp) => pp === p).length > patterns.length / 2,
    );
    return commonPattern || null;
  }

  if (dataType === "date") {
    const sample = String(values[0]);
    if (sample.includes("/")) return "MM/DD/YYYY";
    if (sample.includes("-")) return "YYYY-MM-DD";
  }

  return null;
}

function calculateConfidence(values: any[], expectedType: string): number {
  if (values.length === 0) return 0;

  const validCount = values.filter((v) =>
    validateDataFormat(v, expectedType),
  ).length;
  return Math.round((validCount / values.length) * 100) / 100;
}

function validateDataFormat(value: any, dataType: string): boolean {
  const str = String(value);

  switch (dataType) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    case "phone":
      return /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/.test(str.replace(/\s/g, ""));
    case "date":
      return !isNaN(Date.parse(str));
    case "number":
      return !isNaN(Number(str));
    case "boolean":
      return ["true", "false", "1", "0", "yes", "no"].includes(
        str.toLowerCase(),
      );
    default:
      return true;
  }
}

function createFieldMappingPrompt(
  sampleData: any[],
  headers: string[],
  columns: ColumnAnalysis[],
): string {
  return `
Analyze this GoTeamUp fitness management data and map fields to Atlas Fitness CRM schema.

Sample Data (first 3 rows):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Column Analysis:
${columns.map((col) => `- ${col.name}: ${col.dataType} (confidence: ${col.confidence})`).join("\n")}

Atlas Fitness Schema:
- clients: first_name, last_name, email, phone, address, date_of_birth, gender, notes, emergency_contact_name, emergency_contact_phone
- customer_memberships: membership_plan_id, start_date, end_date, status, monthly_price, payment_method
- class_bookings: class_id, status, attended, booking_date, notes
- payment_transactions: amount_cents, transaction_date, reference, payment_method

Rules:
1. Map GoTeamUp fields to most appropriate Atlas fields
2. Suggest transformation type: direct, format, lookup, split, merge, calculate
3. Return JSON array of mappings only

Example output:
[
  {
    "sourceField": "first_name",
    "targetTable": "clients",
    "targetField": "first_name",
    "targetDataType": "string",
    "transformationType": "direct"
  }
]
`;
}

function calculateMappingConfidence(
  mapping: any,
  sourceColumn?: ColumnAnalysis,
): number {
  let confidence = 0.5; // Base confidence

  // Exact field name match
  if (mapping.sourceField.toLowerCase() === mapping.targetField.toLowerCase()) {
    confidence += 0.3;
  }

  // Data type compatibility
  if (
    sourceColumn &&
    isDataTypeCompatible(sourceColumn.dataType, mapping.targetDataType)
  ) {
    confidence += 0.2;
  }

  // Known mapping exists
  const normalizedSource = mapping.sourceField
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  if (GOTEAMUP_FIELD_MAPPINGS[normalizedSource]) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

function isDataTypeCompatible(sourceType: string, targetType: string): boolean {
  const compatibilityMap = {
    string: ["string", "text"],
    email: ["string", "email"],
    phone: ["string", "phone"],
    number: ["number", "integer", "decimal"],
    date: ["date", "datetime", "timestamp"],
    boolean: ["boolean"],
  };

  const compatibleTypes = compatibilityMap[sourceType] || [sourceType];
  return compatibleTypes.includes(targetType);
}

function isRequiredField(table: string, field: string): boolean {
  const schema = ATLAS_SCHEMA[table];
  return schema ? schema.required.includes(field) : false;
}

function getTargetDataType(table: string, field: string): string {
  const schema = ATLAS_SCHEMA[table];
  return schema?.types?.[field] || "string";
}

function calculateMappingPriority(mapping: any): number {
  if (isRequiredField(mapping.targetTable, mapping.targetField)) {
    return 1; // High priority for required fields
  }
  if (mapping.confidence > 0.8) {
    return 2; // Medium-high priority for high confidence
  }
  return 3; // Standard priority
}

function findMappingForField(fieldName: string): FieldMapping | null {
  const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const knownMapping = GOTEAMUP_FIELD_MAPPINGS[normalizedField];

  if (knownMapping) {
    return {
      sourceField: fieldName,
      targetTable: knownMapping.table,
      targetField: knownMapping.field,
      sourceDataType: "string",
      targetDataType: getTargetDataType(knownMapping.table, knownMapping.field),
      transformationType: knownMapping.type as any,
      transformationConfig: {},
      confidence: 0.8,
      isRequired: isRequiredField(knownMapping.table, knownMapping.field),
      priority: 1,
      sampleValues: [],
    };
  }

  return null;
}

function findFuzzyMatch(
  fieldName: string,
): { table: string; field: string } | null {
  const fuzzyMatches = {
    name: { table: "clients", field: "first_name" },
    contact: { table: "clients", field: "phone" },
    member: { table: "clients", field: "first_name" },
    customer: { table: "clients", field: "first_name" },
  };

  for (const [key, value] of Object.entries(fuzzyMatches)) {
    if (fieldName.includes(key)) {
      return value;
    }
  }

  return null;
}

function consolidateIssues(issues: Issue[]): Issue[] {
  const consolidated = new Map<string, Issue>();

  for (const issue of issues) {
    const key = `${issue.field}-${issue.message.split(" in row ")[0]}`;

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.affectedRows += issue.affectedRows;
    } else {
      consolidated.set(key, { ...issue });
    }
  }

  return Array.from(consolidated.values()).sort(
    (a, b) => b.affectedRows - a.affectedRows,
  );
}
