'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Phone,
  Key,
  Shield,
  ExternalLink
} from 'lucide-react';

export default function SMSConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState({
    account_sid: '',
    auth_token: '',
    from_number: '',
    status_callback_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Load existing configuration from environment/database
      const response = await fetch('/api/sms/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading SMS config:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sms/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('SMS configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving SMS config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testSMS = async () => {
    if (!testPhone) {
      alert('Please enter a phone number to test');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: testPhone,
          message: 'Test message from your gym automation system! 🏃‍♂️'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResult({
          success: true,
          message: 'Test SMS sent successfully! Check your phone.'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Test SMS failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error testing SMS:', error);
      setTestResult({
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
                <h1 className="text-2xl font-bold text-gray-900">SMS Configuration</h1>
                <p className="text-gray-600">Set up Twilio for automated SMS delivery</p>
              </div>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Setup Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Twilio Setup Instructions</h2>
          <div className="space-y-3 text-blue-700">
            <div className="flex items-start">
              <div className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold text-blue-800 mr-3 mt-0.5">1</div>
              <div>
                <p className="font-medium">Create Twilio Account</p>
                <p className="text-sm">Sign up at <a href="https://twilio.com" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a> and get your trial credentials</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold text-blue-800 mr-3 mt-0.5">2</div>
              <div>
                <p className="font-medium">Get Your Credentials</p>
                <p className="text-sm">Find your Account SID and Auth Token in the Twilio Console</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold text-blue-800 mr-3 mt-0.5">3</div>
              <div>
                <p className="font-medium">Get Phone Number</p>
                <p className="text-sm">Purchase a phone number or use the trial number provided</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Twilio Credentials</h2>
            </div>
          </div>
          
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="h-4 w-4 inline mr-1" />
                  Account SID
                </label>
                <input
                  type="text"
                  name="account_sid"
                  value={config.account_sid}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in your Twilio Console dashboard
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Auth Token
                </label>
                <input
                  type="password"
                  name="auth_token"
                  value={config.auth_token}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••••••••••••••••••••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Keep this secure - it&apos;s like your password
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  From Phone Number
                </label>
                <input
                  type="tel"
                  name="from_number"
                  value={config.from_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+44123456789"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The phone number SMS will be sent from
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ExternalLink className="h-4 w-4 inline mr-1" />
                  Status Callback URL (Optional)
                </label>
                <input
                  type="url"
                  name="status_callback_url"
                  value={config.status_callback_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://your-domain.com/api/webhooks/twilio-status"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For tracking delivery status (advanced)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test SMS */}
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Test SMS</h3>
          </div>
          
          <div className="px-6 py-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+44123456789"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={testSMS}
                  disabled={testing || !testPhone}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {testing ? 'Sending...' : 'Send Test SMS'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                testResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.error && (
                      <p className="text-sm text-red-600 mt-1">{testResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <h3 className="font-medium text-yellow-800">Security Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your Twilio credentials are stored securely and encrypted. Never share your Auth Token with anyone.
                For production use, consider using environment variables or a secure key management system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}