'use client'

import { useState } from 'react'
import { Upload, X, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'
import { getCurrentUserOrganization } from '@/app/lib/organization'

interface BulkImportMembersProps {
  onClose: () => void
  onSuccess: () => void
}

export default function BulkImportMembers({ onClose, onSuccess }: BulkImportMembersProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const supabase = createClient()

  const downloadTemplate = () => {
    const csvContent = `first_name,last_name,email,phone,date_of_birth,gender,address,city,postcode,emergency_contact_name,emergency_contact_phone,notes
John,Doe,john.doe@example.com,07123456789,1990-01-15,male,"123 Main St",London,SW1A 1AA,Jane Doe,07987654321,"Existing member"
Jane,Smith,jane.smith@example.com,07234567890,1985-05-20,female,"456 High St",Manchester,M1 1AA,John Smith,07876543210,"New member"`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please upload a CSV file')
        return
      }
      setFile(selectedFile)
      setError(null)
      setImportResults(null)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
    const rows = []
    
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV with potential commas in quoted fields
      const matches = lines[i].match(/("([^"]*)")|([^,]+)/g) || []
      const values = matches.map(v => v.replace(/^"|"$/g, '').trim())
      
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }
    }
    
    return rows
  }

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '')
    
    // Handle UK numbers
    if (cleaned.startsWith('44')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `+44${cleaned.substring(1)}`
    } else if (cleaned.length === 10) {
      // Assume UK number without leading 0
      return `+44${cleaned}`
    }
    
    return phone // Return as-is if we can't determine format
  }

  const handleImport = async () => {
    if (!file) return
    
    setImporting(true)
    setError(null)
    setImportResults(null)
    
    try {
      const { organizationId } = await getCurrentUserOrganization()
      const text = await file.text()
      const members = parseCSV(text)
      
      if (members.length === 0) {
        setError('No valid data found in CSV file')
        setImporting(false)
        return
      }
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }
      
      // Process each member
      for (const member of members) {
        try {
          // Required fields check
          if (!member.first_name || !member.last_name || !member.email) {
            results.failed++
            results.errors.push(`Row missing required fields: ${member.email || 'unknown'}`)
            continue
          }
          
          // Format phone number if provided
          if (member.phone) {
            member.phone = formatPhoneNumber(member.phone)
          }
          
          // Check if member already exists
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('email', member.email)
            .eq('organization_id', organizationId)
            .single()
          
          if (existingLead) {
            // Update existing member
            const { error: updateError } = await supabase
              .from('leads')
              .update({
                first_name: member.first_name,
                last_name: member.last_name,
                phone: member.phone || null,
                status: 'customer',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingLead.id)
            
            if (updateError) throw updateError
          } else {
            // Create new member
            const { error: insertError } = await supabase
              .from('leads')
              .insert({
                organization_id: organizationId,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                phone: member.phone || null,
                status: 'customer',
                source: 'bulk_import',
                notes: member.notes || null,
                created_at: new Date().toISOString()
              })
            
            if (insertError) throw insertError
          }
          
          results.success++
        } catch (err: any) {
          results.failed++
          results.errors.push(`Failed to import ${member.email}: ${err.message}`)
        }
      }
      
      setImportResults(results)
      
      if (results.success > 0) {
        onSuccess()
      }
      
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import members')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Bulk Import Members</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-white mb-2">Import Instructions</h3>
          <p className="text-gray-300 text-sm mb-3">
            Upload a CSV file with member information. The file should include columns for:
          </p>
          <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 mb-3">
            <li>first_name (required)</li>
            <li>last_name (required)</li>
            <li>email (required)</li>
            <li>phone (optional)</li>
            <li>date_of_birth (optional, format: YYYY-MM-DD)</li>
            <li>gender (optional)</li>
            <li>address, city, postcode (optional)</li>
            <li>emergency_contact_name, emergency_contact_phone (optional)</li>
            <li>notes (optional)</li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </button>
        </div>

        {/* File Upload */}
        {!importResults && (
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-6">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">
              {file ? file.name : 'Drag and drop your CSV file here, or click to browse'}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg cursor-pointer inline-block transition-colors"
            >
              Choose File
            </label>
          </div>
        )}

        {/* Import Results */}
        {importResults && (
          <div className="space-y-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Import Results</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">
                    Successfully imported: <span className="font-semibold text-green-400">{importResults.success}</span>
                  </span>
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="text-gray-300">
                      Failed to import: <span className="font-semibold text-red-400">{importResults.failed}</span>
                    </span>
                  </div>
                )}
              </div>
              
              {importResults.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Errors:</p>
                  <div className="bg-gray-800 rounded p-3 max-h-40 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-400 mb-1">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!importResults && (
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import Members
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`${importResults ? 'flex-1' : ''} bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors`}
          >
            {importResults ? 'Done' : 'Cancel'}
          </button>
          
          {importResults && importResults.success > 0 && (
            <button
              onClick={() => {
                setFile(null)
                setImportResults(null)
                setError(null)
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Import More
            </button>
          )}
        </div>
      </div>
    </div>
  )
}