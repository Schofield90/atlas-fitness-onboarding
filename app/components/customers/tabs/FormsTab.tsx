'use client'

import { FileText, Eye, Download } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface FormsTabProps {
  customerId: string
}

export default function FormsTab({ customerId }: FormsTabProps) {
  // Placeholder - would integrate with the forms system
  const forms: any[] = []

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">Submitted Forms</h3>
      
      {forms.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No forms submitted yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Completed forms and applications will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <div key={form.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white">{form.name}</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Submitted {formatBritishDateTime(form.submitted_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
                    <Eye className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}