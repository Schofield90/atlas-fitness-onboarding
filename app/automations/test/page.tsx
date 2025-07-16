'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Send, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  User
} from 'lucide-react';

export default function TestAutomationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'website'
  });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    lead?: { id: string; first_name: string; email: string; created_at: string };
    error?: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const testAutomation = async () => {
    if (!formData.first_name || !formData.email) {
      alert('Please fill in first name and email');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          test_lead: true,
          notes: 'Test lead for automation system'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({
          success: true,
          message: 'Test lead created successfully! Automation should trigger within 5 minutes.',
          lead: data.lead
        });
        
        // Clear form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          source: 'website'
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to create test lead',
          error: data.error
        });
      }
    } catch (error) {
      console.error('Error testing automation:', error);
      setResult({
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server'
      });
    } finally {
      setTesting(false);
    }
  };

  const generateTestData = () => {
    const testNames = [
      { first: 'John', last: 'Smith' },
      { first: 'Sarah', last: 'Johnson' },
      { first: 'Mike', last: 'Brown' },
      { first: 'Emma', last: 'Davis' },
      { first: 'James', last: 'Wilson' }
    ];
    
    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    const timestamp = Date.now();
    
    setFormData({
      first_name: randomName.first,
      last_name: randomName.last,
      email: `${randomName.first.toLowerCase()}.test${timestamp}@example.com`,
      phone: `+447${Math.floor(Math.random() * 900000000 + 100000000)}`,
      source: ['website', 'facebook', 'google', 'referral'][Math.floor(Math.random() * 4)]
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test Automation System</h1>
                <p className="text-gray-600">Create a test lead to verify your automation is working</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Testing Mode</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">How Testing Works</h2>
          <div className="space-y-2 text-blue-700">
            <div className="flex items-start">
              <User className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              <span>1. Fill in test lead details below (or use auto-generated data)</span>
            </div>
            <div className="flex items-start">
              <Clock className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              <span>2. Lead automation will trigger within 5 minutes</span>
            </div>
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              <span>3. Check your SMS deliveries table to see the automation in action</span>
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-3">
            <strong>Note:</strong> This creates a real lead marked as &quot;TEST LEAD&quot; - SMS will be logged but not actually sent in test mode.
          </p>
        </div>

        {/* Test Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Create Test Lead</h2>
              <button
                onClick={generateTestData}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200"
              >
                Generate Test Data
              </button>
            </div>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john.smith@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+447123456789"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="referral">Referral</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={testAutomation}
                disabled={testing || !formData.first_name || !formData.email}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {testing ? 'Creating Test Lead...' : 'Create Test Lead'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className={`mt-6 rounded-lg p-6 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              )}
              <div>
                <h3 className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Test Lead Created Successfully!' : 'Test Failed'}
                </h3>
                <p className={`mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.lead && (
                  <div className="mt-3 text-sm text-green-600">
                    <p><strong>Lead ID:</strong> {result.lead.id}</p>
                    <p><strong>Name:</strong> {result.lead.first_name}</p>
                    <p><strong>Email:</strong> {result.lead.email}</p>
                    <p><strong>Created:</strong> {new Date(result.lead.created_at).toLocaleString()}</p>
                  </div>
                )}
                {result.error && (
                  <p className="mt-2 text-sm text-red-600">
                    <strong>Error:</strong> {result.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium text-gray-900 mb-3">Next Steps</h3>
          <div className="space-y-2 text-gray-600">
            <p>• Go to <strong>Automations</strong> to see execution logs</p>
            <p>• Check <strong>SMS Deliveries</strong> to verify message scheduling</p>
            <p>• Review <strong>Lead Response Tracking</strong> for timing metrics</p>
            <p>• Test different lead sources to see score variations</p>
          </div>
        </div>
      </div>
    </div>
  );
}