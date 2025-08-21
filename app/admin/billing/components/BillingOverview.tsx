'use client'

interface BillingOverviewProps {
  overview: any
}

export default function BillingOverview({ overview }: BillingOverviewProps) {
  const metrics = [
    {
      label: 'Active Subscriptions',
      value: overview?.active_subscriptions || 0,
      change: '+12%',
      trend: 'up'
    },
    {
      label: 'Total MRR',
      value: `£${(overview?.total_mrr || 0).toLocaleString()}`,
      change: '+8%',
      trend: 'up'
    },
    {
      label: 'Total ARR',
      value: `£${(overview?.total_arr || 0).toLocaleString()}`,
      change: '+15%',
      trend: 'up'
    },
    {
      label: 'At Risk',
      value: overview?.at_risk_subscriptions || 0,
      change: '-2',
      trend: 'down',
      negative: true
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">
              {metric.label}
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {metric.value}
            </dd>
            <div className="mt-3 flex items-center text-sm">
              <span className={`font-medium ${
                metric.negative 
                  ? metric.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  : metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change}
              </span>
              <span className="ml-2 text-gray-500">vs last month</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}