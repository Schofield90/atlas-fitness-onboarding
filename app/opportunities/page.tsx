'use client'

import OpportunitiesPage from './OpportunitiesPage'
import { 
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  TrendingUpIcon,
  DollarSignIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FilterIcon
} from 'lucide-react'

// Mock data for opportunities
const mockOpportunities = [
  {
    id: 1,
    title: 'Premium Membership Upgrade',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@email.com',
    contactPhone: '+447123456789',
    value: 2400,
    stage: 'qualification',
    probability: 60,
    expectedCloseDate: '2025-02-15',
    source: 'Website',
    assignedTo: 'John Smith',
    lastActivity: '2025-01-05',
    activities: 3,
    type: 'upgrade',
    priority: 'high'
  },
  {
    id: 2,
    title: 'Personal Training Package',
    contactName: 'Mike Wilson',
    contactEmail: 'mike.wilson@email.com',
    contactPhone: '+447987654321',
    value: 1200,
    stage: 'proposal',
    probability: 75,
    expectedCloseDate: '2025-02-01',
    source: 'Referral',
    assignedTo: 'Emma Davis',
    lastActivity: '2025-01-04',
    activities: 5,
    type: 'personal_training',
    priority: 'high'
  },
  {
    id: 3,
    title: 'Corporate Membership',
    contactName: 'Tech Solutions Ltd',
    contactEmail: 'hr@techsolutions.com',
    contactPhone: '+447555123456',
    value: 15000,
    stage: 'negotiation',
    probability: 45,
    expectedCloseDate: '2025-03-01',
    source: 'Cold Call',
    assignedTo: 'David Brown',
    lastActivity: '2025-01-03',
    activities: 8,
    type: 'corporate',
    priority: 'medium'
  },
  {
    id: 4,
    title: 'Family Membership',
    contactName: 'The Thompson Family',
    contactEmail: 'thompson.family@email.com',
    contactPhone: '+447444567890',
    value: 1800,
    stage: 'discovery',
    probability: 30,
    expectedCloseDate: '2025-02-28',
    source: 'Facebook Ads',
    assignedTo: 'Lisa Green',
    lastActivity: '2025-01-06',
    activities: 2,
    type: 'family',
    priority: 'low'
  },
  {
    id: 5,
    title: 'Nutrition Coaching',
    contactName: 'James Anderson',
    contactEmail: 'james.anderson@email.com',
    contactPhone: '+447333789012',
    value: 800,
    stage: 'closed_won',
    probability: 100,
    expectedCloseDate: '2025-01-20',
    source: 'Existing Member',
    assignedTo: 'Emma Davis',
    lastActivity: '2025-01-02',
    activities: 4,
    type: 'coaching',
    priority: 'medium'
  }
]

const stageOrder = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

const stageColors = {
  discovery: 'bg-blue-500',
  qualification: 'bg-yellow-500',
  proposal: 'bg-purple-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500'
}

const stageNames = {
  discovery: 'Discovery',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost'
}

