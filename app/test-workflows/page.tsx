'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function TestWorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const testTrigger = async (triggerType: string) => {
    setTriggering(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/workflows/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType,
          leadData: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '+447700900000',
            source: 'website'
          }
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error triggering workflow:', error);
      setResult({ error: 'Failed to trigger workflow' });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <DashboardLayout userData={null}>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Test Workflows</h1>
        
        {/* Active Workflows */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Workflows</h2>
          {loading ? (
            <p className="text-gray-400">Loading workflows...</p>
          ) : workflows.length === 0 ? (
            <p className="text-gray-400">No workflows found. Create one in the Automations section.</p>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{workflow.name}</p>
                    <p className="text-sm text-gray-400">
                      Trigger: {workflow.trigger_type} | Status: {workflow.status}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    workflow.status === 'active' 
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Triggers */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Triggers</h2>
          <p className="text-gray-400 mb-4">
            Click a button below to simulate a trigger event. This will execute any active workflows that match the trigger type.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => testTrigger('lead_created')}
              disabled={triggering}
              className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              <h3 className="font-semibold mb-1">New Lead Created</h3>
              <p className="text-sm opacity-80">Simulates a new lead being added to the system</p>
            </button>
            
            <button
              onClick={() => testTrigger('form_submitted')}
              disabled={triggering}
              className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors"
            >
              <h3 className="font-semibold mb-1">Form Submitted</h3>
              <p className="text-sm opacity-80">Simulates a form submission from your website</p>
            </button>
          </div>
        </div>

        {/* Test Result */}
        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}