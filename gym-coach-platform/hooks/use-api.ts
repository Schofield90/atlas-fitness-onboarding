import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { apiClient } from '@/lib/api/client' // Temporarily commented out
import { toast } from 'react-hot-toast'

// Temporary mock until API client is properly implemented
const apiClient = {
  getDashboardMetrics: () => Promise.resolve({}),
  getOrganization: () => Promise.resolve({}),
  updateOrganization: () => Promise.resolve({}),
  getLeads: () => Promise.resolve([]),
  getLead: () => Promise.resolve({}),
  createLead: () => Promise.resolve({}),
  updateLead: () => Promise.resolve({}),
  deleteLead: () => Promise.resolve({}),
  bulkImportLeads: () => Promise.resolve({ imported: 0, failed: 0 }),
  exportLeads: () => Promise.resolve({}),
  getClients: () => Promise.resolve([]),
  getClient: () => Promise.resolve({}),
  createClient: () => Promise.resolve({}),
  updateClient: () => Promise.resolve({}),
  deleteClient: () => Promise.resolve({}),
  getMe: () => Promise.resolve({}),
  updateProfile: () => Promise.resolve({}),
}

// Dashboard hooks
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => apiClient.getDashboardMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time data
  })
}

// Organization hooks
export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => apiClient.getOrganization(),
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      toast.success('Organization updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Lead hooks
export function useLeads(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => apiClient.getLeads(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => apiClient.getLead(id),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Lead created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Lead updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Lead deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useBulkImportLeads() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { leads: any[] }) => apiClient.bulkImportLeads(data.leads),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      
      if (result.failed > 0) {
        toast.success(
          `Import completed: ${result.imported} imported, ${result.failed} failed`,
          { duration: 5000 }
        )
      } else {
        toast.success(`Successfully imported ${result.imported} leads`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })
}

export function useExportLeads() {
  return useMutation({
    mutationFn: (params?: Record<string, any>) => apiClient.exportLeads(params),
    onSuccess: () => {
      toast.success('Export completed successfully')
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`)
    },
  })
}

// Client hooks
export function useClients(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => apiClient.getClients(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => apiClient.getClient(id),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Client created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateClient(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Client updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
      toast.success('Client deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Auth hooks
export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.getMe(),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}