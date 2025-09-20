"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Search,
  Plus,
  Sparkles,
  FileText,
  Eye,
  Edit,
  Variable,
  ChevronDown,
  Send,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  CheckCircle,
  XCircle,
  Loader2,
  Image,
  Paperclip,
  BarChart3,
  Clock,
  Users,
  TestTube,
  Settings,
  Zap,
  Target,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category?: string;
  isActive?: boolean;
  abTestVariants?: EmailTemplate[];
}

interface EmailActionConfigProps {
  config: any;
  onChange: (config: any) => void;
  organizationId: string;
}

interface ABTestConfig {
  enabled: boolean;
  variants: {
    id: string;
    name: string;
    subject: string;
    body: string;
    weight: number; // percentage split
  }[];
  testMetric: "open_rate" | "click_rate" | "conversion_rate";
  testDuration: number; // days
  winnerSelection: "automatic" | "manual";
}

interface DeliveryOptimization {
  sendTime: "immediate" | "optimal" | "scheduled";
  scheduledTime?: string;
  timeZoneOptimization: boolean;
  frequencyCapping: {
    enabled: boolean;
    maxEmailsPerDay: number;
    maxEmailsPerWeek: number;
  };
  suppressionLists: string[];
}

interface TrackingConfig {
  openTracking: boolean;
  clickTracking: boolean;
  unsubscribeTracking: boolean;
  conversionTracking: boolean;
  utmParameters: {
    campaign: string;
    source: string;
    medium: string;
    term?: string;
    content?: string;
  };
  customTrackingPixel?: string;
}

