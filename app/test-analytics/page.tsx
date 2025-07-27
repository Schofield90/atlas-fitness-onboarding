'use client';

import { useState } from 'react';
import { analytics } from '@/app/lib/analytics/client';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';

export default function TestAnalyticsPage() {
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setEventLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPageView = () => {
    analytics.trackPageView('/test/custom-page');
    addLog('Tracked custom pageview: /test/custom-page');
  };

  const testClick = () => {
    analytics.trackClick('test-button', { section: 'testing', value: 'high' });
    addLog('Tracked click: test-button');
  };

  const testFormSubmit = () => {
    analytics.trackFormSubmit('test-form', { 
      fields: ['name', 'email', 'phone'],
      formType: 'contact'
    });
    addLog('Tracked form submission: test-form');
  };

  const testCustomEvent = () => {
    analytics.trackCustomEvent('test_conversion', {
      value: 99.99,
      currency: 'USD',
      product: 'premium-membership'
    });
    addLog('Tracked custom event: test_conversion');
  };

  const testBatchEvents = () => {
    // Trigger multiple events to test batching
    for (let i = 1; i <= 5; i++) {
      analytics.trackClick(`batch-test-${i}`, { batch: true, index: i });
    }
    addLog('Triggered 5 events for batch testing');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Analytics Testing Page</h1>
        
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            This page helps you test the analytics implementation. Click the buttons below to trigger different types of events.
            Open your browser's Network tab to see the events being sent to the API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Tracking Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testPageView}
                className="w-full"
                data-track="test-pageview-button"
              >
                Test Custom Page View
              </Button>
              
              <Button 
                onClick={testClick}
                variant="outline"
                className="w-full"
                data-track="test-click-button"
              >
                Test Click Event
              </Button>
              
              <Button 
                onClick={testFormSubmit}
                variant="outline"
                className="w-full"
                data-track="test-form-button"
              >
                Test Form Submit
              </Button>
              
              <Button 
                onClick={testCustomEvent}
                variant="outline"
                className="w-full"
                data-track="test-custom-button"
              >
                Test Custom Event
              </Button>
              
              <Button 
                onClick={testBatchEvents}
                variant="outline"
                className="w-full"
                data-track="test-batch-button"
              >
                Test Batch Events (5 events)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                These elements have data-track attributes and will be tracked automatically when clicked.
              </p>
              
              <button 
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                data-track="green-action-button"
              >
                Green Action Button
              </button>
              
              <button 
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                data-track="purple-action-button"
              >
                Purple Action Button
              </button>
              
              <a 
                href="#" 
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-track="blue-link"
                onClick={(e) => e.preventDefault()}
              >
                Tracked Link
              </a>
              
              <div 
                className="w-full px-4 py-2 bg-gray-200 text-center rounded cursor-pointer hover:bg-gray-300"
                data-track="gray-div-element"
              >
                Tracked Div Element
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              {eventLog.length === 0 ? (
                <p className="text-gray-500">No events tracked yet. Click buttons above to start testing.</p>
              ) : (
                eventLog.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
            {eventLog.length > 0 && (
              <Button 
                onClick={() => setEventLog([])}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Clear Log
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold mb-2">Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open your browser's Developer Tools (F12)</li>
            <li>Go to the Network tab</li>
            <li>Filter by "Fetch/XHR" to see API calls</li>
            <li>Click the test buttons above</li>
            <li>Look for POST requests to "/api/analytics/track"</li>
            <li>Check the request payload to see the event data</li>
            <li>Scroll down the page to test scroll depth tracking</li>
          </ol>
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>Visitor ID: <code className="bg-gray-200 px-2 py-1 rounded">Check localStorage._analytics_vid</code></p>
          <p className="mt-2">
            <a href="/analytics-dashboard" className="text-blue-600 hover:underline">
              View Analytics Dashboard →
            </a>
          </p>
        </div>

        {/* Add some height to test scroll tracking */}
        <div className="mt-16 space-y-8">
          <div className="h-96 bg-gradient-to-b from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <p className="text-2xl text-blue-800">Scroll down to test scroll depth tracking (25%)</p>
          </div>
          <div className="h-96 bg-gradient-to-b from-green-100 to-green-200 rounded-lg flex items-center justify-center">
            <p className="text-2xl text-green-800">Keep scrolling (50%)</p>
          </div>
          <div className="h-96 bg-gradient-to-b from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center">
            <p className="text-2xl text-yellow-800">Almost there (75%)</p>
          </div>
          <div className="h-96 bg-gradient-to-b from-red-100 to-red-200 rounded-lg flex items-center justify-center">
            <p className="text-2xl text-red-800">You've reached the bottom (100%)</p>
          </div>
        </div>
      </div>
    </div>
  );
}