import { Database } from '@/app/lib/supabase/database.types'

export type SOP = Database['public']['Tables']['sops']['Row']
export type SOPInsert = Database['public']['Tables']['sops']['Insert']
export type SOPUpdate = Database['public']['Tables']['sops']['Update']

export type SOPVersion = Database['public']['Tables']['sop_versions']['Row']
export type SOPVersionInsert = Database['public']['Tables']['sop_versions']['Insert']

export type SOPTrainingRecord = Database['public']['Tables']['sop_training_records']['Row']
export type SOPTrainingRecordInsert = Database['public']['Tables']['sop_training_records']['Insert']
export type SOPTrainingRecordUpdate = Database['public']['Tables']['sop_training_records']['Update']

export type SOPCategory = Database['public']['Tables']['sop_categories']['Row']
export type SOPCategoryInsert = Database['public']['Tables']['sop_categories']['Insert']
export type SOPCategoryUpdate = Database['public']['Tables']['sop_categories']['Update']

export type SOPComment = Database['public']['Tables']['sop_comments']['Row']
export type SOPCommentInsert = Database['public']['Tables']['sop_comments']['Insert']

export interface SOPWithDetails extends SOP {
  category_info?: SOPCategory
  creator?: {
    id: string
    name: string
    email: string
  }
  approver?: {
    id: string
    name: string
    email: string
  }
  training_stats?: {
    total_assigned: number
    completed: number
    in_progress: number
    overdue: number
  }
  comments_count?: number
  versions_count?: number
}

export interface SOPAnalysisResult {
  summary: string
  key_points: string[]
  complexity_score: number
  related_sops: string[]
  suggested_tags: string[]
  training_recommendations: {
    required: boolean
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimated_time_minutes: number
  }
}

export interface SOPSearchResult {
  sop: SOPWithDetails
  relevance_score: number
  matching_sections: Array<{
    content: string
    score: number
  }>
}

export interface SOPTrainingProgress {
  user_id: string
  user_name: string
  sop_id: string
  sop_title: string
  status: SOPTrainingRecord['status']
  progress_percentage: number
  assigned_at: string
  completed_at?: string
  quiz_score?: number
  quiz_passed?: boolean
}

export interface SOPFilters {
  category?: string
  tags?: string[]
  status?: SOP['status']
  created_by?: string
  date_range?: {
    from: string
    to: string
  }
  training_required?: boolean
  search?: string
}

export interface SOPDocumentUpload {
  file: File
  title: string
  category: string
  description?: string
  tags?: string[]
  training_required?: boolean
}

export interface SOPChatContext {
  sop_id: string
  sop_title: string
  user_question: string
  context_sections: string[]
  related_sops: string[]
}

export interface SOPChatResponse {
  answer: string
  confidence: number
  sources: Array<{
    sop_id: string
    title: string
    section: string
  }>
  follow_up_questions: string[]
}

export const SOP_STATUSES = {
  DRAFT: 'draft' as const,
  REVIEW: 'review' as const,
  APPROVED: 'approved' as const,
  ARCHIVED: 'archived' as const,
}

export const TRAINING_STATUSES = {
  ASSIGNED: 'assigned' as const,
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const,
  OVERDUE: 'overdue' as const,
}

export const CONTENT_TYPES = {
  MARKDOWN: 'markdown' as const,
  HTML: 'html' as const,
  DOCUMENT: 'document' as const,
}

export const DEFAULT_CATEGORIES = [
  'Safety Procedures',
  'Customer Service',
  'Equipment Operation',
  'Cleaning & Maintenance',
  'Emergency Procedures',
  'Administrative Tasks',
  'Training & Development',
  'Health & Wellness',
  'Sales & Marketing',
  'Management',
]