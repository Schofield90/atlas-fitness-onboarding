"use client";

import { useState, useEffect } from "react";
import {
  SaasPlan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanFeatures,
  PlanLimits,
  PlanConfig,
  PlanTier,
  FEATURE_CATEGORIES,
} from "@/app/lib/types/plans";
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  DollarSign,
  Settings,
  Zap,
  Users,
  Calendar,
  Shield,
  Smartphone,
  Mail,
  Bot,
  Palette,
  BarChart,
  Plus,
  Minus,
} from "lucide-react";

interface PlanEditorProps {
  plan?: SaasPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const defaultFeatures: PlanFeatures = {
  staff_accounts: 5,
  monthly_bookings: 500,
  max_classes_per_month: 100,
  class_waitlists: true,
  recurring_bookings: true,
  sms_credits: 100,
  email_credits: 1000,
  whatsapp_credits: 50,
  voice_calls: false,
  custom_forms: 5,
  automation_workflows: 3,
  advanced_triggers: false,
  conditional_logic: false,
  api_access: false,
  facebook_leads: true,
  google_calendar: true,
  zapier_integration: false,
  webhook_endpoints: 1,
  white_label: false,
  custom_domain: false,
  custom_branding: false,
  remove_atlas_branding: false,
  multi_location: false,
  staff_permissions: false,
  reporting_analytics: true,
  data_export: false,
  custom_fields: false,
  ai_chat_responses: false,
  ai_lead_scoring: false,
  ai_insights: false,
  ai_recommendations: false,
};

const defaultLimits: PlanLimits = {
  max_customers: 500,
  max_leads_per_month: 1000,
  storage_gb: 5,
  file_uploads_mb: 10,
  sms_per_month: 100,
  emails_per_month: 1000,
  form_submissions_per_month: 500,
  workflow_executions_per_month: 1000,
  api_calls_per_month: 1000,
  webhook_calls_per_month: 500,
  report_exports_per_month: 10,
  data_retention_months: 12,
};

const defaultConfig: PlanConfig = {
  trial_days: 14,
  setup_fee: 0,
  requires_setup_call: false,
  priority_support: false,
  dedicated_success_manager: false,
};

export default function PlanEditor({
  plan,
  isOpen,
  onClose,
  onSave,
}: PlanEditorProps) {
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: "",
    slug: "",
    description: "",
    tier: "starter",
    price_monthly: 0,
    price_yearly: 0,
    price_setup: 0,
    features: defaultFeatures,
    limits: defaultLimits,
    config: defaultConfig,
    is_popular: false,
    sort_order: 0,
  });

  const [activeTab, setActiveTab] = useState<
    "basic" | "features" | "limits" | "config"
  >("basic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        slug: plan.slug,
        description: plan.description || "",
        tier: plan.tier,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        price_setup: plan.price_setup || 0,
        features: { ...defaultFeatures, ...plan.features },
        limits: { ...defaultLimits, ...plan.limits },
        config: { ...defaultConfig, ...plan.config },
        is_popular: plan.is_popular,
        sort_order: plan.sort_order,
      });
    } else {
      // Reset for new plan
      setFormData({
        name: "",
        slug: "",
        description: "",
        tier: "starter",
        price_monthly: 0,
        price_yearly: 0,
        price_setup: 0,
        features: defaultFeatures,
        limits: defaultLimits,
        config: defaultConfig,
        is_popular: false,
        sort_order: 0,
      });
    }
    setError(null);
    setSuccess(null);
    setActiveTab("basic");
  }, [plan, isOpen]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleFeatureChange = (key: keyof PlanFeatures, value: any) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: value,
      },
    }));
  };

  const handleLimitChange = (key: keyof PlanLimits, value: number) => {
    setFormData((prev) => ({
      ...prev,
      limits: {
        ...prev.limits,
        [key]: value === -1 ? -1 : Math.max(0, value),
      },
    }));
  };

  const handleConfigChange = (key: keyof PlanConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Plan name is required";
    if (!formData.slug.trim()) return "Plan slug is required";
    if (formData.price_monthly < 0) return "Monthly price must be positive";
    if (formData.price_yearly < 0) return "Yearly price must be positive";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const url = plan
        ? `/api/saas-admin/plans/${plan.id}`
        : "/api/saas-admin/plans";
      const method = plan ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${plan ? "update" : "create"} plan`,
        );
      }

      setSuccess(`Plan ${plan ? "updated" : "created"} successfully`);
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFeatureInput = (
    key: keyof PlanFeatures,
    label: string,
    type: "boolean" | "number" = "boolean",
  ) => {
    const value = formData.features[key];

    if (type === "boolean") {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <label className="text-sm font-medium text-gray-300">{label}</label>
          <button
            type="button"
            onClick={() => handleFeatureChange(key, !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              value ? "bg-purple-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                value ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-center justify-between py-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleFeatureChange(key, Math.max(0, (value as number) - 1))
            }
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            value={value as number}
            onChange={(e) =>
              handleFeatureChange(key, parseInt(e.target.value) || 0)
            }
            className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => handleFeatureChange(key, (value as number) + 1)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderLimitInput = (
    key: keyof PlanLimits,
    label: string,
    unlimited: boolean = true,
  ) => {
    const value = formData.limits[key];
    const isUnlimited = value === -1;

    return (
      <div key={key} className="space-y-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              value={isUnlimited ? "" : value}
              onChange={(e) =>
                handleLimitChange(key, parseInt(e.target.value) || 0)
              }
              disabled={isUnlimited}
              placeholder="0"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            {unlimited && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) =>
                    handleLimitChange(key, e.target.checked ? -1 : 0)
                  }
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-gray-400">Unlimited</span>
              </label>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-white">
              {plan ? `Edit ${plan.name}` : "Create New Plan"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mx-6 mt-4 bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 bg-green-900/50 border border-green-700 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-700 px-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "basic", label: "Basic Info", icon: Settings },
                { id: "features", label: "Features", icon: Zap },
                { id: "limits", label: "Limits", icon: Shield },
                { id: "config", label: "Configuration", icon: BarChart },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <form id="plan-form" onSubmit={handleSubmit}>
              {activeTab === "basic" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Professional Plan"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Slug *
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            slug: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="professional-plan"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Perfect for growing gyms and fitness studios..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tier
                      </label>
                      <select
                        value={formData.tier}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            tier: e.target.value as PlanTier,
                          }))
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            sort_order: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monthly Price (pence) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.price_monthly}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price_monthly: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="2999"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Yearly Price (pence) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.price_yearly}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price_yearly: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="29999"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Setup Fee (pence)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.price_setup}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              price_setup: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_popular}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_popular: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        Mark as Popular
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "features" && (
                <div className="space-y-8">
                  {Object.entries(FEATURE_CATEGORIES).map(
                    ([category, categoryName]) => (
                      <div key={category} className="space-y-4">
                        <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                          {categoryName}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Core Features */}
                          {category === "CORE" && (
                            <>
                              {renderFeatureInput(
                                "staff_accounts",
                                "Staff Accounts",
                                "number",
                              )}
                              {renderFeatureInput(
                                "monthly_bookings",
                                "Monthly Bookings",
                                "number",
                              )}
                              {renderFeatureInput(
                                "max_classes_per_month",
                                "Classes Per Month",
                                "number",
                              )}
                              {renderFeatureInput(
                                "class_waitlists",
                                "Class Waitlists",
                              )}
                              {renderFeatureInput(
                                "recurring_bookings",
                                "Recurring Bookings",
                              )}
                            </>
                          )}

                          {/* Communication Features */}
                          {category === "COMMUNICATION" && (
                            <>
                              {renderFeatureInput(
                                "sms_credits",
                                "SMS Credits",
                                "number",
                              )}
                              {renderFeatureInput(
                                "email_credits",
                                "Email Credits",
                                "number",
                              )}
                              {renderFeatureInput(
                                "whatsapp_credits",
                                "WhatsApp Credits",
                                "number",
                              )}
                              {renderFeatureInput("voice_calls", "Voice Calls")}
                            </>
                          )}

                          {/* Automation Features */}
                          {category === "AUTOMATION" && (
                            <>
                              {renderFeatureInput(
                                "custom_forms",
                                "Custom Forms",
                                "number",
                              )}
                              {renderFeatureInput(
                                "automation_workflows",
                                "Workflows",
                                "number",
                              )}
                              {renderFeatureInput(
                                "advanced_triggers",
                                "Advanced Triggers",
                              )}
                              {renderFeatureInput(
                                "conditional_logic",
                                "Conditional Logic",
                              )}
                            </>
                          )}

                          {/* Integration Features */}
                          {category === "INTEGRATIONS" && (
                            <>
                              {renderFeatureInput("api_access", "API Access")}
                              {renderFeatureInput(
                                "facebook_leads",
                                "Facebook Leads",
                              )}
                              {renderFeatureInput(
                                "google_calendar",
                                "Google Calendar",
                              )}
                              {renderFeatureInput(
                                "zapier_integration",
                                "Zapier",
                              )}
                              {renderFeatureInput(
                                "webhook_endpoints",
                                "Webhook Endpoints",
                                "number",
                              )}
                            </>
                          )}

                          {/* Branding Features */}
                          {category === "BRANDING" && (
                            <>
                              {renderFeatureInput("white_label", "White Label")}
                              {renderFeatureInput(
                                "custom_domain",
                                "Custom Domain",
                              )}
                              {renderFeatureInput(
                                "custom_branding",
                                "Custom Branding",
                              )}
                              {renderFeatureInput(
                                "remove_atlas_branding",
                                "Remove Atlas Branding",
                              )}
                            </>
                          )}

                          {/* Advanced Features */}
                          {category === "ADVANCED" && (
                            <>
                              {renderFeatureInput(
                                "multi_location",
                                "Multi-Location",
                              )}
                              {renderFeatureInput(
                                "staff_permissions",
                                "Staff Permissions",
                              )}
                              {renderFeatureInput(
                                "reporting_analytics",
                                "Reporting & Analytics",
                              )}
                              {renderFeatureInput("data_export", "Data Export")}
                              {renderFeatureInput(
                                "custom_fields",
                                "Custom Fields",
                              )}
                            </>
                          )}

                          {/* AI Features */}
                          {category === "AI" && (
                            <>
                              {renderFeatureInput(
                                "ai_chat_responses",
                                "AI Chat Responses",
                              )}
                              {renderFeatureInput(
                                "ai_lead_scoring",
                                "AI Lead Scoring",
                              )}
                              {renderFeatureInput("ai_insights", "AI Insights")}
                              {renderFeatureInput(
                                "ai_recommendations",
                                "AI Recommendations",
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {activeTab === "limits" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderLimitInput("max_customers", "Max Customers")}
                    {renderLimitInput(
                      "max_leads_per_month",
                      "Max Leads Per Month",
                    )}
                    {renderLimitInput("storage_gb", "Storage (GB)")}
                    {renderLimitInput(
                      "file_uploads_mb",
                      "File Upload Size (MB)",
                      false,
                    )}
                    {renderLimitInput("sms_per_month", "SMS Per Month")}
                    {renderLimitInput("emails_per_month", "Emails Per Month")}
                    {renderLimitInput(
                      "form_submissions_per_month",
                      "Form Submissions Per Month",
                    )}
                    {renderLimitInput(
                      "workflow_executions_per_month",
                      "Workflow Executions Per Month",
                    )}
                    {renderLimitInput(
                      "api_calls_per_month",
                      "API Calls Per Month",
                    )}
                    {renderLimitInput(
                      "webhook_calls_per_month",
                      "Webhook Calls Per Month",
                    )}
                    {renderLimitInput(
                      "report_exports_per_month",
                      "Report Exports Per Month",
                    )}
                    {renderLimitInput(
                      "data_retention_months",
                      "Data Retention (Months)",
                      false,
                    )}
                  </div>
                </div>
              )}

              {activeTab === "config" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trial Days
                      </label>
                      <input
                        type="number"
                        value={formData.config.trial_days}
                        onChange={(e) =>
                          handleConfigChange(
                            "trial_days",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                        max="365"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Setup Fee (pence)
                      </label>
                      <input
                        type="number"
                        value={formData.config.setup_fee || 0}
                        onChange={(e) =>
                          handleConfigChange(
                            "setup_fee",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.config.requires_setup_call}
                        onChange={(e) =>
                          handleConfigChange(
                            "requires_setup_call",
                            e.target.checked,
                          )
                        }
                        className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        Requires Setup Call
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.config.priority_support}
                        onChange={(e) =>
                          handleConfigChange(
                            "priority_support",
                            e.target.checked,
                          )
                        }
                        className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        Priority Support
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.config.dedicated_success_manager}
                        onChange={(e) =>
                          handleConfigChange(
                            "dedicated_success_manager",
                            e.target.checked,
                          )
                        }
                        className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        Dedicated Success Manager
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="plan-form"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {plan ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {plan ? "Update Plan" : "Create Plan"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
