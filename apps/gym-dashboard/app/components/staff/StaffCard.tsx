'use client'

import { Card, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  MoreVertical,
  Edit,
  Eye,
  Clock
} from 'lucide-react'
import { StaffProfile } from '../../lib/types/staff'
import { useState } from 'react'

interface StaffCardProps {
  staff: StaffProfile
  onEdit: () => void
  onView: () => void
}

export default function StaffCard({ staff, onEdit, onView }: StaffCardProps) {
  const [showActions, setShowActions] = useState(false)

  const getStatusConfig = (status: string) => {
    const config = {
      active: { label: 'Active', variant: 'success' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      inactive: { label: 'Inactive', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
      terminated: { label: 'Terminated', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      on_leave: { label: 'On Leave', variant: 'warning' as const, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
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

  const statusConfig = getStatusConfig(staff.status)

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:border-orange-500/30">
      <CardContent className="p-6">
        {/* Header with Avatar and Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">
                {staff.first_name} {staff.last_name}
              </h3>
              <p className="text-sm text-gray-400">{staff.employee_id}</p>
            </div>
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="p-2"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onView()
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      onEdit()
                      setShowActions(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status and Employment Type */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
          <Badge variant="outline">
            {getEmploymentTypeLabel(staff.employment_type)}
          </Badge>
        </div>

        {/* Position and Department */}
        <div className="space-y-2 mb-4">
          <div>
            <p className="text-sm font-medium text-white">{staff.position}</p>
            {staff.department && (
              <p className="text-sm text-gray-400">{staff.department}</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {staff.email && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Mail className="h-4 w-4 text-gray-400" />
              <a 
                href={`mailto:${staff.email}`}
                className="hover:text-orange-400 transition-colors truncate"
              >
                {staff.email}
              </a>
            </div>
          )}
          {staff.phone_number && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone className="h-4 w-4 text-gray-400" />
              <a 
                href={`tel:${staff.phone_number}`}
                className="hover:text-orange-400 transition-colors"
              >
                {staff.phone_number}
              </a>
            </div>
          )}
        </div>

        {/* Hire Date and Tenure */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>Hired: {new Date(staff.hire_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>
              {(() => {
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
              })()}
            </span>
          </div>
        </div>

        {/* Compensation (if available) */}
        {(staff.hourly_rate || staff.salary) && (
          <div className="mb-4 p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Compensation</p>
            <p className="text-sm font-medium text-white">
              {staff.salary 
                ? `£${staff.salary.toLocaleString()}/year`
                : staff.hourly_rate
                ? `£${staff.hourly_rate}/hour`
                : 'Not specified'
              }
            </p>
          </div>
        )}

        {/* Address (if available) */}
        {staff.address_line_1 && (
          <div className="mb-4">
            <div className="flex items-start gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p>{staff.address_line_1}</p>
                {staff.address_line_2 && <p>{staff.address_line_2}</p>}
                {(staff.city || staff.state || staff.postal_code) && (
                  <p>
                    {[staff.city, staff.state, staff.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes (if available) */}
        {staff.notes && (
          <div className="mb-4 p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-300 line-clamp-2">{staff.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            className="flex-1 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}