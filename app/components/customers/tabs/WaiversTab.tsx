'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, Upload, Plus } from 'lucide-react'
import { formatBritishDate } from '@/app/lib/utils/british-format'

interface WaiversTabProps {
  customerId: string
}

interface Waiver {
  id: string
  waiver_name: string
  waiver_type: string
  signature_date: string
  expiry_date: string | null
  status: string
  waiver_content: string
  signature_data: string | null
  witness_name: string | null
}

interface Document {
  id: string
  document_name: string
  document_type: string
  file_url: string
  created_at: string
  expiry_date: string | null
  status: string
  description: string | null
}

export default function WaiversTab({ customerId }: WaiversTabProps) {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState<'waiver' | 'document'>('document')
  const supabase = createClient()

  useEffect(() => {
    fetchWaiversAndDocuments()
  }, [customerId])

  const fetchWaiversAndDocuments = async () => {
    try {
      setLoading(true)

      // Fetch waivers
      const { data: waiversData, error: waiversError } = await supabase
        .from('customer_waivers')
        .select('*')
        .eq('client_id', customerId)
        .order('signature_date', { ascending: false })

      if (waiversError && waiversError.code !== 'PGRST116') {
        console.error('Error fetching waivers:', waiversError)
      } else {
        setWaivers(waiversData || [])
      }

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('client_id', customerId)
        .order('created_at', { ascending: false })

      if (documentsError && documentsError.code !== 'PGRST116') {
        console.error('Error fetching documents:', documentsError)
      } else {
        setDocuments(documentsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string, expiryDate: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    switch (status) {
      case 'signed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string, expiryDate: string | null) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return 'Expired'
    }
    switch (status) {
      case 'signed':
      case 'active':
        return 'Active'
      case 'expired':
        return 'Expired'
      default:
        return 'Pending'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'liability':
        return 'bg-red-500/20 text-red-400'
      case 'medical':
        return 'bg-blue-500/20 text-blue-400'
      case 'photo_release':
        return 'bg-green-500/20 text-green-400'
      case 'membership_agreement':
        return 'bg-purple-500/20 text-purple-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading waivers and documents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Waivers & Documents</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </button>
      </div>

      {/* Waivers Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-md font-semibold text-white mb-4">Signed Waivers</h4>
        
        {waivers.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No waivers on file</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waivers.map((waiver) => (
              <div key={waiver.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(waiver.status, waiver.expiry_date)}
                  <div>
                    <h5 className="font-medium text-white">{waiver.waiver_name}</h5>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(waiver.waiver_type)}`}>
                        {waiver.waiver_type.replace('_', ' ')}
                      </span>
                      <span>Signed: {formatBritishDate(waiver.signature_date)}</span>
                      {waiver.expiry_date && (
                        <span>Expires: {formatBritishDate(waiver.expiry_date)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        {getStatusIcon(waiver.status, waiver.expiry_date)}
                        {getStatusText(waiver.status, waiver.expiry_date)}
                      </span>
                    </div>
                    {waiver.witness_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Witnessed by: {waiver.witness_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-md font-semibold text-white mb-4">Documents</h4>
        
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No documents uploaded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(document.status, document.expiry_date)}
                  <div>
                    <h5 className="font-medium text-white">{document.document_name}</h5>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(document.document_type)}`}>
                        {document.document_type.replace('_', ' ')}
                      </span>
                      <span>Uploaded: {formatBritishDate(document.created_at)}</span>
                      {document.expiry_date && (
                        <span>Expires: {formatBritishDate(document.expiry_date)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        {getStatusIcon(document.status, document.expiry_date)}
                        {getStatusText(document.status, document.expiry_date)}
                      </span>
                    </div>
                    {document.description && (
                      <p className="text-xs text-gray-500 mt-1">{document.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Add Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Document Type
                </label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="waiver">Waiver</option>
                  <option value="medical_form">Medical Form</option>
                  <option value="membership_agreement">Membership Agreement</option>
                  <option value="photo_id">Photo ID</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Document Name
                </label>
                <input
                  type="text"
                  placeholder="Enter document name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-xs mt-1">PDF, DOCX, JPG, PNG up to 10MB</p>
                  <input type="file" className="hidden" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}