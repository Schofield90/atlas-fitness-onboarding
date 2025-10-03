'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react'

interface Document {
  type: string
  file_name: string
  storage_path: string
  uploaded_at?: string
  file_size?: number
  status?: 'uploaded' | 'processing' | 'verified' | 'rejected'
}

interface DocumentUploadProps {
  organizationId: string
  documents: Document[]
  onUpdate: (documents: Document[]) => void
}

const REQUIRED_DOCUMENTS = [
  {
    type: 'business_registration',
    title: 'Business Registration Certificate',
    description: 'Certificate of Incorporation from Companies House',
    required: true
  },
  {
    type: 'proof_of_address',
    title: 'Proof of Business Address',
    description: 'Recent utility bill or bank statement (within 3 months)',
    required: true
  },
  {
    type: 'director_id',
    title: 'Director ID Document',
    description: 'Passport or driving licence of authorized person',
    required: true
  },
  {
    type: 'vat_certificate',
    title: 'VAT Registration Certificate',
    description: 'VAT certificate if applicable',
    required: false
  }
]

export default function DocumentUpload({ organizationId, documents, onUpdate }: DocumentUploadProps) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getDocumentStatus = (type: string) => {
    return documents.find(doc => doc.type === type)
  }

  const handleFileUpload = async (file: File, documentType: string) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB')
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('File type must be PDF, JPG, PNG, or WebP')
      return
    }

    setUploading(documentType)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      formData.append('organizationId', organizationId)

      const response = await fetch('/api/sms/setup/upload-document', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update documents list
      const newDocument: Document = {
        type: documentType,
        file_name: file.name,
        storage_path: result.storage_path,
        uploaded_at: new Date().toISOString(),
        file_size: file.size,
        status: 'uploaded'
      }

      const updatedDocuments = documents.filter(doc => doc.type !== documentType)
      updatedDocuments.push(newDocument)
      onUpdate(updatedDocuments)

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const handleFileRemove = (documentType: string) => {
    const updatedDocuments = documents.filter(doc => doc.type !== documentType)
    onUpdate(updatedDocuments)
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Document Upload</h3>
        <p className="text-gray-400 mb-6">
          Upload the required documents to comply with UK SMS regulations. All documents must be clear, recent, and valid.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((docType) => {
          const existingDoc = getDocumentStatus(docType.type)
          const isUploading = uploading === docType.type

          return (
            <div key={docType.type} className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-white">{docType.title}</h4>
                    {docType.required && (
                      <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{docType.description}</p>

                  {existingDoc ? (
                    <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(existingDoc.status)}
                        <div>
                          <div className="text-sm font-medium text-white">{existingDoc.file_name}</div>
                          <div className="text-xs text-gray-400">
                            {existingDoc.file_size && formatFileSize(existingDoc.file_size)}
                            {existingDoc.uploaded_at && (
                              <>
                                {' • '}
                                {new Date(existingDoc.uploaded_at).toLocaleDateString('en-GB')}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => window.open(existingDoc.storage_path, '_blank')}
                          className="p-1 text-gray-400 hover:text-white"
                          title="View document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleFileRemove(docType.type)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                      {isUploading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                          <span className="text-sm text-gray-400">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-400 mb-2">
                            Drag and drop or click to upload
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(file, docType.type)
                              }
                            }}
                            className="hidden"
                            id={`upload-${docType.type}`}
                          />
                          <label
                            htmlFor={`upload-${docType.type}`}
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm cursor-pointer transition-colors"
                          >
                            Select File
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            PDF, JPG, PNG, WebP (max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-medium text-blue-300 mb-2">Document Requirements</h4>
        <div className="space-y-1 text-sm text-blue-200">
          <p>• All documents must be in English or include certified translations</p>
          <p>• Documents must be dated within the last 3 months (except registration certificates)</p>
          <p>• Images must be clear and readable with all corners visible</p>
          <p>• Business address on documents must match your registered address</p>
          <p>• Director ID must be current and not expired</p>
        </div>
      </div>
    </div>
  )
}