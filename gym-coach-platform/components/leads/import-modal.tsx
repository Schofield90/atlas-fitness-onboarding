'use client'

import { useState, useEffect } from 'react'
import { X, Download, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { Button } from '@/components/ui/button'
import { 
  parseCSV, 
  mapCSVToLeads, 
  validateImportData, 
  generateSampleCSV,
  type LeadMappingConfig,
  type CSVParseResult,
  type ValidatedImportData 
} from '@/lib/utils/csv-parser'
import { downloadCSV } from '@/lib/utils/csv-export'
import { useOrganization } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (leads: any[]) => Promise<void>
  isImporting?: boolean
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing'

export function ImportModal({ isOpen, onClose, onImport, isImporting = false }: ImportModalProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null)
  const [mapping, setMapping] = useState<LeadMappingConfig>({})
  const [validatedData, setValidatedData] = useState<ValidatedImportData | null>(null)
  
  const { data: organization } = useOrganization()

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload')
      setCsvData(null)
      setMapping({})
      setValidatedData(null)
    }
  }, [isOpen])

  const handleFileSelect = async (file: File) => {
    try {
      const content = await file.text()
      const parsed = parseCSV(content)
      
      if (parsed.errors.length > 0) {
        console.warn('CSV parsing errors:', parsed.errors)
      }
      
      setCsvData(parsed)
      setCurrentStep('mapping')
    } catch (error) {
      console.error('Error parsing CSV:', error)
      setCsvData({
        headers: [],
        data: [],
        errors: ['Failed to parse CSV file. Please check the file format.']
      })
    }
  }

  const handleMappingComplete = () => {
    if (!csvData || !organization?.id) return

    const parsedLeads = mapCSVToLeads(csvData.data, mapping, organization.id)
    const validated = validateImportData(parsedLeads)
    setValidatedData(validated)
    setCurrentStep('preview')
  }

  const handleImport = async () => {
    if (!validatedData || !validatedData.validLeads.length) return

    setCurrentStep('importing')
    
    try {
      const leadsToImport = validatedData.validLeads.map(lead => lead.data)
      await onImport(leadsToImport)
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
      setCurrentStep('preview')
    }
  }

  const downloadSampleCSV = () => {
    const sampleContent = generateSampleCSV()
    downloadCSV(sampleContent, 'leads-template.csv')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Leads</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload a CSV file to bulk import leads
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isImporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            {[
              { key: 'upload', label: 'Upload CSV', icon: Upload },
              { key: 'mapping', label: 'Map Fields', icon: Info },
              { key: 'preview', label: 'Preview & Import', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.key
              const isCompleted = ['upload', 'mapping', 'preview'].indexOf(currentStep) > index

              return (
                <div key={step.key} className="flex items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    'ml-2 text-sm font-medium',
                    isActive ? 'text-blue-600' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-500'
                  )}>
                    {step.label}
                  </span>
                  {index < 2 && (
                    <div className={cn(
                      'w-16 h-px mx-4',
                      isCompleted ? 'bg-green-300' : 'bg-gray-300'
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={downloadSampleCSV}
                  className="mb-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <p className="text-sm text-gray-600 mb-6">
                  Download our template to see the expected format, or upload your own CSV file.
                </p>
              </div>
              
              <FileUpload 
                onFileSelect={handleFileSelect}
                accept=".csv"
                maxSize={10}
              />

              {csvData && csvData.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">
                        CSV Parsing Issues
                      </h4>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {csvData.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'mapping' && csvData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">
                  Map CSV Columns to Lead Fields
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select which CSV columns correspond to each lead field. Required fields are marked with *.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Name *', required: true },
                  { key: 'email', label: 'Email *', required: true },
                  { key: 'phone', label: 'Phone', required: false },
                  { key: 'status', label: 'Status', required: false },
                  { key: 'source', label: 'Source', required: false },
                  { key: 'qualification_notes', label: 'Notes', required: false }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <select
                      value={mapping[field.key as keyof LeadMappingConfig] || ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        [field.key]: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Select Column --</option>
                      {csvData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="ml-3 text-sm text-blue-700">
                    <p className="font-medium">Preview Data</p>
                    <p className="mt-1">
                      Found {csvData.data.length} rows in your CSV file.
                    </p>
                    {csvData.data.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">First row preview:</p>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(csvData.data[0], null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && validatedData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">
                  Import Summary
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {validatedData.summary.totalRows}
                    </div>
                    <div className="text-sm text-blue-800">Total Rows</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {validatedData.summary.validRows}
                    </div>
                    <div className="text-sm text-green-800">Valid Leads</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {validatedData.summary.invalidRows}
                    </div>
                    <div className="text-sm text-red-800">Invalid Leads</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {validatedData.summary.duplicateEmails}
                    </div>
                    <div className="text-sm text-yellow-800">Duplicates</div>
                  </div>
                </div>
              </div>

              {validatedData.invalidLeads.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-3">
                    Issues Found ({validatedData.invalidLeads.length} rows)
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {validatedData.invalidLeads.slice(0, 10).map((lead, index) => (
                      <div key={index} className="text-sm text-red-700 mb-2">
                        <strong>Row {lead.rowIndex + 1}:</strong> {lead.errors.join(', ')}
                      </div>
                    ))}
                    {validatedData.invalidLeads.length > 10 && (
                      <div className="text-sm text-red-600 italic">
                        ... and {validatedData.invalidLeads.length - 10} more issues
                      </div>
                    )}
                  </div>
                </div>
              )}

              {validatedData.validLeads.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-3">
                    Ready to Import ({validatedData.validLeads.length} leads)
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {validatedData.validLeads.slice(0, 5).map((lead, index) => (
                      <div key={index} className="text-sm text-green-700 mb-1">
                        {lead.data.name} ({lead.data.email})
                      </div>
                    ))}
                    {validatedData.validLeads.length > 5 && (
                      <div className="text-sm text-green-600 italic">
                        ... and {validatedData.validLeads.length - 5} more leads
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'importing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Leads...</h3>
              <p className="text-sm text-gray-600">
                Please wait while we process your data.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          
          <div className="flex space-x-3">
            {currentStep === 'mapping' && (
              <Button
                onClick={handleMappingComplete}
                disabled={!mapping.name || !mapping.email}
              >
                Next: Preview
              </Button>
            )}
            
            {currentStep === 'preview' && validatedData && (
              <Button
                onClick={handleImport}
                disabled={validatedData.validLeads.length === 0 || isImporting}
                className="bg-green-600 hover:bg-green-700"
              >
                Import {validatedData.validLeads.length} Leads
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}