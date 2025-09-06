'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Users, FileText, Pen, RotateCcw } from 'lucide-react'
import { formatBritishDate } from '@/app/lib/utils/british-format'

interface WaiverData {
  id: string
  customer_id: string
  status: string
  expires_at: string | null
  waiver: {
    id: string
    title: string
    content: string
    waiver_type: string
    requires_witness: boolean
  }
  customer: {
    id: string
    name: string
    email: string
    phone: string
  }
}

export default function WaiverSigningPage() {
  const params = useParams()
  const router = useRouter()
  const waiverId = params.id as string
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const witnessCanvasRef = useRef<HTMLCanvasElement>(null)
  
  const [waiverData, setWaiverData] = useState<WaiverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  
  // Signature states
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [witnessName, setWitnessName] = useState('')
  const [witnessEmail, setWitnessEmail] = useState('')
  const [isWitnessDrawing, setIsWitnessDrawing] = useState(false)
  const [hasWitnessSignature, setHasWitnessSignature] = useState(false)
  
  useEffect(() => {
    fetchWaiverData()
  }, [waiverId])

  const fetchWaiverData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/waivers/sign/${waiverId}`)
      const result = await response.json()
      
      if (!response.ok) {
        setError(result.error || 'Failed to load waiver')
        return
      }
      
      setWaiverData(result.data)
    } catch (error) {
      console.error('Error fetching waiver:', error)
      setError('Failed to load waiver')
    } finally {
      setLoading(false)
    }
  }

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, isWitness = false) => {
    const canvas = isWitness ? witnessCanvasRef.current : canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (isWitness) {
      setIsWitnessDrawing(true)
    } else {
      setIsDrawing(true)
    }

    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, isWitness = false) => {
    const canvas = isWitness ? witnessCanvasRef.current : canvasRef.current
    const drawing = isWitness ? isWitnessDrawing : isDrawing
    
    if (!drawing || !canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = (isWitness = false) => {
    if (isWitness) {
      setIsWitnessDrawing(false)
      setHasWitnessSignature(true)
    } else {
      setIsDrawing(false)
      setHasSignature(true)
    }
  }

  const clearSignature = (isWitness = false) => {
    const canvas = isWitness ? witnessCanvasRef.current : canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (isWitness) {
      setHasWitnessSignature(false)
    } else {
      setHasSignature(false)
    }
  }

  const getSignatureDataURL = (canvas: HTMLCanvasElement | null): string => {
    return canvas?.toDataURL('image/png') || ''
  }

  const handleSubmit = async () => {
    if (!waiverData || !hasSignature) return

    // Validate witness if required
    if (waiverData.waiver.requires_witness) {
      if (!witnessName.trim() || !hasWitnessSignature) {
        alert('This waiver requires a witness signature and name.')
        return
      }
    }

    try {
      setSigning(true)

      const signatureData = getSignatureDataURL(canvasRef.current)
      const witnessSignatureData = hasWitnessSignature 
        ? getSignatureDataURL(witnessCanvasRef.current) 
        : undefined

      const requestBody: any = {
        signature_data: signatureData,
        signature_method: 'digital',
      }

      if (waiverData.waiver.requires_witness) {
        requestBody.witness_name = witnessName.trim()
        requestBody.witness_signature = witnessSignatureData
        if (witnessEmail.trim()) {
          requestBody.witness_email = witnessEmail.trim()
        }
      }

      const response = await fetch(`/api/waivers/sign/${waiverId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        alert('Failed to submit waiver: ' + result.error)
        return
      }

      setSigned(true)
    } catch (error) {
      console.error('Error signing waiver:', error)
      alert('Failed to submit waiver signature')
    } finally {
      setSigning(false)
    }
  }

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>, isWitness = false) => {
    e.preventDefault()
    const touch = e.touches[0]
    const canvas = isWitness ? witnessCanvasRef.current : canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    startDrawing(mouseEvent as any, isWitness)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>, isWitness = false) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    draw(mouseEvent as any, isWitness)
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>, isWitness = false) => {
    e.preventDefault()
    stopDrawing(isWitness)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RotateCcw className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading waiver...</p>
        </div>
      </div>
    )
  }

  if (error || !waiverData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Waiver Not Available</h2>
          <p className="text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Waiver Signed Successfully!</h2>
          <p className="text-gray-400 mb-6">
            Thank you, {waiverData.customer.name}. Your waiver has been signed and submitted.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-white mb-2">{waiverData.waiver.title}</h3>
            <p className="text-sm text-gray-400">
              Signed on {formatBritishDate(new Date())}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Digital Waiver</h1>
          <p className="text-gray-400">Please review and sign the waiver below</p>
        </div>

        {/* Customer Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Participant Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="ml-2 text-white">{waiverData.customer.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Email:</span>
              <span className="ml-2 text-white">{waiverData.customer.email}</span>
            </div>
            <div>
              <span className="text-gray-400">Waiver Type:</span>
              <span className="ml-2 text-white">
                {waiverData.waiver.waiver_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            {waiverData.expires_at && (
              <div>
                <span className="text-gray-400">Expires:</span>
                <span className="ml-2 text-white">{formatBritishDate(waiverData.expires_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Waiver Content */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">{waiverData.waiver.title}</h2>
          <div className="bg-white rounded-lg p-6 max-h-96 overflow-y-auto">
            <div className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed">
              {waiverData.waiver.content}
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Digital Signature</h2>
          <p className="text-gray-400 mb-4">
            By signing below, you acknowledge that you have read, understood, and agree to the terms of this waiver.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Participant Signature *
              </label>
              <div className="bg-white border-2 border-gray-600 rounded-lg">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full cursor-crosshair"
                  onMouseDown={(e) => {
                    setupCanvas(canvasRef.current!)
                    startDrawing(e)
                  }}
                  onMouseMove={draw}
                  onMouseUp={() => stopDrawing()}
                  onMouseLeave={() => stopDrawing()}
                  onTouchStart={(e) => {
                    setupCanvas(canvasRef.current!)
                    handleTouchStart(e)
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Draw your signature above using mouse or touch
                </p>
                <button
                  onClick={() => clearSignature()}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Witness Section */}
        {waiverData.waiver.requires_witness && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Witness Required</h2>
            </div>
            <p className="text-gray-400 mb-4">
              This waiver requires a witness signature. Please have a witness provide their information and signature.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Witness Name *
                  </label>
                  <input
                    type="text"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    placeholder="Enter witness name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Witness Email (optional)
                  </label>
                  <input
                    type="email"
                    value={witnessEmail}
                    onChange={(e) => setWitnessEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    placeholder="witness@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Witness Signature *
                </label>
                <div className="bg-white border-2 border-gray-600 rounded-lg">
                  <canvas
                    ref={witnessCanvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={(e) => {
                      setupCanvas(witnessCanvasRef.current!)
                      startDrawing(e, true)
                    }}
                    onMouseMove={(e) => draw(e, true)}
                    onMouseUp={() => stopDrawing(true)}
                    onMouseLeave={() => stopDrawing(true)}
                    onTouchStart={(e) => {
                      setupCanvas(witnessCanvasRef.current!)
                      handleTouchStart(e, true)
                    }}
                    onTouchMove={(e) => handleTouchMove(e, true)}
                    onTouchEnd={(e) => handleTouchEnd(e, true)}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Witness should draw their signature above
                  </p>
                  <button
                    onClick={() => clearSignature(true)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {hasSignature ? (
                <span className="text-green-400">✓ Signature provided</span>
              ) : (
                <span>Please provide your signature above</span>
              )}
              {waiverData.waiver.requires_witness && (
                <div className="mt-1">
                  {witnessName.trim() && hasWitnessSignature ? (
                    <span className="text-green-400">✓ Witness signature provided</span>
                  ) : (
                    <span>Please provide witness information and signature</span>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={
                signing ||
                !hasSignature ||
                (waiverData.waiver.requires_witness && (!witnessName.trim() || !hasWitnessSignature))
              }
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Pen className="h-4 w-4" />
                  Sign Waiver
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>This waiver is digitally signed and stored securely.</p>
        </div>
      </div>
    </div>
  )
}