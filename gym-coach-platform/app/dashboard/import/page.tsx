'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  File,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import Papa from 'papaparse'

interface ImportProgress {
  total: number
  processed: number
  success: number
  errors: number
  skipped: number
  currentItem?: string
}

interface ImportResult {
  success: boolean
  message: string
  stats: {
    total: number
    success: number
    errors: number
    skipped: number
  }
  errors?: Array<{ row: number; error: string }>
}

type ImportStatus = 'idle' | 'preview' | 'importing' | 'completed' | 'error'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'payments' | 'attendance' | 'unknown' | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionId] = useState(() => `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Auto-detect file type
  const detectFileType = useCallback((content: string): 'payments' | 'attendance' | 'unknown' => {
    const lines = content.split('\n')
    if (lines.length === 0) return 'unknown'

    const headers = lines[0].toLowerCase()

    if (headers.includes('payment method') || headers.includes('amount')) {
      return 'payments'
    }

    if (headers.includes('class name') || headers.includes('instructor')) {
      return 'attendance'
    }

    return 'unknown'
  }, [])

  // Generate preview of CSV data
  const generatePreview = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string

      // Detect file type
      const detectedType = detectFileType(content)
      setFileType(detectedType)

      // Parse CSV for preview (first 5 rows)
      const parseResult = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        transformHeader: (header) => header.trim()
      })

      setPreview(parseResult.data)
    }
    reader.readAsText(file)
  }, [detectFileType])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles.find(file => file.name.endsWith('.csv'))

    if (csvFile) {
      setFile(csvFile)
      setStatus('preview')
      setError(null)
      generatePreview(csvFile)
    } else {
      setError('Please select a CSV file')
    }
  }, [generatePreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  })

  // Start import process
  const startImport = async () => {
    if (!file) return

    setStatus('importing')
    setProgress({ total: 0, processed: 0, success: 0, errors: 0, skipped: 0 })
    setError(null)

    try {
      // Set up SSE connection for progress updates
      const eventSource = new EventSource(`/api/import/goteamup?connectionId=${connectionId}`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'progress') {
          setProgress(data.progress)
        } else if (data.type === 'complete') {
          setResult(data.result)
          setStatus('completed')
          eventSource.close()
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setError('Connection lost. Import may still be processing.')
      }

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileType || '')
      formData.append('connectionId', connectionId)

      const response = await fetch('/api/import/goteamup', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      // If no SSE updates, handle response directly
      const responseData = await response.json()
      if (responseData.result && status === 'importing') {
        setResult(responseData.result)
        setStatus('completed')
        eventSource.close()
      }

    } catch (error) {
      setError((error as Error).message)
      setStatus('error')
    }
  }

  const resetImport = () => {
    setFile(null)
    setFileType(null)
    setPreview([])
    setStatus('idle')
    setProgress(null)
    setResult(null)
    setError(null)
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'payments':
        return { label: 'Payment Data', color: 'bg-green-100 text-green-800' }
      case 'attendance':
        return { label: 'Attendance Data', color: 'bg-blue-100 text-blue-800' }
      default:
        return { label: 'Unknown Type', color: 'bg-gray-100 text-gray-600' }
    }
  }

  const progressPercentage = progress ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import GoTeamUp Data</h1>
            <p className="text-gray-600 mt-1">
              Upload your GoTeamUp CSV exports to import payment and attendance data
            </p>
          </div>
        </div>
      </div>

      {status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Drag and drop your GoTeamUp CSV export file, or click to select
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports GoTeamUp payment and attendance export files
                  </p>
                </div>
              )}
            </div>

            {/* Supported Formats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Payment Data</h3>
                <p className="text-sm text-gray-600 mb-2">Expected columns:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Client Name</li>
                  <li>• Email</li>
                  <li>• Date (DD/MM/YYYY)</li>
                  <li>• Amount</li>
                  <li>• Payment Method</li>
                  <li>• Status</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Attendance Data</h3>
                <p className="text-sm text-gray-600 mb-2">Expected columns:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Client Name</li>
                  <li>• Email</li>
                  <li>• Date (DD/MM/YYYY)</li>
                  <li>• Time</li>
                  <li>• Class Name</li>
                  <li>• Instructor</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'preview' && file && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <File className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle>{file.name}</CardTitle>
                  <CardDescription>
                    {(file.size / 1024).toFixed(1)} KB
                  </CardDescription>
                </div>
              </div>
              {fileType && (
                <Badge className={getFileTypeLabel(fileType).color}>
                  {getFileTypeLabel(fileType).label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fileType === 'unknown' ? (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to detect file type. Please ensure your CSV has the correct headers for payment or attendance data.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Preview */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview (first 5 rows)
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {preview.length > 0 &&
                              Object.keys(preview[0]).map((header) => (
                                <th
                                  key={header}
                                  className="px-4 py-3 text-left font-medium text-gray-900 border-b"
                                >
                                  {header}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, idx) => (
                            <tr key={idx} className="border-b">
                              {Object.values(row).map((cell: any, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-3 text-gray-600">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button onClick={startImport} className="flex-1">
                    Start Import
                  </Button>
                  <Button variant="outline" onClick={resetImport}>
                    Choose Different File
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {status === 'importing' && progress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Importing Data...
            </CardTitle>
            <CardDescription>
              Processing your {fileType} data. This may take a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {progress.currentItem && (
                <p className="text-sm text-gray-600">
                  Currently processing: <strong>{progress.currentItem}</strong>
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{progress.total}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{progress.success}</div>
                  <div className="text-sm text-gray-500">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{progress.skipped}</div>
                  <div className="text-sm text-gray-500">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{progress.errors}</div>
                  <div className="text-sm text-gray-500">Errors</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(status === 'completed' || status === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result?.success ? (
                <>
                  <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                  Import Completed
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 mr-2 text-red-600" />
                  Import Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {result.message && (
                  <Alert className={result.success ? '' : 'border-red-200 bg-red-50'}>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{result.stats.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{result.stats.success}</div>
                    <div className="text-sm text-gray-500">Imported</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{result.stats.skipped}</div>
                    <div className="text-sm text-gray-500">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{result.stats.errors}</div>
                    <div className="text-sm text-gray-500">Errors</div>
                  </div>
                </div>

                {/* Error Details */}
                {result.errors && result.errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-800 mb-3">Error Details</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {result.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-700 mb-2">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : error ? (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-6 flex space-x-3">
              <Button onClick={resetImport} variant="outline" className="flex-1">
                Import Another File
              </Button>
              <Link href="/dashboard/settings">
                <Button className="flex-1">
                  Back to Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}