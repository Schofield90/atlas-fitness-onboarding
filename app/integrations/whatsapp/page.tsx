'use client';

import React, { useState } from 'react';
import { MessageSquare, Phone, Check, AlertCircle, Send } from 'lucide-react';
import Button from '@/app/components/ui/Button';

export default function WhatsAppIntegration() {
  const [testNumber, setTestNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(true); // We have Twilio creds from env

  const automatedMessages = [
    {
      id: 'booking-confirmation',
      name: 'Booking Confirmation',
      description: 'Sent immediately after a class is booked',
      enabled: true,
      template: 'Hi {name}, your {class} class on {date} at {time} is confirmed!'
    },
    {
      id: 'class-reminder',
      name: 'Class Reminder',
      description: 'Sent 2 hours before class starts',
      enabled: true,
      template: 'Reminder: Your {class} class starts in 2 hours at {location}'
    },
    {
      id: 'cancellation',
      name: 'Cancellation Confirmation',
      description: 'Sent when a booking is cancelled',
      enabled: true,
      template: 'Your booking for {class} has been cancelled'
    },
    {
      id: 'waitlist-available',
      name: 'Waitlist Spot Available',
      description: 'Sent when a spot opens up for waitlisted members',
      enabled: false,
      template: 'Good news! A spot opened up in {class}. Book now!'
    },
    {
      id: 'membership-expiry',
      name: 'Membership Expiry Reminder',
      description: 'Sent 3 days before membership expires',
      enabled: false,
      template: 'Your membership expires in 3 days. Renew now to keep your rate!'
    }
  ];

  const handleSendTest = async () => {
    if (!testNumber) {
      alert('Please enter a phone number');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testNumber,
          message: `🎉 Test message from Atlas Fitness!
          
This is a test of your WhatsApp integration. If you're seeing this, everything is working correctly!

You can now:
✅ Send booking confirmations
✅ Send class reminders
✅ Send promotional messages
✅ Communicate with members

Need help? Reply to this message!`
        })
      });

      if (response.ok) {
        alert('Test message sent successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to send: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to send test message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-green-500" />
            WhatsApp Integration
          </h1>
          <p className="text-gray-400">
            Send automated messages and communicate with your members via WhatsApp
          </p>
        </div>

        {/* Connection Status */}
        <div className={`rounded-lg p-6 mb-8 ${
          connected 
            ? 'bg-green-900/20 border border-green-600' 
            : 'bg-red-900/20 border border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connected ? (
                <Check className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {connected ? 'WhatsApp Business Connected' : 'WhatsApp Not Connected'}
                </h3>
                <p className="text-sm text-gray-400">
                  {connected 
                    ? 'Active on +44 7450 308627'
                    : 'Connect your Twilio account to enable WhatsApp messaging'
                  }
                </p>
              </div>
            </div>
            {connected && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Business Number</p>
                <p className="font-mono text-white">+44 7450 308627</p>
              </div>
            )}
            {!connected && (
              <Button className="bg-green-600 hover:bg-green-700">
                Connect WhatsApp
              </Button>
            )}
          </div>
        </div>

        {/* Test Message */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Send Test Message</h2>
          <div className="flex gap-4">
            <input
              type="tel"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="Enter phone number (e.g., +1234567890)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
            <Button
              onClick={handleSendTest}
              disabled={sending || !testNumber}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Make sure the number has joined your WhatsApp sandbox first
          </p>
        </div>

        {/* Automated Messages */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Automated Messages</h2>
          <p className="text-gray-400 mb-6">
            Configure which messages are automatically sent to your members
          </p>
          
          <div className="space-y-4">
            {automatedMessages.map((message) => (
              <div
                key={message.id}
                className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{message.name}</h3>
                      <Badge variant={message.enabled ? 'success' : 'default'}>
                        {message.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{message.description}</p>
                    <div className="bg-gray-900 rounded p-3">
                      <p className="text-xs font-mono text-gray-300">{message.template}</p>
                    </div>
                  </div>
                  <button
                    className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      message.enabled
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {message.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Messages Sent Today</span>
              <MessageSquare className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">127</p>
            <p className="text-sm text-green-400 mt-1">+15% from yesterday</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Active Conversations</span>
              <Phone className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white">23</p>
            <p className="text-sm text-gray-400 mt-1">Last 24 hours</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Response Rate</span>
              <Check className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-white">94%</p>
            <p className="text-sm text-gray-400 mt-1">Average</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Badge component for this page
function Badge({ children, variant }: { children: React.ReactNode; variant: string }) {
  const colors = {
    success: 'bg-green-900/50 text-green-400 border-green-600',
    default: 'bg-gray-700 text-gray-400 border-gray-600'
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${colors[variant] || colors.default}`}>
      {children}
    </span>
  );
}