'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon, DollarSign, Clock, Users, 
  TrendingUp, FileText, Download, ChevronDown
} from 'lucide-react'

interface PayrollData {
  staffId: string
  staffName: string
  hoursWorked: number
  hourlyRate: number
  overtime: number
  overtimeRate: number
  deductions: number
  bonuses: number
  grossPay: number
  netPay: number
}

interface StaffPayrollProps {
  staffId?: string
  organizationId?: string
  payPeriod?: string
}

export default function StaffPayroll({ staffId, organizationId, payPeriod = 'monthly' }: StaffPayrollProps) {
  const [loading, setLoading] = useState(true)
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState(payPeriod)
  const [expandedStaff, setExpandedStaff] = useState<string[]>([])

  useEffect(() => {
    fetchPayrollData()
  }, [staffId, selectedPeriod])

  const fetchPayrollData = async () => {
    try {
      setLoading(true)
      // Use mock data for now
      setPayrollData(generateMockPayrollData())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setPayrollData(generateMockPayrollData())
      setLoading(false)
    }
  }

  const generateMockPayrollData = (): PayrollData[] => [
    {
      staffId: '1',
      staffName: 'John Smith',
      hoursWorked: 160,
      hourlyRate: 15,
      overtime: 10,
      overtimeRate: 22.5,
      deductions: 380,
      bonuses: 150,
      grossPay: 2775,
      netPay: 2395
    },
    {
      staffId: '2',
      staffName: 'Sarah Johnson',
      hoursWorked: 172,
      hourlyRate: 18,
      overtime: 12,
      overtimeRate: 27,
      deductions: 520,
      bonuses: 200,
      grossPay: 3620,
      netPay: 3100
    },
    {
      staffId: '3',
      staffName: 'Mike Williams',
      hoursWorked: 150,
      hourlyRate: 20,
      overtime: 5,
      overtimeRate: 30,
      deductions: 480,
      bonuses: 100,
      grossPay: 3250,
      netPay: 2770
    },
    {
      staffId: '4',
      staffName: 'Emma Davis',
      hoursWorked: 168,
      hourlyRate: 16,
      overtime: 8,
      overtimeRate: 24,
      deductions: 420,
      bonuses: 0,
      grossPay: 2880,
      netPay: 2460
    }
  ]

  const calculateTotals = () => {
    return payrollData.reduce((totals, staff) => ({
      hoursWorked: totals.hoursWorked + staff.hoursWorked,
      overtime: totals.overtime + staff.overtime,
      grossPay: totals.grossPay + staff.grossPay,
      deductions: totals.deductions + staff.deductions,
      bonuses: totals.bonuses + staff.bonuses,
      netPay: totals.netPay + staff.netPay
    }), {
      hoursWorked: 0,
      overtime: 0,
      grossPay: 0,
      deductions: 0,
      bonuses: 0,
      netPay: 0
    })
  }

  const toggleStaffExpansion = (id: string) => {
    setExpandedStaff(prev =>
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const exportPayroll = (format: 'pdf' | 'csv') => {
    // Implement export functionality
    console.log(`Exporting payroll as ${format}`)
    alert(`Exporting payroll data as ${format.toUpperCase()}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Payroll Management</h2>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <button
            onClick={() => exportPayroll('pdf')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button
            onClick={() => exportPayroll('csv')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-gray-400">This period</span>
          </div>
          <p className="text-gray-400 text-sm">Total Staff</p>
          <p className="text-2xl font-bold text-white">{payrollData.length}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-green-500" />
            <span className="text-xs text-gray-400">Total hours</span>
          </div>
          <p className="text-gray-400 text-sm">Hours Worked</p>
          <p className="text-2xl font-bold text-white">{totals.hoursWorked.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-green-400">+5.2%</span>
          </div>
          <p className="text-gray-400 text-sm">Gross Payroll</p>
          <p className="text-2xl font-bold text-white">£{totals.grossPay.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span className="text-xs text-gray-400">After deductions</span>
          </div>
          <p className="text-gray-400 text-sm">Net Payroll</p>
          <p className="text-2xl font-bold text-white">£{totals.netPay.toLocaleString()}</p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Staff Payroll Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Employee</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Hours</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Rate</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Overtime</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Gross Pay</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Deductions</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Bonuses</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Net Pay</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((staff) => (
                <>
                  <tr key={staff.staffId} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStaffExpansion(staff.staffId)}
                        className="flex items-center gap-2 text-white hover:text-orange-500"
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${
                            expandedStaff.includes(staff.staffId) ? 'rotate-180' : ''
                          }`}
                        />
                        {staff.staffName}
                      </button>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">{staff.hoursWorked}</td>
                    <td className="text-right py-3 px-4 text-gray-300">£{staff.hourlyRate}/hr</td>
                    <td className="text-right py-3 px-4 text-gray-300">{staff.overtime} hrs</td>
                    <td className="text-right py-3 px-4 text-white font-medium">£{staff.grossPay}</td>
                    <td className="text-right py-3 px-4 text-red-400">-£{staff.deductions}</td>
                    <td className="text-right py-3 px-4 text-green-400">
                      {staff.bonuses > 0 ? `+£${staff.bonuses}` : '-'}
                    </td>
                    <td className="text-right py-3 px-4 text-white font-bold">£{staff.netPay}</td>
                    <td className="text-center py-3 px-4">
                      <button className="text-blue-400 hover:text-blue-300">
                        View Slip
                      </button>
                    </td>
                  </tr>
                  {expandedStaff.includes(staff.staffId) && (
                    <tr className="bg-gray-750">
                      <td colSpan={9} className="py-4 px-8">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Tax & NI Breakdown</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Income Tax:</span>
                                <span className="text-gray-300">£{(staff.deductions * 0.6).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">National Insurance:</span>
                                <span className="text-gray-300">£{(staff.deductions * 0.3).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Pension:</span>
                                <span className="text-gray-300">£{(staff.deductions * 0.1).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Hours Breakdown</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Regular Hours:</span>
                                <span className="text-gray-300">{staff.hoursWorked - staff.overtime}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Overtime Hours:</span>
                                <span className="text-gray-300">{staff.overtime}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Holiday Hours:</span>
                                <span className="text-gray-300">0</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Additional Info</p>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Tax Code:</span>
                                <span className="text-gray-300">1257L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">NI Category:</span>
                                <span className="text-gray-300">A</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Payment Method:</span>
                                <span className="text-gray-300">BACS</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-600">
                <td className="py-3 px-4 font-bold text-white">Totals</td>
                <td className="text-right py-3 px-4 font-bold text-white">{totals.hoursWorked}</td>
                <td className="text-right py-3 px-4 text-gray-500">-</td>
                <td className="text-right py-3 px-4 font-bold text-white">{totals.overtime}</td>
                <td className="text-right py-3 px-4 font-bold text-white">£{totals.grossPay}</td>
                <td className="text-right py-3 px-4 font-bold text-red-400">-£{totals.deductions}</td>
                <td className="text-right py-3 px-4 font-bold text-green-400">+£{totals.bonuses}</td>
                <td className="text-right py-3 px-4 font-bold text-white">£{totals.netPay}</td>
                <td className="text-center py-3 px-4">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          Previous Period
        </button>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Run Payroll
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
            Approve & Send Slips
          </button>
        </div>
      </div>
    </div>
  )
}