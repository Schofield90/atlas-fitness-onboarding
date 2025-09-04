'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { SOPWithDetails, SOPFilters, SOP_STATUSES } from '@/app/lib/types/sop'

interface SOPListProps {
  onSelectSOP: (sop: SOPWithDetails) => void
  onCreateNew: () => void
  filters?: SOPFilters
  onFiltersChange?: (filters: SOPFilters) => void
}

export function SOPList({ 
  onSelectSOP, 
  onCreateNew, 
  filters = {}, 
  onFiltersChange 
}: SOPListProps) {
  const [sops, setSOPs] = useState<SOPWithDetails[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [searchTerm, setSearchTerm] = useState(filters.search || '')

  useEffect(() => {
    fetchSOPs()
  }, [filters])

  const fetchSOPs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.training_required !== undefined && { 
          training_required: filters.training_required.toString() 
        }),
        ...(filters.search && { search: filters.search }),
        ...(filters.tags && { tags: filters.tags.join(',') })
      })

      const response = await fetch(`/api/sops?${params}`)
      if (!response.ok) throw new Error('Failed to fetch SOPs')

      const data = await response.json()
      setSOPs(data.sops)
      setCategories(data.categories)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching SOPs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (onFiltersChange) {
      onFiltersChange({ ...filters, search: term })
    }
  }

  const handleFilterChange = (key: keyof SOPFilters, value: any) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, [key]: value })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case SOP_STATUSES.APPROVED:
        return 'bg-green-100 text-green-800'
      case SOP_STATUSES.REVIEW:
        return 'bg-yellow-100 text-yellow-800'
      case SOP_STATUSES.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case SOP_STATUSES.ARCHIVED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Standard Operating Procedures</h2>
          <p className="text-gray-600 mt-1">
            Manage your gym's operational procedures and training materials
          </p>
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          Create New SOP
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search SOPs
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by title, description, or content..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
              className="w-full min-w-[10rem] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full min-w-[10rem] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value={SOP_STATUSES.APPROVED}>Approved</option>
              <option value={SOP_STATUSES.REVIEW}>Under Review</option>
              <option value={SOP_STATUSES.DRAFT}>Draft</option>
              <option value={SOP_STATUSES.ARCHIVED}>Archived</option>
            </select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="flex gap-4 mt-4 pt-4 border-t">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.training_required === true}
              onChange={(e) => 
                handleFilterChange('training_required', e.target.checked ? true : undefined)
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Training Required Only</span>
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {sops.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No SOPs found</h3>
            <p className="text-gray-400 mb-4">
              {Object.keys(filters).some(key => filters[key as keyof SOPFilters])
                ? "Try adjusting your filters or search terms"
                : "Get started by creating your first SOP"
              }
            </p>
            <Button onClick={onCreateNew} className="bg-orange-600 hover:bg-orange-700">
              Create Your First SOP
            </Button>
          </Card>
        ) : (
          <>
            {sops.map((sop) => (
              <Card 
                key={sop.id} 
                className="p-6 bg-gray-800 hover:bg-gray-750 transition-all cursor-pointer border border-gray-700"
                onClick={() => onSelectSOP(sop)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {sop.title}
                      </h3>
                      <Badge className={getStatusColor(sop.status)}>
                        {sop.status}
                      </Badge>
                      {sop.training_required && (
                        <Badge className="bg-purple-900 text-purple-400">
                          Training Required
                        </Badge>
                      )}
                    </div>
                    
                    {sop.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {sop.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Category: {sop.category}</span>
                      <span>Version: {sop.version}</span>
                      <span>Updated: {formatDate(sop.updated_at)}</span>
                      {sop.creator && (
                        <span>by {sop.creator.name}</span>
                      )}
                    </div>

                    {sop.tags && sop.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {sop.tags.slice(0, 5).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {sop.tags.length > 5 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            +{sop.tags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end ml-4">
                    {sop.training_stats && (
                      <div className="text-right text-sm text-gray-400 mb-2">
                        <div>Training Progress</div>
                        <div className="text-xs">
                          {sop.training_stats.completed}/{sop.training_stats.total_assigned} completed
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {sop.ai_summary && (
                        <span className="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded">
                          AI Analyzed
                        </span>
                      )}
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                >
                  Previous
                </Button>
                
                <span className="px-4 py-2 text-sm text-gray-300">
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}