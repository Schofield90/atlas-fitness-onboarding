'use client';

import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface PhoneCallButtonProps {
  phoneNumber: string;
  recipientName?: string;
  leadId?: string;
  clientId?: string;
}

export default function PhoneCallButton({ 
  phoneNumber, 
  recipientName = 'Contact',
  leadId,
  clientId 
}: PhoneCallButtonProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Format phone number for display
  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('44')) {
      return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Start call
  const initiateCall = async () => {
    setIsConnecting(true);
    setError(null);
    setShowCallModal(true);

    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          recipientName,
          leadId,
          clientId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setCallSid(data.callSid);
      setIsCallActive(true);
      setIsConnecting(false);

      // Start duration timer
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Store timer ID for cleanup
      (window as any).callTimer = timer;
    } catch (err: any) {
      setError(err.message);
      setIsConnecting(false);
    }
  };

  // End call
  const endCall = async () => {
    if ((window as any).callTimer) {
      clearInterval((window as any).callTimer);
    }

    if (callSid) {
      try {
        await fetch('/api/calls/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callSid,
            duration: callDuration,
            leadId,
            clientId,
          }),
        });
      } catch (err) {
        console.error('Failed to log call end:', err);
      }
    }

    setIsCallActive(false);
    setCallDuration(0);
    setCallSid(null);
    setTimeout(() => setShowCallModal(false), 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, this would control the audio stream
  };

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        onClick={initiateCall}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Phone className="h-4 w-4" />
        Call
      </Button>

      <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isConnecting ? 'Connecting Call...' : isCallActive ? 'Call in Progress' : 'Call Ended'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl font-semibold text-gray-600">
                  {recipientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-lg">{recipientName}</h3>
              <p className="text-sm text-muted-foreground">{formatPhoneDisplay(phoneNumber)}</p>
            </div>

            {/* Call Status */}
            {isConnecting && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}

            {isCallActive && (
              <div className="text-center">
                <p className="text-2xl font-mono">{formatDuration(callDuration)}</p>
                <p className="text-sm text-green-600 mt-1">Connected</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Call Controls */}
            {isCallActive && (
              <div className="flex justify-center gap-4">
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleMute}
                  className="rounded-full h-12 w-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={endCall}
                  className="rounded-full h-16 w-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* Connect Button */}
            {!isCallActive && !isConnecting && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCallModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={initiateCall}
                  className="gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-center text-muted-foreground">
              Calls are routed through your configured phone number
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}