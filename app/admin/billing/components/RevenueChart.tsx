'use client'

import { useEffect, useState } from 'react'

export default function RevenueChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      const res = await fetch('/api/admin/billing/revenue-chart')
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Simple bar chart representation
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Revenue Trend</h3>
      
      <div className="relative h-48">
        <div className="absolute inset-0 flex items-end justify-between space-x-2">
          {data.map((month, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t"
                style={{ 
                  height: `${(month.revenue / maxRevenue) * 100}%`,
                  minHeight: '4px'
                }}
              />
              <span className="text-xs text-gray-500 mt-2">{month.label}</span>
              <span className="text-xs font-medium">£{month.revenue}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Average MRR:</span>
          <span className="ml-2 font-medium">
            £{Math.round(data.reduce((sum, d) => sum + d.revenue, 0) / data.length)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Growth Rate:</span>
          <span className="ml-2 font-medium text-green-600">+12%</span>
        </div>
      </div>
    </div>
  )
}