export default function OpportunitiesPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'list' | 'create' | 'analytics'>('pipeline')
  const [opportunities, setOpportunities] = useState(mockOpportunities)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <DashboardLayout userData={null}>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-96 mb-8"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStageOpportunities = (stage: string) => {
    return opportunities.filter(opp => opp.stage === stage)
  }

  const getTotalValue = (stage?: string) => {
    const opps = stage ? getStageOpportunities(stage) : opportunities
    return opps.reduce((sum, opp) => sum + opp.value, 0)
  }

  const getWeightedValue = () => {
    return opportunities
      .filter(opp => !['closed_won', 'closed_lost'].includes(opp.stage))
      .reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0)
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="text-red-400">🔴</span>
      case 'medium': return <span className="text-yellow-400">🟡</span>
      case 'low': return <span className="text-green-400">🟢</span>
      default: return <span className="text-gray-400">⚪</span>
    }
  }

  const renderPipelineView = () => (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-white">£{getTotalValue().toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSignIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Weighted Value</p>
              <p className="text-2xl font-bold text-white">£{getWeightedValue().toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Opps</p>
              <p className="text-2xl font-bold text-white">
                {opportunities.filter(opp => !['closed_won', 'closed_lost'].includes(opp.stage)).length}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-white">
                {Math.round((opportunities.filter(opp => opp.stage === 'closed_won').length / 
                  opportunities.filter(opp => ['closed_won', 'closed_lost'].includes(opp.stage)).length) * 100) || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Kanban Board */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Sales Pipeline</h2>
          <button
            onClick={() => setActiveTab('create')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Opportunity
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
          {stageOrder.map((stage) => {
            const stageOpps = getStageOpportunities(stage)
            return (
              <div key={stage} className="min-w-64">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{stageNames[stage]}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded">{stageOpps.length}</span>
                      <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`}></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    £{getTotalValue(stage).toLocaleString()}
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {stageOpps.map((opp) => (
                      <div key={opp.id} className="bg-gray-600 rounded-lg p-3 cursor-pointer hover:bg-gray-500" 
                           onClick={() => setSelectedOpportunity(opp)}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white text-sm">{opp.title}</h4>
                          {getPriorityIcon(opp.priority)}
                        </div>
                        <div className="text-sm text-gray-300 mb-2">{opp.contactName}</div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-green-400">£{opp.value.toLocaleString()}</span>
                          <span className="text-xs text-gray-400">{opp.probability}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <UserIcon className="h-3 w-3" />
                          <span>{opp.assignedTo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderListView = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">All Opportunities</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FilterIcon className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Opportunity
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-700 rounded-lg mb-6">
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Stages</option>
              {stageOrder.map(stage => (
                <option key={stage} value={stage}>{stageNames[stage]}</option>
              ))}
            </select>
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Priorities</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white">
              <option>All Assigned</option>
              <option>John Smith</option>
              <option>Emma Davis</option>
              <option>David Brown</option>
              <option>Lisa Green</option>
            </select>
            <input
              type="text"
              placeholder="Search opportunities..."
              className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Opportunity</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Stage</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Probability</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Expected Close</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Assigned To</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(opp.priority)}
                      <div>
                        <div className="font-medium text-white">{opp.title}</div>
                        <div className="text-sm text-gray-400">{opp.source}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-white">{opp.contactName}</div>
                      <div className="text-sm text-gray-400">{opp.contactEmail}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-green-400">£{opp.value.toLocaleString()}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${stageColors[opp.stage]}`}>
                      {stageNames[opp.stage]}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="text-white">{opp.probability}%</div>
                      <div className="w-12 bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${opp.probability}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">
                      {new Date(opp.expectedCloseDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-300">{opp.assignedTo}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedOpportunity(opp)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button className="text-green-400 hover:text-green-300">
                        <PhoneIcon className="h-4 w-4" />
                      </button>
                      <button className="text-purple-400 hover:text-purple-300">
                        <MailIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderCreateOpportunity = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Create New Opportunity</h2>
        
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Opportunity Title</label>
              <input
                type="text"
                placeholder="e.g., Premium Membership Upgrade"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Contact/Company</label>
              <input
                type="text"
                placeholder="Contact name or company"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <input
                type="email"
                placeholder="contact@example.com"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
              <input
                type="tel"
                placeholder="+44 7123 456789"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Value (£)</label>
              <input
                type="number"
                placeholder="1200"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Probability (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="50"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Expected Close Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Stage</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                {stageOrder.slice(0, -2).map(stage => (
                  <option key={stage} value={stage}>{stageNames[stage]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Assign To</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option>John Smith</option>
                <option>Emma Davis</option>
                <option>David Brown</option>
                <option>Lisa Green</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Lead Source</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option>Website</option>
                <option>Facebook Ads</option>
                <option>Referral</option>
                <option>Cold Call</option>
                <option>Existing Member</option>
                <option>Walk-in</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Opportunity Type</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="upgrade">Membership Upgrade</option>
                <option value="personal_training">Personal Training</option>
                <option value="corporate">Corporate Membership</option>
                <option value="family">Family Membership</option>
                <option value="coaching">Nutrition/Coaching</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description/Notes</label>
            <textarea
              placeholder="Add any relevant notes about this opportunity..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg"
            >
              Create Opportunity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">Sales Analytics</h2>
        
        {/* Coming Soon */}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUpIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Detailed sales analytics including conversion rates, pipeline velocity, 
            forecasting, and performance metrics will be available soon.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sales Opportunities</h1>
          <p className="text-gray-400">Manage your sales pipeline and track opportunity progress</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pipeline' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Pipeline View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'list' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Create Opportunity
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'pipeline' && renderPipelineView()}
        {activeTab === 'list' && renderListView()}
        {activeTab === 'create' && renderCreateOpportunity()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </DashboardLayout>
  )
}