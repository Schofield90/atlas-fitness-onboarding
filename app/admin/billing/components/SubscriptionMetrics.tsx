'use client'

interface SubscriptionMetricsProps {
  stats: any
}

export default function SubscriptionMetrics({ stats }: SubscriptionMetricsProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    canceled: 'bg-red-100 text-red-800',
    incomplete: 'bg-gray-100 text-gray-800'
  }

  const planColors: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-800',
    pro: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-indigo-100 text-indigo-800'
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Breakdown</h3>
      
      <div className="space-y-6">
        {/* By Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Status</h4>
          <div className="space-y-2">
            {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                    {status}
                  </span>
                  <span className="ml-3 text-sm text-gray-600">{count as number} gyms</span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      status === 'active' ? 'bg-green-500' :
                      status === 'trialing' ? 'bg-blue-500' :
                      status === 'past_due' ? 'bg-yellow-500' :
                      status === 'canceled' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}
                    style={{ 
                      width: `${((count as number) / Object.values(stats?.byStatus || {}).reduce((a: any, b: any) => a + b, 0) as number) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Plan */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Plan</h4>
          <div className="space-y-2">
            {Object.entries(stats?.byPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${planColors[plan] || 'bg-gray-100 text-gray-800'}`}>
                    {plan}
                  </span>
                  <span className="ml-3 text-sm text-gray-600">{count as number} gyms</span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      plan === 'enterprise' ? 'bg-indigo-500' :
                      plan === 'pro' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}
                    style={{ 
                      width: `${((count as number) / Object.values(stats?.byPlan || {}).reduce((a: any, b: any) => a + b, 0) as number) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}