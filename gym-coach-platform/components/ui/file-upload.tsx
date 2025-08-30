'use client'

import { useState, useCallback } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
  disabled?: boolean
}

export function FileUpload({
  onFileSelect,
  accept = '.csv',
  maxSize = 10,
  className,
  disabled = false
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)

    // Check file type
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('.', ''))) {
      setError(`Please select a ${accept} file`)
      return
    }

    // Check file size
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return
    }

    setSelectedFile(file)
    onFileSelect(file)
  }, [accept, maxSize, onFileSelect])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }, [disabled, handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }, [handleFile])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Drop your CSV file here, or{' '}
              <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                <span>browse</span>
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={handleFileInput}
                  disabled={disabled}
                />
              </label>
            </p>
            <p className="text-xs text-gray-500">
              {accept.toUpperCase()} files up to {maxSize}MB
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}