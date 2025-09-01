import { z } from 'zod'

export type TriggerKind = 'webhook'
export type ContentType = 'application/json' | 'application/x-www-form-urlencoded'

export interface WebhookVerifyConfig {
  algorithm: 'hmac-sha256'
  signatureHeader: 'X-Atlas-Signature'
  timestampHeader: 'X-Atlas-Timestamp'
  toleranceSeconds: number
}

export interface WebhookDedupeConfig {
  header?: string
  jsonPath?: string
  windowSeconds: number
}

export interface WebhookTriggerData {
  kind: 'webhook'
  name?: string
  description?: string
  endpoint: string
  secretId: string
  secretLast4: string
  verify: WebhookVerifyConfig
  contentTypes: ContentType[]
  ipAllowlist: string[]
  dedupe?: WebhookDedupeConfig
  paused: boolean
  active: boolean
}

// Zod validation schemas
export const contentTypeSchema = z.enum(['application/json', 'application/x-www-form-urlencoded'])

export const webhookVerifyConfigSchema = z.object({
  algorithm: z.literal('hmac-sha256'),
  signatureHeader: z.literal('X-Atlas-Signature'),
  timestampHeader: z.literal('X-Atlas-Timestamp'),
  toleranceSeconds: z.number().min(30).max(600).default(300) // 5 minutes default, 30s min, 10min max
})

export const webhookDedupeConfigSchema = z.object({
  header: z.string().optional(),
  jsonPath: z.string().optional(),
  windowSeconds: z.number().min(60).max(3600).default(300) // 5 minutes default, 1min min, 1hour max
}).refine((data) => data.header || data.jsonPath, {
  message: "Either header or jsonPath must be specified"
})

export const ipAddressSchema = z.string().regex(
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[1-2]?[0-9]))?$/,
  "Invalid IP address or CIDR notation"
)

export const webhookTriggerDataSchema = z.object({
  kind: z.literal('webhook'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  endpoint: z.string().url(),
  secretId: z.string().uuid(),
  secretLast4: z.string().length(4),
  verify: webhookVerifyConfigSchema,
  contentTypes: z.array(contentTypeSchema).min(1),
  ipAllowlist: z.array(ipAddressSchema).max(20),
  dedupe: webhookDedupeConfigSchema.optional(),
  paused: z.boolean(),
  active: z.boolean()
})

// Helper types for webhook delivery tracking
export interface WebhookDelivery {
  id: string
  workflowId: string
  nodeId: string
  timestamp: Date
  method: 'POST'
  headers: Record<string, string>
  body: string
  contentType: ContentType
  sourceIp: string
  signatureValid: boolean
  timestampValid: boolean
  dedupeKey?: string
  status: 'accepted' | 'rejected' | 'duplicate'
  errorMessage?: string
  processingTimeMs: number
}

export interface WebhookSecret {
  id: string
  workflowId: string
  nodeId: string
  secretHash: string
  last4: string
  createdAt: Date
  expiresAt?: Date
}

export interface WebhookStats {
  totalDeliveries: number
  acceptedDeliveries: number
  rejectedDeliveries: number
  duplicateDeliveries: number
  lastDelivery?: Date
  avgProcessingTimeMs: number
}