export default function EnhancedEmailActionConfig({
  config,
  onChange,
  organizationId,
}: EmailActionConfigProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [emailMode, setEmailMode] = useState<"template" | "custom">(
    config.mode || "template",
  );
  const [customEmail, setCustomEmail] = useState(
    config.customEmail || { subject: "", body: "" },
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showRichEditor, setShowRichEditor] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<
    "basic" | "abtest" | "delivery" | "tracking" | "attachments"
  >("basic");

  // A/B Testing Configuration
  const [abTestConfig, setABTestConfig] = useState<ABTestConfig>(
    config.abTestConfig || {
      enabled: false,
      variants: [],
      testMetric: "open_rate",
      testDuration: 7,
      winnerSelection: "automatic",
    },
  );

  // Delivery Optimization Configuration
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryOptimization>(
    config.deliveryConfig || {
      sendTime: "immediate",
      timeZoneOptimization: false,
      frequencyCapping: {
        enabled: false,
        maxEmailsPerDay: 3,
        maxEmailsPerWeek: 10,
      },
      suppressionLists: [],
    },
  );

  // Tracking Configuration
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig>(
    config.trackingConfig || {
      openTracking: true,
      clickTracking: true,
      unsubscribeTracking: true,
      conversionTracking: false,
      utmParameters: {
        campaign: "",
        source: "automation",
        medium: "email",
      },
    },
  );

  const availableVariables = [
    { key: "{{first_name}}", label: "First Name", category: "Contact" },
    { key: "{{last_name}}", label: "Last Name", category: "Contact" },
    { key: "{{full_name}}", label: "Full Name", category: "Contact" },
    { key: "{{email}}", label: "Email", category: "Contact" },
    { key: "{{phone}}", label: "Phone", category: "Contact" },
    {
      key: "{{organization_name}}",
      label: "Organization Name",
      category: "Organization",
    },
    { key: "{{current_date}}", label: "Current Date", category: "System" },
    { key: "{{current_time}}", label: "Current Time", category: "System" },
    { key: "{{lead_source}}", label: "Lead Source", category: "Lead Data" },
    { key: "{{interest}}", label: "Interest/Goal", category: "Lead Data" },
    { key: "{{tags}}", label: "Lead Tags", category: "Lead Data" },
    {
      key: "{{membership_type}}",
      label: "Membership Type",
      category: "Membership",
    },
    {
      key: "{{next_appointment}}",
      label: "Next Appointment",
      category: "Schedule",
    },
    {
      key: "{{last_interaction}}",
      label: "Last Interaction",
      category: "Activity",
    },
  ];

  useEffect(() => {
    loadEmailTemplates();
  }, [organizationId]);

  useEffect(() => {
    // Update parent config when any sub-config changes
    onChange({
      ...config,
      mode: emailMode,
      customEmail,
      templateId: selectedTemplate?.id,
      abTestConfig,
      deliveryConfig,
      trackingConfig,
      attachments: attachments.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    });
  }, [
    emailMode,
    customEmail,
    selectedTemplate,
    abTestConfig,
    deliveryConfig,
    trackingConfig,
    attachments,
  ]);

  const loadEmailTemplates = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      // Use mock data as fallback
      setTemplates([
        {
          id: "1",
          name: "Welcome Email",
          subject: "Welcome to {{organization_name}}, {{first_name}}!",
          body: "Hi {{first_name}},\n\nThank you for your interest...",
          variables: ["first_name", "organization_name"],
        },
        {
          id: "2",
          name: "Follow-up Email",
          subject: "Following up on your fitness goals, {{first_name}}",
          body: "Hi {{first_name}},\n\nI wanted to follow up...",
          variables: ["first_name"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEmailMode("template");
  };

  const handleCustomEmailChange = (
    field: "subject" | "body",
    value: string,
  ) => {
    const updated = { ...customEmail, [field]: value };
    setCustomEmail(updated);
    setEmailMode("custom");
  };

  const insertVariable = (variable: string, field: "subject" | "body") => {
    const textarea =
      typeof document !== "undefined"
        ? (document.getElementById(`email-${field}`) as HTMLTextAreaElement)
        : null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = customEmail[field];
      const newText = text.substring(0, start) + variable + text.substring(end);
      handleCustomEmailChange(field, newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variable.length,
          start + variable.length,
        );
      }, 0);
    }
  };

  const generateWithAI = async () => {
    setAiGenerating(true);
    try {
      // Simulate AI generation - in real implementation, call your AI service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const aiGenerated = {
        subject: `{{first_name}}, ready to transform your fitness journey?`,
        body: `Hi {{first_name}},

I hope this email finds you well! I wanted to personally reach out because I noticed you're interested in {{interest}} at {{organization_name}}.

Here's what makes our approach different:
✓ Personalized training programs tailored to your goals
✓ Expert coaches with proven track records
✓ A supportive community that celebrates your wins
✓ Flexible scheduling that fits your lifestyle

I'd love to offer you a complimentary consultation where we can:
- Discuss your specific fitness goals
- Tour our state-of-the-art facility
- Create a customized plan just for you

Are you available this week? Simply reply with your preferred day and time, and I'll make it happen.

Looking forward to helping you achieve your fitness goals!

Best regards,
The {{organization_name}} Team

P.S. As a new member, you'll receive 20% off your first month – but this exclusive offer expires in 3 days!`,
      };

      setCustomEmail(aiGenerated);
      setEmailMode("custom");
    } catch (error) {
      console.error("AI generation error:", error);
    } finally {
      setAiGenerating(false);
    }
  };

  const addABTestVariant = () => {
    const newVariant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${abTestConfig.variants.length + 1}`,
      subject: customEmail.subject || selectedTemplate?.subject || "",
      body: customEmail.body || selectedTemplate?.body || "",
      weight: Math.floor(50 / (abTestConfig.variants.length + 1)),
    };

    setABTestConfig((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const updateABTestVariant = (
    variantId: string,
    field: string,
    value: string | number,
  ) => {
    setABTestConfig((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === variantId ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const removeABTestVariant = (variantId: string) => {
    setABTestConfig((prev) => ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.id !== variantId),
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const sendTestEmail = async () => {
    if (!testEmail || !organizationId) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const email = emailMode === "template" ? selectedTemplate : customEmail;
      if (!email) {
        setTestResult({
          success: false,
          message: "No email content configured",
        });
        return;
      }

      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          testEmail,
          subject: email.subject,
          body: email.body,
          fromName: config.fromName || "Atlas Fitness Team",
          trackingConfig,
          attachments: attachments.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        }),
      });

      const data = await response.json();

      setTestResult({
        success: response.ok,
        message: response.ok
          ? "Test email sent successfully! Check your inbox."
          : data.error || "Failed to send test email",
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message:
          error.message || "An error occurred while sending the test email",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const renderBasicConfig = () => (
    <div className="space-y-6">
      {/* Email Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEmailMode("template")}
            className={`px-4 py-2 rounded-lg border ${
              emailMode === "template"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Use Template
          </button>
          <button
            type="button"
            onClick={() => setEmailMode("custom")}
            className={`px-4 py-2 rounded-lg border ${
              emailMode === "custom"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Edit className="w-4 h-4 inline mr-2" />
            Custom Email
          </button>
        </div>
      </div>

      {/* Template Selection */}
      {emailMode === "template" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedTemplate?.id === template.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-600 truncate">
                  {template.subject}
                </div>
              </button>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No templates found. Create a custom email instead.
            </div>
          )}
        </div>
      )}

      {/* Custom Email Creation */}
      {emailMode === "custom" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Subject Line
              </label>
              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Variable className="w-4 h-4 mr-1" />
                Variables
              </button>
            </div>
            <input
              id="email-subject"
              type="text"
              value={customEmail.subject}
              onChange={(e) =>
                handleCustomEmailChange("subject", e.target.value)
              }
              placeholder="Enter subject line..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Body
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRichEditor(!showRichEditor)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {showRichEditor ? "Hide" : "Show"} Formatting
                </button>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={aiGenerating}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {aiGenerating ? "Generating..." : "AI Generate"}
                </button>
              </div>
            </div>

            {/* Rich Text Editor Toolbar */}
            {showRichEditor && (
              <div className="mb-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1"></div>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Insert Link"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200"
                    title="Insert Image"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <textarea
              id="email-body"
              value={customEmail.body}
              onChange={(e) => handleCustomEmailChange("body", e.target.value)}
              placeholder="Write your email content..."
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>

          {/* Variable Helper */}
          {showVariables && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Click to insert variables:
              </h4>
              <div className="space-y-3">
                {Object.entries(
                  availableVariables.reduce(
                    (acc, variable) => {
                      if (!acc[variable.category]) acc[variable.category] = [];
                      acc[variable.category].push(variable);
                      return acc;
                    },
                    {} as Record<string, typeof availableVariables>,
                  ),
                ).map(([category, vars]) => (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                      {category}
                    </h5>
                    <div className="grid grid-cols-2 gap-1">
                      {vars.map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          onClick={() => insertVariable(variable.key, "body")}
                          className="text-left px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <code className="text-blue-600 text-xs">
                            {variable.key}
                          </code>
                          <span className="text-gray-600 ml-1 text-xs">
                            - {variable.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Basic Settings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Basic Settings</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Send from name
          </label>
          <input
            type="text"
            value={config.fromName || ""}
            onChange={(e) => onChange({ ...config, fromName: e.target.value })}
            placeholder="e.g., Atlas Fitness Team"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reply-to email (optional)
          </label>
          <input
            type="email"
            value={config.replyToEmail || ""}
            onChange={(e) =>
              onChange({ ...config, replyToEmail: e.target.value })
            }
            placeholder="e.g., support@atlasfitness.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderABTestConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">
            A/B Test Configuration
          </h3>
          <p className="text-xs text-gray-500">
            Test different versions to optimize performance
          </p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={abTestConfig.enabled}
            onChange={(e) =>
              setABTestConfig((prev) => ({
                ...prev,
                enabled: e.target.checked,
              }))
            }
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="ml-2 text-sm text-gray-700">Enable A/B Testing</span>
        </label>
      </div>

      {abTestConfig.enabled && (
        <>
          {/* Test Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Metric
              </label>
              <select
                value={abTestConfig.testMetric}
                onChange={(e) =>
                  setABTestConfig((prev) => ({
                    ...prev,
                    testMetric: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="open_rate">Open Rate</option>
                <option value="click_rate">Click Rate</option>
                <option value="conversion_rate">Conversion Rate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={abTestConfig.testDuration}
                onChange={(e) =>
                  setABTestConfig((prev) => ({
                    ...prev,
                    testDuration: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Winner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Winner Selection
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setABTestConfig((prev) => ({
                    ...prev,
                    winnerSelection: "automatic",
                  }))
                }
                className={`px-4 py-2 rounded-lg border text-sm ${
                  abTestConfig.winnerSelection === "automatic"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Automatic
              </button>
              <button
                type="button"
                onClick={() =>
                  setABTestConfig((prev) => ({
                    ...prev,
                    winnerSelection: "manual",
                  }))
                }
                className={`px-4 py-2 rounded-lg border text-sm ${
                  abTestConfig.winnerSelection === "manual"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Manual
              </button>
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Test Variants
              </h4>
              <button
                type="button"
                onClick={addABTestVariant}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {abTestConfig.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) =>
                        updateABTestVariant(variant.id, "name", e.target.value)
                      }
                      className="font-medium text-sm bg-transparent border-none focus:outline-none"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Weight:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={variant.weight}
                        onChange={(e) =>
                          updateABTestVariant(
                            variant.id,
                            "weight",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-500">%</span>
                      <button
                        type="button"
                        onClick={() => removeABTestVariant(variant.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={variant.subject}
                      onChange={(e) =>
                        updateABTestVariant(
                          variant.id,
                          "subject",
                          e.target.value,
                        )
                      }
                      placeholder="Email subject"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    />
                    <textarea
                      value={variant.body}
                      onChange={(e) =>
                        updateABTestVariant(variant.id, "body", e.target.value)
                      }
                      placeholder="Email body"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>

            {abTestConfig.variants.length === 0 && (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                <TestTube className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No variants created yet.</p>
                <p className="text-sm">Add variants to start A/B testing.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderDeliveryConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">
        Delivery Optimization
      </h3>

      {/* Send Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Send Time
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "immediate", label: "Immediate", icon: Zap },
            { value: "optimal", label: "Optimal", icon: Target },
            { value: "scheduled", label: "Scheduled", icon: Clock },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setDeliveryConfig((prev) => ({
                  ...prev,
                  sendTime: value as any,
                }))
              }
              className={`px-4 py-2 rounded-lg border text-sm ${
                deliveryConfig.sendTime === value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled Time */}
      {deliveryConfig.sendTime === "scheduled" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Time
          </label>
          <input
            type="datetime-local"
            value={deliveryConfig.scheduledTime || ""}
            onChange={(e) =>
              setDeliveryConfig((prev) => ({
                ...prev,
                scheduledTime: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Time Zone Optimization */}
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={deliveryConfig.timeZoneOptimization}
          onChange={(e) =>
            setDeliveryConfig((prev) => ({
              ...prev,
              timeZoneOptimization: e.target.checked,
            }))
          }
          className="rounded border-gray-300 text-blue-600"
        />
        <span className="text-sm text-gray-700">
          Optimize send time by recipient's time zone
        </span>
      </label>

      {/* Frequency Capping */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            Frequency Capping
          </h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={deliveryConfig.frequencyCapping.enabled}
              onChange={(e) =>
                setDeliveryConfig((prev) => ({
                  ...prev,
                  frequencyCapping: {
                    ...prev.frequencyCapping,
                    enabled: e.target.checked,
                  },
                }))
              }
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {deliveryConfig.frequencyCapping.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max emails per day
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={deliveryConfig.frequencyCapping.maxEmailsPerDay}
                onChange={(e) =>
                  setDeliveryConfig((prev) => ({
                    ...prev,
                    frequencyCapping: {
                      ...prev.frequencyCapping,
                      maxEmailsPerDay: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max emails per week
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={deliveryConfig.frequencyCapping.maxEmailsPerWeek}
                onChange={(e) =>
                  setDeliveryConfig((prev) => ({
                    ...prev,
                    frequencyCapping: {
                      ...prev.frequencyCapping,
                      maxEmailsPerWeek: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Suppression Lists */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Suppression Lists
        </label>
        <select
          multiple
          value={deliveryConfig.suppressionLists}
          onChange={(e) =>
            setDeliveryConfig((prev) => ({
              ...prev,
              suppressionLists: Array.from(
                e.target.selectedOptions,
                (option) => option.value,
              ),
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          size={3}
        >
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Hard Bounced</option>
          <option value="complained">Spam Complaints</option>
          <option value="inactive">Inactive (90+ days)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Hold Ctrl/Cmd to select multiple lists
        </p>
      </div>
    </div>
  );

  const renderTrackingConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">Email Tracking</h3>

      {/* Basic Tracking */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-600">Basic Tracking</h4>

        {[
          {
            key: "openTracking",
            label: "Track email opens",
            description: "Know when recipients open your email",
          },
          {
            key: "clickTracking",
            label: "Track link clicks",
            description: "Track which links recipients click",
          },
          {
            key: "unsubscribeTracking",
            label: "Track unsubscribes",
            description: "Monitor unsubscribe rates",
          },
          {
            key: "conversionTracking",
            label: "Track conversions",
            description: "Track goal completions from email",
          },
        ].map(({ key, label, description }) => (
          <label key={key} className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={(trackingConfig as any)[key]}
              onChange={(e) =>
                setTrackingConfig((prev) => ({
                  ...prev,
                  [key]: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 mt-0.5"
            />
            <div>
              <span className="text-sm text-gray-700">{label}</span>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* UTM Parameters */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">
          UTM Parameters
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign
            </label>
            <input
              type="text"
              value={trackingConfig.utmParameters.campaign}
              onChange={(e) =>
                setTrackingConfig((prev) => ({
                  ...prev,
                  utmParameters: {
                    ...prev.utmParameters,
                    campaign: e.target.value,
                  },
                }))
              }
              placeholder="e.g., welcome-series"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <input
              type="text"
              value={trackingConfig.utmParameters.source}
              onChange={(e) =>
                setTrackingConfig((prev) => ({
                  ...prev,
                  utmParameters: {
                    ...prev.utmParameters,
                    source: e.target.value,
                  },
                }))
              }
              placeholder="e.g., automation"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medium
            </label>
            <input
              type="text"
              value={trackingConfig.utmParameters.medium}
              onChange={(e) =>
                setTrackingConfig((prev) => ({
                  ...prev,
                  utmParameters: {
                    ...prev.utmParameters,
                    medium: e.target.value,
                  },
                }))
              }
              placeholder="e.g., email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (optional)
            </label>
            <input
              type="text"
              value={trackingConfig.utmParameters.content || ""}
              onChange={(e) =>
                setTrackingConfig((prev) => ({
                  ...prev,
                  utmParameters: {
                    ...prev.utmParameters,
                    content: e.target.value,
                  },
                }))
              }
              placeholder="e.g., button-cta"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Custom Tracking Pixel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Custom Tracking Pixel (optional)
        </label>
        <input
          type="url"
          value={trackingConfig.customTrackingPixel || ""}
          onChange={(e) =>
            setTrackingConfig((prev) => ({
              ...prev,
              customTrackingPixel: e.target.value,
            }))
          }
          placeholder="https://analytics.example.com/pixel.gif"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Add additional tracking pixels for third-party analytics
        </p>
      </div>
    </div>
  );

  const renderAttachmentsConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">Email Attachments</h3>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Attachments
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            onChange={handleFileUpload}
            multiple
            className="hidden"
            id="attachment-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          />
          <label
            htmlFor="attachment-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Paperclip className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">Click to upload files</span>
            <span className="text-xs text-gray-500 mt-1">
              PDF, DOC, Images (max 10MB each)
            </span>
          </label>
        </div>
      </div>

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            Attached Files
          </h4>
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Guidelines */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Attachment Guidelines
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Maximum file size: 10MB per attachment</li>
          <li>• Maximum total size: 25MB per email</li>
          <li>• Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF</li>
          <li>• Attachments may affect deliverability</li>
          <li>• Consider using links to cloud storage for large files</li>
        </ul>
      </div>
    </div>
  );

  const renderPreview = () => {
    const email = emailMode === "template" ? selectedTemplate : customEmail;
    if (!email) return null;

    // Replace variables with sample data
    const sampleData = {
      first_name: "John",
      last_name: "Doe",
      full_name: "John Doe",
      email: "john.doe@example.com",
      organization_name: "Atlas Fitness",
      interest: "weight loss",
      current_date: new Date().toLocaleDateString(),
      current_time: new Date().toLocaleTimeString(),
    };

    let previewSubject = email.subject;
    let previewBody = email.body;

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    });

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">
          Preview with Sample Data
        </h4>
        <div className="bg-white p-4 rounded border">
          <div className="text-sm text-gray-600 mb-1">Subject:</div>
          <div className="font-medium mb-3">{previewSubject}</div>
          <div className="text-sm text-gray-600 mb-1">Body:</div>
          <div className="whitespace-pre-wrap text-sm">{previewBody}</div>

          {attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Attachments:</div>
              <div className="space-y-1">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center text-xs text-gray-500"
                  >
                    <Paperclip className="w-3 h-3 mr-1" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          Loading email configuration...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: "basic", label: "Basic", icon: Mail },
            { id: "abtest", label: "A/B Test", icon: BarChart3 },
            { id: "delivery", label: "Delivery", icon: Clock },
            { id: "tracking", label: "Tracking", icon: Target },
            { id: "attachments", label: "Attachments", icon: Paperclip },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "basic" && renderBasicConfig()}
        {activeTab === "abtest" && renderABTestConfig()}
        {activeTab === "delivery" && renderDeliveryConfig()}
        {activeTab === "tracking" && renderTrackingConfig()}
        {activeTab === "attachments" && renderAttachmentsConfig()}
      </div>

      {/* Test Email Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Test Email</h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={
                !testEmail ||
                sendingTest ||
                (!selectedTemplate && !customEmail.body)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-md ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <div className="flex items-start">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                )}
                <p
                  className={`text-sm ${testResult.success ? "text-green-700" : "text-red-700"}`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>

        {showPreview && renderPreview()}
      </div>
    </div>
  );
}
