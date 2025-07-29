'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react'

interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  lead: {
    id: string
    name: string
    phone: string
  }
}

export function CallModal({ isOpen, onClose, lead }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState('')
  const [callSid, setCallSid] = useState<string | null>(null)
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus])
  
  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
      }
    }
  }, [statusCheckInterval])
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCallStatus('idle')
      setCallDuration(0)
      setError('')
      setCallSid(null)
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        setStatusCheckInterval(null)
      }
    }
  }, [isOpen, statusCheckInterval])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const initiateCall = async () => {
    setCallStatus('connecting')
    setError('')

    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          to: lead.phone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error information
        const errorMessage = data.error || 'Failed to initiate call'
        const details = data.details ? ` - ${data.details}` : ''
        const debugInfo = data.debugInfo ? ` (${JSON.stringify(data.debugInfo)})` : ''
        
        console.error('Call initiation failed:', data)
        throw new Error(errorMessage + details)
      }

      // Store the call SID for status checking
      setCallSid(data.callSid)
      
      // Start polling for call status
      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/calls/check-status?callSid=${data.callSid}`)
          const statusData = await statusResponse.json()
          
          if (statusData.appStatus) {
            setCallStatus(statusData.appStatus as any)
            
            // If call ended, stop polling
            if (statusData.appStatus === 'ended') {
              clearInterval(interval)
              setStatusCheckInterval(null)
              
              // If there's a duration, update it
              if (statusData.duration) {
                setCallDuration(parseInt(statusData.duration))
              }
            }
          }
        } catch (err) {
          console.error('Failed to check call status:', err)
        }
      }, 1000) // Check every second
      
      setStatusCheckInterval(interval)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call')
      setCallStatus('idle')
    }
  }

  const endCall = async () => {
    setCallStatus('ended')
    
    // Stop status polling
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      setStatusCheckInterval(null)
    }
    
    // End the call on Twilio's side
    if (callSid) {
      try {
        await fetch('/api/calls/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSid,
            leadId: lead.id,
            duration: callDuration
          })
        })
      } catch (err) {
        console.error('Failed to end call:', err)
      }
    }

    setTimeout(() => {
      onClose()
    }, 1500)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // In real implementation, would mute/unmute Twilio connection
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {callStatus === 'idle' && `Call ${lead.name}`}
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'connected' && lead.name}
            {callStatus === 'ended' && 'Call Ended'}
          </h2>
          <p className="text-gray-400">{lead.phone}</p>
          {callStatus === 'connected' && (
            <p className="text-lg mt-2">{formatDuration(callDuration)}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Call Status */}
        <div className="flex justify-center mb-8">
          {callStatus === 'idle' && (
            <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
              <Phone className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {callStatus === 'connecting' && (
            <div className="w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center animate-pulse">
              <Phone className="w-16 h-16 text-white" />
            </div>
          )}
          {callStatus === 'connected' && (
            <div className="w-32 h-32 bg-green-600 rounded-full flex items-center justify-center">
              <Phone className="w-16 h-16 text-white" />
            </div>
          )}
          {callStatus === 'ended' && (
            <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center">
              <PhoneOff className="w-16 h-16 text-white" />
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-4">
          {callStatus === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={initiateCall}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Start Call
              </button>
            </>
          )}

          {callStatus === 'connecting' && (
            <button
              onClick={() => {
                setCallStatus('idle')
                setError('Call cancelled')
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}

          {callStatus === 'connected' && (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={endCall}
                className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}

          {callStatus === 'ended' && (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* Call Note */}
        {callStatus === 'connected' && (
          <div className="mt-6 text-center text-sm text-gray-400">
            This call is being recorded for quality assurance
          </div>
        )}
      </div>
    </div>
  )
}