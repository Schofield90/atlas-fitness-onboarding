'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  X, 
  Edit, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Clock,
  User,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { StaffProfile as StaffProfileType } from '../../lib/types/staff'

interface StaffProfileProps {
  staff: StaffProfileType
  onClose: () => void
  onEdit: () => void
}

type TabType = 'overview' | 'personal' | 'employment' | 'timesheets' | 'performance'

export default function StaffProfile({ staff, onClose, onEdit }: StaffProfileProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const getStatusConfig = (status: string) => {
    const config = {
      active: { 
        label: 'Active', 
        variant: 'success' as const, 
        icon: CheckCircle,
        color: 'text-green-400' 
      },
      inactive: { 
        label: 'Inactive', 
        variant: 'secondary' as const, 
        icon: AlertCircle,
        color: 'text-gray-400' 
      },
      terminated: { 
        label: 'Terminated', 
        variant: 'destructive' as const, 
        icon: X,
        color: 'text-red-400' 
      },
      on_leave: { 
        label: 'On Leave', 
        variant: 'warning' as const, 
        icon: Clock,
        color: 'text-yellow-400' 
      }
    }
    return config[status as keyof typeof config] || config.active
  }

  const getEmploymentTypeLabel = (type: string) => {
    const labels = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      intern: 'Intern'
    }
    return labels[type as keyof typeof labels] || type
  }

  const calculateTenure = () => {
    const hireDate = new Date(staff.hire_date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - hireDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`
    } else {
      return `${months} month${months > 1 ? 's' : ''}`
    }
  }

  const statusConfig = getStatusConfig(staff.status)
  const StatusIcon = statusConfig.icon

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'timesheets', label: 'Timesheets', icon: Clock },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {staff.first_name} {staff.last_name}
                </h1>
                <p className="text-gray-400">{staff.employee_id}</p>
                <p className="text-lg text-gray-300 mt-1">{staff.position}</p>
                {staff.department && (
                  <p className="text-sm text-gray-400">{staff.department}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={onClose} className="p-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700">
          <nav className="flex px-6 space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Tenure</p>
                        <p className="text-lg font-semibold text-white">
                          {calculateTenure()}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Employment</p>
                        <p className="text-lg font-semibold text-white">
                          {getEmploymentTypeLabel(staff.employment_type)}
                        </p>
                      </div>
                      <Briefcase className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className={`text-lg font-semibold ${statusConfig.color}`}>
                          {statusConfig.label}
                        </p>
                      </div>
                      <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <a 
                        href={`mailto:${staff.email}`}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        {staff.email}
                      </a>
                    </div>
                    {staff.phone_number && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <a 
                          href={`tel:${staff.phone_number}`}
                          className="text-orange-400 hover:text-orange-300"
                        >
                          {staff.phone_number}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Activity tracking coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              {/* Personal Details */}
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">First Name</label>
                      <p className="text-white font-medium">{staff.first_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Last Name</label>
                      <p className="text-white font-medium">{staff.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Email</label>
                      <p className="text-white font-medium">{staff.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Phone</label>
                      <p className="text-white font-medium">{staff.phone_number || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              {staff.address_line_1 && (
                <Card className="bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-gray-300">
                      <p>{staff.address_line_1}</p>
                      {staff.address_line_2 && <p>{staff.address_line_2}</p>}
                      <p>
                        {[staff.city, staff.state, staff.postal_code].filter(Boolean).join(', ')}
                      </p>
                      <p>{staff.country}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contact */}
              {staff.emergency_contact_name && (
                <Card className="bg-slate-800">
                  <CardHeader>
                    <CardTitle>Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-white font-medium">{staff.emergency_contact_name}</p>
                      {staff.emergency_contact_phone && (
                        <p className="text-gray-300">{staff.emergency_contact_phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-6">
              {/* Employment Details */}
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Employee ID</label>
                      <p className="text-white font-medium">{staff.employee_id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Position</label>
                      <p className="text-white font-medium">{staff.position}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Department</label>
                      <p className="text-white font-medium">{staff.department || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Employment Type</label>
                      <p className="text-white font-medium">{getEmploymentTypeLabel(staff.employment_type)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Hire Date</label>
                      <p className="text-white font-medium">{new Date(staff.hire_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Status</label>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation */}
              {(staff.hourly_rate || staff.salary) && (
                <Card className="bg-slate-800">
                  <CardHeader>
                    <CardTitle>Compensation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {staff.salary && (
                        <div>
                          <label className="text-sm text-gray-400">Annual Salary</label>
                          <p className="text-white font-medium text-lg">£{staff.salary.toLocaleString()}</p>
                        </div>
                      )}
                      {staff.hourly_rate && (
                        <div>
                          <label className="text-sm text-gray-400">Hourly Rate</label>
                          <p className="text-white font-medium text-lg">£{staff.hourly_rate}/hour</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {staff.notes && (
                <Card className="bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">{staff.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-6">
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Timesheet Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Timesheet data integration coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <Card className="bg-slate-800">
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">
                    Performance tracking coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              <p>Created: {new Date(staff.created_at).toLocaleDateString()}</p>
              <p>Last Updated: {new Date(staff.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}