import { z } from 'zod'

// Organization schemas
export const organizationUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  subscription_plan: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
  subscription_status: z.enum(['active', 'cancelled', 'expired']).optional(),
  settings: z.record(z.any()).optional()
})

// Lead schemas
export const leadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  campaign_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  qualification_notes: z.string().optional(),
  assigned_to: z.string().uuid().optional()
})

export const leadUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['cold', 'warm', 'hot', 'converted', 'lost']).optional(),
  lead_score: z.number().min(0).max(100).optional(),
  source: z.string().optional(),
  campaign_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  qualification_notes: z.string().optional(),
  assigned_to: z.string().uuid().optional()
})

// Client schemas
export const clientCreateSchema = z.object({
  lead_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  membership_type: z.string().min(1, 'Membership type is required'),
  membership_status: z.enum(['active', 'paused', 'cancelled']).optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  total_revenue: z.number().min(0).optional(),
  engagement_score: z.number().min(0).max(100).optional(),
  preferences: z.record(z.any()).optional()
})

export const clientUpdateSchema = z.object({
  lead_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  membership_type: z.string().optional(),
  membership_status: z.enum(['active', 'paused', 'cancelled']).optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  total_revenue: z.number().min(0).optional(),
  engagement_score: z.number().min(0).max(100).optional(),
  preferences: z.record(z.any()).optional()
})

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1)),
  limit: z.string().transform(val => parseInt(val) || 10).pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
  status: z.string().optional(),
  sort: z.enum(['created_at', 'updated_at', 'name', 'email']).optional(),
  order: z.enum(['asc', 'desc']).optional()
})

export const leadQuerySchema = paginationSchema.extend({
  status: z.enum(['cold', 'warm', 'hot', 'converted', 'lost']).optional(),
  assigned_to: z.string().uuid().optional(),
  source: z.string().optional()
})

export const clientQuerySchema = paginationSchema.extend({
  membership_status: z.enum(['active', 'paused', 'cancelled']).optional(),
  membership_type: z.string().optional()
})