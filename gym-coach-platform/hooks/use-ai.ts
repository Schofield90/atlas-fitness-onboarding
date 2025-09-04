import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { apiClient } from '@/lib/api/client' // Temporarily commented out
import { toast } from 'react-hot-toast'

// Temporary mock until API client is properly implemented
const apiClient = {
  getAIInsights: () => Promise.resolve([]),
  getAIRecommendations: () => Promise.resolve([]),
  actOnRecommendation: () => Promise.resolve({}),
  analyzeLead: () => Promise.resolve({}),
  bulkAnalyzeLeads: () => Promise.resolve({ summary: { analyzed: 0, skipped: 0, errors: 0 } }),
  getAIJobStatus: () => Promise.resolve({ status: 'idle' }),
  manageAIJob: () => Promise.resolve({}),
  getLead: () => Promise.resolve({}),
}

// AI Insights hooks
export function useAIInsights() {
  return useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => apiClient.getAIInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

// AI Recommendations hooks
export function useAIRecommendations() {
  return useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: () => apiClient.getAIRecommendations(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export function useActOnRecommendation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ lead_id, action_type }: { lead_id: string; action_type: string }) =>
      apiClient.actOnRecommendation(lead_id, action_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Lead Analysis hooks
export function useAnalyzeLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (leadId: string) => apiClient.analyzeLead(leadId),
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', leadId] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Lead analyzed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useBulkAnalyzeLeads() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ lead_ids, force_reanalyze = false }: { 
      lead_ids: string[]
      force_reanalyze?: boolean 
    }) => apiClient.bulkAnalyzeLeads(lead_ids, force_reanalyze),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      
      const { summary } = result as any
      toast.success(
        `Bulk analysis completed: ${summary.analyzed} analyzed, ${summary.skipped} skipped, ${summary.errors} errors`
      )
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Job Management hooks
export function useAIJobStatus() {
  return useQuery({
    queryKey: ['ai', 'job', 'status'],
    queryFn: () => apiClient.getAIJobStatus(),
    refetchInterval: 30 * 1000, // Check every 30 seconds
  })
}

export function useManageAIJob() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ action, config }: { action: string; config?: any }) =>
      apiClient.manageAIJob(action, config),
    onSuccess: (result, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'job', 'status'] })
      
      const messages = {
        start: 'AI job started successfully',
        stop: 'AI job stopped successfully',
        restart: 'AI job restarted successfully',
        run_manual: 'Manual analysis completed',
        update_config: 'Job configuration updated',
      }
      
      toast.success(messages[action as keyof typeof messages] || 'Action completed')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Helper function to get lead analysis status
export function useLeadAnalysisStatus(leadId: string) {
  return useQuery({
    queryKey: ['leads', leadId, 'analysis'],
    queryFn: () => apiClient.getLead(leadId),
    enabled: !!leadId,
    select: (data) => ({
      hasAnalysis: !!(data as any)?.ai_analysis,
      analysis: (data as any)?.ai_analysis,
      score: (data as any)?.lead_score,
      lastAnalyzed: (data as any)?.updated_at,
    }),
  })
}