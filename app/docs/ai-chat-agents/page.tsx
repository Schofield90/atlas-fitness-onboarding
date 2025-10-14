export default function AIChatAgentsDocumentation() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          AI Chat Agents Documentation
        </h1>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            AI Chat Agents automatically respond to leads from GoHighLevel (GHL)
            workflows. Each agent can be customized with its own instructions,
            GHL credentials, and booking settings.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-blue-700">
              <strong>Multi-Agent Support:</strong> You can create multiple
              agents in one account, each with completely isolated settings,
              conversations, and GHL integrations.
            </p>
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Getting Started
          </h2>
          <ol className="list-decimal list-inside space-y-4 text-gray-700">
            <li>
              <strong>Create an Agent</strong>
              <p className="ml-6 mt-2">
                Click "Create Chat Agent" and fill in:
              </p>
              <ul className="ml-10 mt-2 list-disc list-inside">
                <li>Agent name (e.g., "R&B Fitness Lead Bot")</li>
                <li>Description (optional)</li>
                <li>GHL API Key (from GoHighLevel settings)</li>
                <li>GHL Calendar ID (for booking appointments)</li>
                <li>Webhook Secret (optional, for security)</li>
              </ul>
            </li>
            <li>
              <strong>Copy Webhook URL</strong>
              <p className="ml-6 mt-2">
                After creating the agent, click "Configure" to see your unique
                webhook URL. Click the copy button to save it.
              </p>
            </li>
            <li>
              <strong>Configure GoHighLevel</strong>
              <p className="ml-6 mt-2">
                Add the webhook URL to your GHL workflow (see detailed steps
                below).
              </p>
            </li>
          </ol>
        </section>

        {/* GoHighLevel Setup */}
        <section id="gohighlevel-webhook-setup" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            GoHighLevel Webhook Setup
          </h2>
          <ol className="list-decimal list-inside space-y-4 text-gray-700">
            <li>
              <strong>Log into GoHighLevel</strong>
              <p className="ml-6 mt-2">
                Navigate to your location/sub-account where you want to use the
                AI agent.
              </p>
            </li>
            <li>
              <strong>Open Workflow Builder</strong>
              <p className="ml-6 mt-2">
                Go to <code className="bg-gray-100 px-2 py-1 rounded">Automation → Workflows</code>
              </p>
            </li>
            <li>
              <strong>Create or Edit Workflow</strong>
              <p className="ml-6 mt-2">
                Choose a trigger (e.g., "Form Submitted", "New Contact", "Incoming Message")
              </p>
            </li>
            <li>
              <strong>Add Custom Webhook Action</strong>
              <p className="ml-6 mt-2">
                Add a new action → Choose "Custom Webhook" → Set method to POST
              </p>
            </li>
            <li>
              <strong>Paste Webhook URL</strong>
              <p className="ml-6 mt-2">
                Paste your agent's webhook URL from the Configure modal
              </p>
            </li>
            <li>
              <strong>Configure Webhook Body</strong>
              <p className="ml-6 mt-2">
                Add the following JSON body (using GHL custom values):
              </p>
              <pre className="ml-6 mt-2 bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`{
  "contact": {
    "id": "{{contact.id}}",
    "firstName": "{{contact.first_name}}",
    "lastName": "{{contact.last_name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}"
  },
  "message": {
    "body": "{{workflow.message}}",
    "type": "inbound"
  }
}`}
              </pre>
            </li>
            <li>
              <strong>Add Headers (Optional)</strong>
              <p className="ml-6 mt-2">
                If you set a webhook secret, add header:
              </p>
              <pre className="ml-6 mt-2 bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
{`X-Webhook-Signature: {{workflow.webhook_signature}}`}
              </pre>
            </li>
            <li>
              <strong>Save & Activate</strong>
              <p className="ml-6 mt-2">
                Save the workflow and set it to active.
              </p>
            </li>
          </ol>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🤖 Intelligent Responses
              </h3>
              <p className="text-gray-700">
                Powered by OpenAI GPT-4o-mini for natural, contextual
                conversations with leads.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📅 Automatic Booking
              </h3>
              <p className="text-gray-700">
                Books appointments directly into your GHL calendar when leads
                are ready.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🔄 Follow-up Tasks
              </h3>
              <p className="text-gray-700">
                Automatically creates follow-up tasks if leads don't respond
                within 24 hours.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                💰 Token Billing
              </h3>
              <p className="text-gray-700">
                Track AI token usage with configurable markup for client
                billing.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📊 Analytics
              </h3>
              <p className="text-gray-700">
                Monitor conversations, conversions, and booking rates per agent.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🔒 Secure
              </h3>
              <p className="text-gray-700">
                Webhook signature verification using HMAC SHA256 encryption.
              </p>
            </div>
          </div>
        </section>

        {/* Multi-Agent Architecture */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Multi-Agent Architecture
          </h2>
          <p className="text-gray-700 mb-4">
            Each agent is completely isolated:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>
              <strong>Unique webhook URL</strong> - Each agent has its own
              endpoint
            </li>
            <li>
              <strong>Separate GHL credentials</strong> - Connect different GHL
              accounts/calendars
            </li>
            <li>
              <strong>Custom instructions</strong> - Personalize behavior per
              gym/client
            </li>
            <li>
              <strong>Isolated conversations</strong> - No data sharing between
              agents
            </li>
            <li>
              <strong>Independent billing</strong> - Track token usage per agent
            </li>
          </ul>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
            <p className="text-green-700">
              <strong>Example:</strong> You can run agents for "R&B Fitness
              Bedford", "Atlas Fitness London", and "Client Gym Manchester" all
              in one account with completely separate settings.
            </p>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Agent not responding to webhooks?
              </h3>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Verify webhook URL is correct in GHL workflow</li>
                <li>Check that workflow is set to "Active"</li>
                <li>Ensure JSON body format matches the template above</li>
                <li>
                  Test webhook with GHL's "Test" button to see error messages
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Booking appointments not working?
              </h3>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Verify GHL API Key has calendar permissions</li>
                <li>Check that Calendar ID is correct</li>
                <li>Ensure calendar has available slots</li>
                <li>
                  Enable booking in agent configuration (booking_config.enabled)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Webhook signature validation failing?
              </h3>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>
                  Ensure webhook secret matches in both agent config and GHL
                  workflow
                </li>
                <li>
                  Add X-Webhook-Signature header in GHL webhook configuration
                </li>
                <li>Leave webhook secret blank if not using signature validation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            API Reference
          </h2>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                POST /api/webhooks/ghl/[agentId]
              </h3>
              <p className="text-gray-700 mb-2">
                Receive webhook from GoHighLevel workflow
              </p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "contact": {
    "id": "ghl_contact_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "message": {
    "body": "I'm interested in joining",
    "type": "inbound"
  }
}`}
              </pre>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                GET /api/webhooks/ghl/[agentId]
              </h3>
              <p className="text-gray-700 mb-2">Health check and webhook URL</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "agent": {
    "id": "uuid",
    "name": "R&B Fitness Lead Bot",
    "status": "active"
  },
  "webhookUrl": "https://yourdomain.com/api/webhooks/ghl/uuid"
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Need Help?
          </h2>
          <p className="text-gray-700 mb-4">
            For additional support or questions about AI chat agents:
          </p>
          <ul className="list-disc list-inside text-gray-700 ml-4">
            <li>
              Check the{" "}
              <a
                href="https://developers.gohighlevel.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GoHighLevel Developer Docs
              </a>
            </li>
            <li>Review your agent's conversation history for insights</li>
            <li>Monitor token usage and billing in the Analytics dashboard</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
