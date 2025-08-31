'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Calendar, Download, Filter, Clock, Target, Eye, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface AnalyticsMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
}

interface ChartData {
  name: string
  value: number
  change?: number
}

const mockMetrics: AnalyticsMetric[] = [
  {
    label: 'Total Revenue',
    value: '$24,567',
    change: 12.5,
    changeLabel: 'vs last month',
    icon: <DollarSign className="h-4 w-4" />
  },
  {
    label: 'Active Members',
    value: 234,
    change: 8.2,
    changeLabel: 'vs last month',
    icon: <Users className="h-4 w-4" />
  },
  {
    label: 'New Leads',
    value: 89,
    change: -5.1,
    changeLabel: 'vs last week',
    icon: <Target className="h-4 w-4" />
  },
  {
    label: 'Conversion Rate',
    value: '18.5%',
    change: 2.3,
    changeLabel: 'vs last month',
    icon: <TrendingUp className="h-4 w-4" />
  },
  {
    label: 'Class Bookings',
    value: 1247,
    change: 15.7,
    changeLabel: 'vs last month',
    icon: <Calendar className="h-4 w-4" />
  },
  {
    label: 'Retention Rate',
    value: '92.3%',
    change: 1.2,
    changeLabel: 'vs last month',
    icon: <Users className="h-4 w-4" />
  }
]

const mockRevenueData: ChartData[] = [
  { name: 'Jan', value: 18500, change: 5.2 },
  { name: 'Feb', value: 21200, change: 14.6 },
  { name: 'Mar', value: 19800, change: -6.6 },
  { name: 'Apr', value: 23400, change: 18.2 },
  { name: 'May', value: 24567, change: 5.0 }
]

const mockMembershipData: ChartData[] = [
  { name: 'Basic', value: 98 },
  { name: 'Premium', value: 76 },
  { name: 'VIP', value: 34 },
  { name: 'Corporate', value: 26 }
]

const mockTopClasses = [
  { name: 'HIIT Training', bookings: 156, change: 12 },
  { name: 'Yoga Flow', bookings: 134, change: 8 },
  { name: 'Strength Training', bookings: 122, change: -3 },
  { name: 'Cardio Blast', bookings: 98, change: 18 },
  { name: 'Pilates', bookings: 87, change: 5 }
]

export default function AnalyticsPage() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [dateRange, setDateRange] = useState('30d')
  const [isLoading, setIsLoading] = useState(false)

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const handleExportData = () => {
    setShowUpgradeDialog(true)
  }

  const formatChange = (change: number) => {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change}%`
  }

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your gym's performance and growth</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <div className="text-muted-foreground">
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <div className="flex items-center space-x-1 text-xs">
                  {metric.change > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={getChangeColor(metric.change)}>
                    {formatChange(metric.change)}
                  </span>
                  <span className="text-muted-foreground">{metric.changeLabel}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRevenueData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">{item.name}</span>
                        </div>
                        <span className="font-medium">${item.value.toLocaleString()}</span>
                      </div>
                      {item.change && (
                        <div className="flex items-center space-x-1">
                          {item.change > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={`text-sm ${getChangeColor(item.change)}`}>
                            {formatChange(item.change)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={handlePaidFeature} className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Detailed Chart
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Membership Distribution</CardTitle>
                <CardDescription>Current membership breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMembershipData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded" style={{
                          backgroundColor: `hsl(${210 + index * 30}, 70%, 50%)`
                        }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{item.value}</span>
                        <p className="text-xs text-gray-600">members</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={handlePaidFeature} className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View Detailed Breakdown
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Classes</CardTitle>
              <CardDescription>Most booked classes this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTopClasses.map((classItem, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{classItem.name}</p>
                        <p className="text-sm text-gray-600">{classItem.bookings} bookings</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {classItem.change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${getChangeColor(classItem.change)}`}>
                        {formatChange(classItem.change)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>
                Detailed revenue tracking and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 text-center mb-4">
                Upgrade to access detailed revenue analytics and forecasting
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>New member acquisition over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Detailed member analytics available in Pro</p>
                  <Button variant="ghost" onClick={handlePaidFeature} className="mt-2">
                    Upgrade to View
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Analysis</CardTitle>
                <CardDescription>Member retention and churn rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Month Retention</span>
                    <Badge className="bg-green-100 text-green-800">92.3%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Churn Rate</span>
                    <Badge className="bg-red-100 text-red-800">7.7%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Lifetime</span>
                    <Badge variant="outline">18.4 months</Badge>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={handlePaidFeature} className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Detailed Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Class Performance</CardTitle>
                <CardDescription>Booking rates and attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTopClasses.slice(0, 3).map((classItem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{classItem.name}</p>
                        <p className="text-sm text-gray-600">{classItem.bookings} bookings</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          {classItem.change > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                          <span className={`text-sm ${getChangeColor(classItem.change)}`}>
                            {formatChange(classItem.change)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Most popular booking times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Peak hours analysis available in Pro</p>
                  <Button variant="ghost" onClick={handlePaidFeature} className="mt-2">
                    Upgrade to View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Performance</CardTitle>
              <CardDescription>
                Campaign effectiveness and ROI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 text-center mb-4">
                Upgrade to access marketing analytics and campaign ROI tracking
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Analytics Pro</DialogTitle>
            <DialogDescription>
              Unlock advanced analytics and reporting features
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Upgrade to access premium analytics features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Advanced data visualization charts</li>
              <li>Custom date ranges and filters</li>
              <li>Automated reports and insights</li>
              <li>Revenue forecasting</li>
              <li>Member lifetime value analysis</li>
              <li>Marketing ROI tracking</li>
              <li>Data export and API access</li>
              <li>Real-time dashboards</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}